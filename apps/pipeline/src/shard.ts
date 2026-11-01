/** `--shard 1/4` keeps every 4th item starting at index 1, so parallel CI jobs split the work. */
export function shard<T extends { id: string }>(items: T[], spec?: string): T[] {
  if (!spec) return items;
  const [index, count] = spec.split('/').map(Number);
  if (!(count > 0) || !(index >= 0 && index < count)) throw new Error(`Bad --shard "${spec}", expected i/n`);
  return [...items].sort((a, b) => a.id.localeCompare(b.id)).filter((_, i) => i % count === index);
}
