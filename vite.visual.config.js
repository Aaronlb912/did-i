import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig, mergeConfig } from 'vite'
import base from './vite.config.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default mergeConfig(
  base,
  defineConfig({
    resolve: {
      alias: {
        'react-native': 'react-native-web',
        'react-native-safe-area-context': path.join(__dirname, 'src/visual/mocks/safe-area-context.js'),
        'react-native/Libraries/Utilities/codegenNativeComponent': 'react-native-web/dist/cjs/modules/codegenNativeComponent',
      },
    },
    optimizeDeps: {
      exclude: ['react-native-safe-area-context'],
    },
    server: {
      host: '127.0.0.1',
      port: 48743,
      strictPort: true,
    },
    preview: {
      host: '127.0.0.1',
      port: 48743,
      strictPort: true,
    },
    build: {
      outDir: path.join(__dirname, 'dist-visual'),
      rollupOptions: {
        input: path.join(__dirname, 'visual.html'),
      },
    },
  }),
)
