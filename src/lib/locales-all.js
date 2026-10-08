// Every language, loaded at once. The phone and the tests import this; the
// web loads only the one in use (locale-load.js).
import { de } from '../locales/de.js'
import { es } from '../locales/es.js'
import { fr } from '../locales/fr.js'
import { it } from '../locales/it.js'
import { ja } from '../locales/ja.js'
import { ko } from '../locales/ko.js'
import { pt } from '../locales/pt.js'
import { zh } from '../locales/zh.js'
import { addLocale } from './i18n.js'

addLocale('es', es)
addLocale('fr', fr)
addLocale('de', de)
addLocale('pt', pt)
addLocale('it', it)
addLocale('zh', zh)
addLocale('ja', ja)
addLocale('ko', ko)
