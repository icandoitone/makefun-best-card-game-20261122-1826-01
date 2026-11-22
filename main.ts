// Ember Duel — the entry program (Node 22, standard library only).
//
// It hands the game in: copies this repository's game/ and screenshots/
// beside this file into the output directory and writes dossier.json there
// with the kit's vendored buildDossier helper. Outside the grader, the
// MAKEFUN_OUTPUT_DIR environment variable stands in for /output:
//
//   MAKEFUN_OUTPUT_DIR=out node main.ts
//
// The run must be deterministic: the same files in, the same bytes out.

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

const gameSource = join(repoRoot, 'game');
const shotsSource = join(repoRoot, 'screenshots');

mkdirSync(outputDir, { recursive: true });
cpSync(gameSource, join(outputDir, 'game'), { recursive: true });

const shotsTarget = join(outputDir, 'screenshots');
mkdirSync(shotsTarget, { recursive: true });
if (existsSync(shotsSource)) {
  cpSync(shotsSource, shotsTarget, { recursive: true });
}

// The scorer's caps for this bounty: the dossier text cap, at most four
// screenshots of at most 256 KiB each, and game/ within 993 entries and
// 48 MiB. Anything over a cap is refused here before it reaches the gate.
const dossier = buildDossier(outputDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
});

writeFileSync(join(outputDir, 'dossier.json'), dossier);
