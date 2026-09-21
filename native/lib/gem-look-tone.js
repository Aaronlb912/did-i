import { isGemLook } from '../../src/lib/purse.js'

const TONES = {
  glow: {
    dark: {
      top: 'rgba(94, 232, 255, 0.14)',
      bottom: 'rgba(94, 232, 255, 0.08)',
      ring: 'rgba(94, 232, 255, 0.52)',
      halo: 'rgba(94, 232, 255, 0.22)',
      haloDeep: 'rgba(94, 232, 255, 0.1)',
      spill: 'rgba(94, 232, 255, 0.28)',
      accent: '#5ee8ff',
      accentSoft: '#2a9db5',
      chipGlow: 'rgba(94, 232, 255, 0.75)',
      chipBg: '#0c1218',
      panelTint: '#0f1822',
    },
    light: {
      top: 'rgba(8, 145, 178, 0.12)',
      bottom: 'rgba(8, 145, 178, 0.07)',
      ring: 'rgba(8, 145, 178, 0.38)',
      halo: 'rgba(8, 145, 178, 0.14)',
      haloDeep: 'rgba(8, 145, 178, 0.06)',
      spill: 'rgba(8, 145, 178, 0.16)',
      accent: '#0891b2',
      accentSoft: '#0e7490',
      chipGlow: 'rgba(8, 145, 178, 0.5)',
      chipBg: '#eaf6fa',
      panelTint: '#f2fbff',
    },
  },
  ember: {
    dark: {
      top: 'rgba(255, 140, 50, 0.13)',
      bottom: 'rgba(255, 100, 40, 0.08)',
      ring: 'rgba(255, 154, 74, 0.52)',
      halo: 'rgba(255, 130, 50, 0.2)',
      haloDeep: 'rgba(255, 100, 40, 0.1)',
      spill: 'rgba(255, 120, 40, 0.26)',
      accent: '#ff9a4a',
      accentSoft: '#c4581a',
      chipGlow: 'rgba(255, 154, 74, 0.75)',
      chipBg: '#140e0a',
      panelTint: '#1a120c',
    },
    light: {
      top: 'rgba(194, 65, 12, 0.11)',
      bottom: 'rgba(194, 65, 12, 0.06)',
      ring: 'rgba(194, 65, 12, 0.34)',
      halo: 'rgba(194, 65, 12, 0.12)',
      haloDeep: 'rgba(194, 65, 12, 0.05)',
      spill: 'rgba(194, 65, 12, 0.14)',
      accent: '#c2410c',
      accentSoft: '#9a3412',
      chipGlow: 'rgba(194, 65, 12, 0.48)',
      chipBg: '#fffaf6',
      panelTint: '#fff5ec',
    },
  },
  frost: {
    dark: {
      top: 'rgba(180, 220, 255, 0.12)',
      bottom: 'rgba(140, 200, 255, 0.07)',
      ring: 'rgba(180, 220, 255, 0.48)',
      halo: 'rgba(180, 220, 255, 0.18)',
      haloDeep: 'rgba(140, 200, 255, 0.08)',
      spill: 'rgba(180, 220, 255, 0.22)',
      accent: '#d8f0ff',
      accentSoft: '#7eb8d8',
      chipGlow: 'rgba(216, 240, 255, 0.7)',
      chipBg: '#0c1218',
      panelTint: '#101a24',
    },
    light: {
      top: 'rgba(40, 136, 176, 0.1)',
      bottom: 'rgba(40, 136, 176, 0.06)',
      ring: 'rgba(40, 136, 176, 0.3)',
      halo: 'rgba(40, 136, 176, 0.1)',
      haloDeep: 'rgba(40, 136, 176, 0.04)',
      spill: 'rgba(40, 136, 176, 0.12)',
      accent: '#2888b0',
      accentSoft: '#186888',
      chipGlow: 'rgba(40, 136, 176, 0.45)',
      chipBg: '#f8fcff',
      panelTint: '#f4fbff',
    },
  },
  pulse: {
    dark: {
      top: 'rgba(255, 100, 190, 0.12)',
      bottom: 'rgba(200, 40, 136, 0.08)',
      ring: 'rgba(255, 110, 200, 0.5)',
      halo: 'rgba(255, 80, 180, 0.2)',
      haloDeep: 'rgba(200, 40, 136, 0.1)',
      spill: 'rgba(255, 90, 190, 0.24)',
      accent: '#ff6ec8',
      accentSoft: '#c02888',
      chipGlow: 'rgba(255, 110, 200, 0.72)',
      chipBg: '#100a14',
      panelTint: '#18101e',
    },
    light: {
      top: 'rgba(184, 24, 120, 0.1)',
      bottom: 'rgba(184, 24, 120, 0.06)',
      ring: 'rgba(184, 24, 120, 0.28)',
      halo: 'rgba(184, 24, 120, 0.1)',
      haloDeep: 'rgba(184, 24, 120, 0.04)',
      spill: 'rgba(184, 24, 120, 0.12)',
      accent: '#b81878',
      accentSoft: '#881058',
      chipGlow: 'rgba(184, 24, 120, 0.42)',
      chipBg: '#faf6fc',
      panelTint: '#fdf6ff',
    },
  },
  moss: {
    dark: {
      top: 'rgba(143, 191, 122, 0.11)',
      bottom: 'rgba(74, 112, 64, 0.07)',
      ring: 'rgba(143, 191, 122, 0.4)',
      halo: 'rgba(143, 191, 122, 0.13)',
      haloDeep: 'rgba(74, 112, 64, 0.06)',
      spill: 'rgba(143, 191, 122, 0.16)',
      accent: '#8fbf7a',
      accentSoft: '#4a7040',
      chipGlow: 'rgba(143, 191, 122, 0.58)',
      chipBg: '#101612',
      panelTint: '#182018',
    },
    light: {
      top: 'rgba(61, 104, 64, 0.09)',
      bottom: 'rgba(61, 104, 64, 0.05)',
      ring: 'rgba(61, 104, 64, 0.24)',
      halo: 'rgba(61, 104, 64, 0.08)',
      haloDeep: 'rgba(40, 72, 40, 0.04)',
      spill: 'rgba(61, 104, 64, 0.1)',
      accent: '#3d6840',
      accentSoft: '#284828',
      chipGlow: 'rgba(61, 104, 64, 0.38)',
      chipBg: '#f6faf7',
      panelTint: '#f8fcf9',
    },
  },
  plum: {
    dark: {
      top: 'rgba(200, 160, 255, 0.11)',
      bottom: 'rgba(122, 82, 184, 0.07)',
      ring: 'rgba(200, 160, 255, 0.4)',
      halo: 'rgba(200, 160, 255, 0.13)',
      haloDeep: 'rgba(122, 82, 184, 0.06)',
      spill: 'rgba(200, 160, 255, 0.16)',
      accent: '#c8a0ff',
      accentSoft: '#7a52b8',
      chipGlow: 'rgba(200, 160, 255, 0.58)',
      chipBg: '#120e16',
      panelTint: '#1a1420',
    },
    light: {
      top: 'rgba(107, 64, 160, 0.09)',
      bottom: 'rgba(107, 64, 160, 0.05)',
      ring: 'rgba(107, 64, 160, 0.24)',
      halo: 'rgba(107, 64, 160, 0.08)',
      haloDeep: 'rgba(74, 40, 120, 0.04)',
      spill: 'rgba(107, 64, 160, 0.1)',
      accent: '#6b40a0',
      accentSoft: '#4a2878',
      chipGlow: 'rgba(107, 64, 160, 0.38)',
      chipBg: '#faf6ff',
      panelTint: '#fdfaff',
    },
  },
  rose: {
    dark: {
      top: 'rgba(240, 168, 184, 0.11)',
      bottom: 'rgba(176, 88, 112, 0.07)',
      ring: 'rgba(240, 168, 184, 0.38)',
      halo: 'rgba(240, 168, 184, 0.13)',
      haloDeep: 'rgba(176, 88, 112, 0.06)',
      spill: 'rgba(240, 168, 184, 0.15)',
      accent: '#f0a8b8',
      accentSoft: '#b05870',
      chipGlow: 'rgba(240, 168, 184, 0.55)',
      chipBg: '#161012',
      panelTint: '#1e1618',
    },
    light: {
      top: 'rgba(168, 64, 88, 0.09)',
      bottom: 'rgba(168, 64, 88, 0.05)',
      ring: 'rgba(168, 64, 88, 0.22)',
      halo: 'rgba(168, 64, 88, 0.08)',
      haloDeep: 'rgba(120, 40, 64, 0.04)',
      spill: 'rgba(168, 64, 88, 0.09)',
      accent: '#a84058',
      accentSoft: '#782840',
      chipGlow: 'rgba(168, 64, 88, 0.36)',
      chipBg: '#fff8f9',
      panelTint: '#fffafb',
    },
  },
  steel: {
    dark: {
      top: 'rgba(142, 180, 216, 0.11)',
      bottom: 'rgba(74, 112, 152, 0.07)',
      ring: 'rgba(142, 180, 216, 0.38)',
      halo: 'rgba(142, 180, 216, 0.13)',
      haloDeep: 'rgba(74, 112, 152, 0.06)',
      spill: 'rgba(142, 180, 216, 0.15)',
      accent: '#8eb4d8',
      accentSoft: '#4a7098',
      chipGlow: 'rgba(142, 180, 216, 0.55)',
      chipBg: '#101418',
      panelTint: '#181c24',
    },
    light: {
      top: 'rgba(56, 104, 144, 0.09)',
      bottom: 'rgba(56, 104, 144, 0.05)',
      ring: 'rgba(56, 104, 144, 0.22)',
      halo: 'rgba(56, 104, 144, 0.08)',
      haloDeep: 'rgba(40, 72, 104, 0.04)',
      spill: 'rgba(56, 104, 144, 0.09)',
      accent: '#386890',
      accentSoft: '#284868',
      chipGlow: 'rgba(56, 104, 144, 0.36)',
      chipBg: '#f6f8fa',
      panelTint: '#f9fbfd',
    },
  },
  wine: {
    dark: {
      top: 'rgba(216, 106, 136, 0.11)',
      bottom: 'rgba(148, 56, 80, 0.07)',
      ring: 'rgba(216, 106, 136, 0.38)',
      halo: 'rgba(216, 106, 136, 0.13)',
      haloDeep: 'rgba(148, 56, 80, 0.06)',
      spill: 'rgba(216, 106, 136, 0.15)',
      accent: '#d86a88',
      accentSoft: '#943850',
      chipGlow: 'rgba(216, 106, 136, 0.55)',
      chipBg: '#140e10',
      panelTint: '#1c1416',
    },
    light: {
      top: 'rgba(136, 40, 72, 0.09)',
      bottom: 'rgba(136, 40, 72, 0.05)',
      ring: 'rgba(136, 40, 72, 0.22)',
      halo: 'rgba(136, 40, 72, 0.08)',
      haloDeep: 'rgba(96, 24, 48, 0.04)',
      spill: 'rgba(136, 40, 72, 0.09)',
      accent: '#882848',
      accentSoft: '#601830',
      chipGlow: 'rgba(136, 40, 72, 0.36)',
      chipBg: '#faf4f5',
      panelTint: '#fdf8f9',
    },
  },
}

export function gemLookTone(look, theme = 'dark') {
  if (!isGemLook(look)) return null
  const pack = TONES[look]
  if (!pack) return null
  return pack[theme === 'light' ? 'light' : 'dark']
}

export function hallHaloTone(look, theme = 'dark') {
  return gemLookTone(look, theme)
}

export function gemLookChipMeta(look, theme = 'dark') {
  const tone = gemLookTone(look, theme)
  if (!tone) return null
  return {
    on: tone.accent,
    bg: tone.chipBg,
    glow: tone.chipGlow,
    dotGlow: tone.chipGlow,
    ring: tone.ring,
  }
}

export function gemPanelStyle(look, theme = 'dark') {
  const tone = gemLookTone(look, theme)
  if (!tone) return undefined
  return {
    backgroundColor: tone.panelTint,
    borderColor: tone.ring,
    borderWidth: 1.5,
    shadowColor: tone.accent,
    shadowOpacity: 0.58,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 0 },
    elevation: 12,
  }
}

export function gemFrameStyle(look, theme = 'dark') {
  const tone = gemLookTone(look, theme)
  if (!tone) return undefined
  return {
    shadowColor: tone.accent,
    shadowOpacity: 0.35,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 0 },
    elevation: 4,
  }
}

export function gemMeterStyle(look, theme = 'dark') {
  const tone = gemLookTone(look, theme)
  if (!tone) return undefined
  return {
    barBorderColor: tone.ring,
    fillShadowColor: tone.accent,
  }
}
