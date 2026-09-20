import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import gap from './.locale-gap.json' with { type: 'json' };
import { fr } from './locale-gaps/_fr.mjs';
import { de } from './locale-gaps/_de.mjs';
import { pt } from './locale-gaps/_pt.mjs';
import { it } from './locale-gaps/_it.mjs';
import { zh } from './locale-gaps/_zh.mjs';
import { ja } from './locale-gaps/_ja.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, 'locale-gaps');
const langs = { fr, de, pt, it, zh, ja };
const keys = gap.map((x) => x.k);

for (const [code, map] of Object.entries(langs)) {
  const out = {};
  for (const k of keys) {
    if (!(k in map)) throw new Error(`${code}: missing ${k}`);
    out[k] = map[k];
  }
  if (Object.keys(out).length !== 436) {
    throw new Error(`${code}: expected 436 keys, got ${Object.keys(out).length}`);
  }
  fs.writeFileSync(path.join(outDir, `${code}.json`), JSON.stringify(out, null, 2) + '\n');
  console.log(`${code}.json: ${Object.keys(out).length} keys`);
}
