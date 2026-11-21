// Velvet Hour — the hand-in program for the stealth-game bounty.
//
// The game is the static site in game/ (index.html and its ES modules:
// no build step, no network). This program copies game/ and
// screenshots/ into the output directory and writes dossier.json with
// the kit's vendored buildDossier, byte for byte as the gate rebuilds
// it. Before it copies anything, it refuses screenshots the gate would
// refuse: more than four of them, one over 256 KiB, or one whose
// dimensions break the 1280 long-side / 480 short-side rule. A PNG's
// own header carries its dimensions, so no image library is needed.
//
// Outside the grader, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

const SHOT_MAX_BYTES = 262144; // 256 KiB
const SHOT_LONG_SIDE_MAX = 1280;
const SHOT_SHORT_SIDE_MIN = 480;

// Read a PNG's width and height from its first 24 bytes.
function pngSize(path: string): { width: number; height: number } {
  const head = readFileSync(path).subarray(0, 24);
  const signature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  for (let i = 0; i < signature.length; i++) {
    if (head[i] !== signature[i]) {
      throw new Error(`${path}: not a PNG (this entry ships PNG screenshots)`);
    }
  }
  const view = new DataView(head.buffer, head.byteOffset, head.byteLength);
  const width = view.getUint32(16);
  const height = view.getUint32(20);
  return { width, height };
}

// Check the screenshots directory against the gate's rules and return
// the file names, sorted, that the hand-in will carry.
function checkScreenshots(dir: string): string[] {
  const names = readdirSync(dir)
    .filter((n) => /\.(png|jpe?g)$/i.test(n) && !n.startsWith('.'))
    .sort();
  const count = names.length;
  if (count < 3 || count > 4) {
    throw new Error(`screenshots/: expected 3 or 4 images, found ${count}`);
  }
  for (const name of names) {
    checkShotSize(join(dir, name));
  }
  return names;
}

// One file against the size and dimension caps.
function checkShotSize(path: string): void {
  const name = path.split('/').pop() ?? path;
  const bytes = statSync(path).size;
  if (bytes > SHOT_MAX_BYTES) {
    throw new Error(`screenshots/${name}: ${bytes} bytes exceeds the 256 KiB cap`);
  }
  if (!/\.png$/i.test(name)) return;
  const { width, height } = pngSize(path);
  const long = Math.max(width, height);
  const short = Math.min(width, height);
  if (long > SHOT_LONG_SIDE_MAX || short < SHOT_SHORT_SIDE_MIN) {
    throw new Error(`screenshots/${name}: ${width}x${height} breaks the screenshot size rule`);
  }
}

const shots = checkScreenshots(join(here, 'screenshots'));

mkdirSync(out, { recursive: true });
cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });
const shotsOut = join(out, 'screenshots');
mkdirSync(shotsOut, { recursive: true });
if (existsSync(join(here, 'screenshots'))) {
  cpSync(join(here, 'screenshots'), shotsOut, { recursive: true });
}

// The caps below are the scorer's own (see the kit's RULES.txt, The
// gate): the dossier text is capped at 160 KiB, and the counts refuse an
// entry the gate would refuse.
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: SHOT_MAX_BYTES },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);

console.log(`Velvet Hour handed in: game/ + ${shots.length} screenshots -> ${out} (${shots.join(', ')})`);
