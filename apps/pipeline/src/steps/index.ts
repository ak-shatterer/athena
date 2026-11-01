import { ingest } from './ingest';
import { rank } from './rank';
import { plan } from './plan';
import { write } from './write';
import { voice } from './voice';
import { render } from './render';
import { publish } from './publish';
import { count } from './count';
import { doctor } from './doctor';

type Args = Record<string, string>;

export const steps = {
  ingest,
  rank,
  plan,
  write,
  voice,
  render,
  publish,
  count,
  doctor,
  'run-daily': async (args: Args) => {
    for (const s of ['ingest', 'rank', 'plan', 'write', 'voice', 'render', 'publish'] as const) {
      console.log(`▶ ${s}`);
      await steps[s](args);
    }
  },
} satisfies Record<string, (args: Args) => Promise<void>>;

export type StepName = keyof typeof steps;
