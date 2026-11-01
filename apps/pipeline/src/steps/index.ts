type Args = Record<string, string>;

// Steps load lazily: the narration library installs process-wide crash handlers that
// hide real errors, so only the voice step should pull it in.
export const steps = {
  ingest: async (args: Args) => (await import('./ingest')).ingest(args),
  rank: async (args: Args) => (await import('./rank')).rank(args),
  plan: async (args: Args) => (await import('./plan')).plan(args),
  write: async (args: Args) => (await import('./write')).write(args),
  voice: async (args: Args) => (await import('./voice')).voice(args),
  render: async (args: Args) => (await import('./render')).render(args),
  publish: async (args: Args) => (await import('./publish')).publish(args),
  count: async (args: Args) => (await import('./count')).count(args),
  doctor: async () => (await import('./doctor')).doctor(),
  'run-daily': async (args: Args) => {
    for (const s of ['ingest', 'rank', 'plan', 'write', 'voice', 'render', 'publish'] as const) {
      console.log(`▶ ${s}`);
      await steps[s](args);
    }
  },
} satisfies Record<string, (args: Args) => Promise<void>>;

export type StepName = keyof typeof steps;
