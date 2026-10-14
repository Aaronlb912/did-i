import { useEffect, useRef, useState } from 'react'
import { Linking, StyleSheet, View } from 'react-native'
import { requireOptionalNativeModule } from 'expo'
import { t } from '../../src/lib/i18n.js'
import { readQrLink } from '../../src/lib/qr-links.js'
import { currentBook, readShelf } from '../../src/lib/board-shelf.js'
import { boardDate, formatBoardDate } from '../../src/lib/recurrence.js'
import { BoardShell } from '../components/BoardShell.jsx'
import { DidButton, KeyButton, Meta } from '../components/ui.jsx'
import { useHallColors } from '../hooks/useHallColors.js'
import { goHash, swapHash } from '../navigation/hash.js'

// The scanner came with 1.3.0. Older builds hide the Scan button.
export function canScan() {
  return Boolean(requireOptionalNativeModule('ExpoCamera'))
}

// Scan a friend or family QR code, then hand it to Connect, which looks it
// up and asks before anything is sent or joined.
export function ScanScreen() {
  const colors = useHallColors()
  const book = currentBook(readShelf())
  const [allowed, setAllowed] = useState(null)
  const [miss, setMiss] = useState('')
  const done = useRef(false)

  async function ask() {
    try {
      const { Camera } = require('expo-camera')
      const out = await Camera.requestCameraPermissionsAsync()
      setAllowed(Boolean(out?.granted))
    } catch {
      setAllowed(false)
    }
  }

  useEffect(() => {
    if (canScan()) ask()
    else setAllowed(false)
  }, [])

  function onScan({ data }) {
    if (done.current) return
    const found = readQrLink(data)
    if (!found) {
      setMiss(t('qr.notOurs'))
      return
    }
    done.current = true
    swapHash('/people/connect', { id: found.friend ? `friend:${found.friend}` : `family:${found.family}` })
  }

  let body
  if (!canScan()) {
    body = <Meta colors={colors}>{t('qr.needUpdate')}</Meta>
  } else if (allowed === false) {
    body = (
      <>
        <Meta colors={colors}>{t('qr.cameraOff')}</Meta>
        <DidButton colors={colors} label={t('qr.openSettings')} onPress={() => Linking.openSettings().catch(() => {})} />
      </>
    )
  } else if (allowed) {
    const { CameraView } = require('expo-camera')
    body = (
      <>
        <View style={[styles.frame, { borderColor: colors.line }]}>
          <CameraView
            style={StyleSheet.absoluteFill}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
            onBarcodeScanned={onScan}
          />
        </View>
        <Meta colors={colors}>{miss || t('qr.scanHint')}</Meta>
      </>
    )
  } else {
    body = null
  }

  return (
    <BoardShell book={book} title={t('qr.scanTitle')} date={formatBoardDate(boardDate(new Date(), book.dayFoldHour))} colors={colors}>
      {body}
      <KeyButton colors={colors} label={t('qr.typeInstead')} onPress={() => goHash('/people/connect')} />
    </BoardShell>
  )
}

const styles = StyleSheet.create({
  frame: { width: '100%', aspectRatio: 1, borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
})
