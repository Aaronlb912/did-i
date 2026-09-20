// Tokens lifted from src/lib/did-i.css. Keep these in step with the
// --di-* custom properties; a look that is missing here silently falls
// back to lime, so somebody sees a look they did not buy.

const DARK = {
  bg: '#0e1014',
  panel: '#16191f',
  panel2: '#1d212a',
  panel3: '#242935',
  line: '#2b3140',
  lineSoft: '#21262f',
  ink: '#f4f6fa',
  inkSoft: '#99a1b0',
  inkDim: '#616978',
  on: '#c9f24d',
  onDeep: '#8fae2c',
  late: '#6fb7ff',
  skip: '#7d8694',
  open: '#39404e',
  miss: '#ff6f61',
  veil: 'rgba(8, 10, 14, 0.55)',
}

const LIGHT = {
  bg: '#eef1e6',
  panel: '#ffffff',
  panel2: '#f4f6ee',
  panel3: '#e8ebdf',
  line: '#cfd4c4',
  lineSoft: '#dde1d4',
  ink: '#1a1d16',
  inkSoft: '#4a5240',
  inkDim: '#6d7564',
  on: '#5a7a10',
  onDeep: '#3d5608',
  late: '#1e6bb8',
  skip: '#6a7164',
  open: '#d5d9cc',
  miss: '#c44536',
  veil: 'rgba(26, 29, 22, 0.4)',
}

const LOOKS = {
  lime: { dark: {}, light: {} },
  ink: {
    dark: { on: '#b8c48a', onDeep: '#6f7a4a' },
    light: { on: '#5a6240', onDeep: '#3d442c' },
  },
  brass: {
    dark: { on: '#e2c36a', onDeep: '#9a7a28' },
    light: { on: '#8a6a18', onDeep: '#5c4610' },
  },
  night: {
    dark: {
      bg: '#0a0b0e',
      panel: '#12141a',
      panel2: '#181b22',
      panel3: '#1e222c',
      on: '#d4c07a',
      onDeep: '#8a7840',
    },
    light: {
      bg: '#e6e4dc',
      panel: '#f7f5ee',
      panel2: '#efece3',
      panel3: '#e4e0d4',
      on: '#6e5c28',
      onDeep: '#4a3d18',
    },
  },
  moss: {
    dark: {
      bg: '#0c100e',
      panel: '#141a16',
      panel2: '#1a221c',
      panel3: '#202a22',
      line: '#2a362c',
      lineSoft: '#202820',
      on: '#8fbf7a',
      onDeep: '#4a7040',
    },
    light: {
      bg: '#e6ede8',
      panel: '#f6faf7',
      panel2: '#eaf0eb',
      panel3: '#dde6df',
      line: '#b8c8bc',
      lineSoft: '#cdd8d0',
      on: '#3d6840',
      onDeep: '#284828',
    },
  },
  plum: {
    dark: {
      bg: '#0f0c12',
      panel: '#17121c',
      panel2: '#1e1826',
      panel3: '#261e30',
      line: '#342a40',
      lineSoft: '#282030',
      on: '#c8a0ff',
      onDeep: '#7a52b8',
    },
    light: {
      bg: '#eee8f4',
      panel: '#faf6ff',
      panel2: '#f0eaf8',
      panel3: '#e4dcef',
      line: '#c8b8d8',
      lineSoft: '#d8cce4',
      on: '#6b40a0',
      onDeep: '#4a2878',
    },
  },
  rose: {
    dark: {
      bg: '#100e0f',
      panel: '#181416',
      panel2: '#201a1e',
      panel3: '#282024',
      line: '#3a3034',
      lineSoft: '#2c2428',
      on: '#f0a8b8',
      onDeep: '#b05870',
    },
    light: {
      bg: '#f4ecee',
      panel: '#fff8f9',
      panel2: '#faeff2',
      panel3: '#f0e2e6',
      line: '#dcc4cc',
      lineSoft: '#ead8de',
      on: '#a84058',
      onDeep: '#782840',
    },
  },
  steel: {
    dark: {
      bg: '#0c0e12',
      panel: '#141820',
      panel2: '#1a2028',
      panel3: '#202830',
      line: '#2a3440',
      lineSoft: '#202830',
      on: '#8eb4d8',
      onDeep: '#4a7098',
    },
    light: {
      bg: '#e8ecf0',
      panel: '#f6f8fa',
      panel2: '#eef2f6',
      panel3: '#e0e6ec',
      line: '#bcc8d4',
      lineSoft: '#d0d8e0',
      on: '#386890',
      onDeep: '#284868',
    },
  },
  wine: {
    dark: {
      bg: '#0e0a0c',
      panel: '#161014',
      panel2: '#1e161a',
      panel3: '#261c22',
      line: '#382830',
      lineSoft: '#2a2024',
      on: '#d86a88',
      onDeep: '#943850',
    },
    light: {
      bg: '#f0e8ea',
      panel: '#faf4f5',
      panel2: '#f2e8ea',
      panel3: '#e8dade',
      line: '#d0b8be',
      lineSoft: '#deccd0',
      on: '#882848',
      onDeep: '#601830',
    },
  },
  glow: {
    dark: {
      bg: '#0a0e14',
      panel: '#111820',
      panel2: '#161e28',
      panel3: '#1c2632',
      line: '#243040',
      lineSoft: '#1a2430',
      on: '#5ee8ff',
      onDeep: '#2a9db5',
    },
    light: {
      bg: '#e8f4f8',
      panel: '#f6fcff',
      panel2: '#eaf6fa',
      panel3: '#dceef5',
      line: '#b8d4e0',
      lineSoft: '#cfe4ec',
      on: '#0891b2',
      onDeep: '#0e7490',
    },
  },
  ember: {
    dark: {
      bg: '#100c0a',
      panel: '#181210',
      panel2: '#201814',
      panel3: '#281e18',
      line: '#3a2a22',
      lineSoft: '#2a201a',
      on: '#ff9a4a',
      onDeep: '#c4581a',
    },
    light: {
      bg: '#f8f0ea',
      panel: '#fffaf6',
      panel2: '#faefe4',
      panel3: '#f0e0d2',
      line: '#dcc4b0',
      lineSoft: '#ead8c8',
      on: '#c2410c',
      onDeep: '#9a3412',
    },
  },
  frost: {
    dark: {
      bg: '#0a0e12',
      panel: '#101820',
      panel2: '#162028',
      panel3: '#1c2830',
      line: '#243038',
      lineSoft: '#1a242c',
      on: '#d8f0ff',
      onDeep: '#7eb8d8',
    },
    light: {
      bg: '#eef4f8',
      panel: '#f8fcff',
      panel2: '#eef6fa',
      panel3: '#e0ecf2',
      line: '#c0d4e0',
      lineSoft: '#d4e4ec',
      on: '#2888b0',
      onDeep: '#186888',
    },
  },
  pulse: {
    dark: {
      bg: '#0c0a10',
      panel: '#14101a',
      panel2: '#1a1422',
      panel3: '#221a2a',
      line: '#322840',
      lineSoft: '#261e30',
      on: '#ff6ec8',
      onDeep: '#c02888',
    },
    light: {
      bg: '#f0eaf4',
      panel: '#faf6fc',
      panel2: '#f2eaf6',
      panel3: '#e8deee',
      line: '#d0c0d8',
      lineSoft: '#deced8',
      on: '#b81878',
      onDeep: '#881058',
    },
  },
}

export const LOOK_IDS = Object.keys(LOOKS)

export function hallColors(look = 'lime', theme = 'dark') {
  const base = theme === 'light' ? LIGHT : DARK
  const patch = (LOOKS[look] || LOOKS.lime)[theme === 'light' ? 'light' : 'dark'] || {}
  return { ...base, ...patch }
}

export const fonts = {
  ui: 'System',
  mono: 'monospace',
  display: 'System',
}

export const radius = { r: 18, rSm: 12, pill: 999 }
