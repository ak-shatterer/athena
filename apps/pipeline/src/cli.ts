// Athena daily pipeline. Each step only picks up lessons in the previous
// status, so any step can be re-run safely after a failure.
//
//   pnpm pipeline ingest [--category ai]
//   pnpm pipeline rank
//   pnpm pipeline plan
//   pnpm pipeline write
//   pnpm pipeline voice
//   pnpm pipeline render [--shard 0/4]
//   pnpm pipeline publish
//   pnpm pipeline run-daily

import { closeDbs } from '@athena/db';
import { steps, type StepName } from './steps';

const [name = 'help', ...rest] = process.argv.slice(2);
const args = Object.fromEntries(
  rest.flatMap((a, i) => (a.startsWith('--') ? [[a.slice(2), rest[i + 1] ?? 'true']] : [])),
);

if (!(name in steps)) {
  console.log(`Usage: pnpm pipeline <${Object.keys(steps).join('|')}> [--category id] [--shard i/n]`);
  process.exit(name === 'help' ? 0 : 1);
}

try {
  await steps[name as StepName](args);
} finally {
  // Close handles and let Node exit naturally: process.exit() can crash onnxruntime (used for narration).
  await closeDbs();
}
