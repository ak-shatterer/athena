// Groups articles about the same event and scores the groups. Pure text
// similarity (TF-IDF + cosine), no LLM, so ranking costs nothing.

export interface RankInput {
  id: string;
  title: string;
  summary: string | null;
  publisher: string;
  publishedAt: Date;
  weight: number;
}

export interface Cluster {
  articles: RankInput[];
  lead: RankInput; // most trusted, then newest
  score: number;
}

const SIMILARITY_THRESHOLD = 0.3;
const RECENCY_HALF_LIFE_HOURS = 18;

const STOPWORDS = new Set(
  ('a an and are as at be by for from has have he her his in is it its of on or that the their they this to was ' +
    'were will with after over into new says said say about than more after up out what who how why can could ' +
    'would not but all one two first last year years week day today amid just been also we you your our').split(' '),
);

function tokens(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 2 && !STOPWORDS.has(t))
    .map((t) => (t.length > 4 && t.endsWith('s') ? t.slice(0, -1) : t));
}

type Vector = Map<string, number>;

function vectorize(docs: RankInput[]): Vector[] {
  // Title words count double: headlines carry the event, summaries add noise.
  const termCounts = docs.map((d) => {
    const counts = new Map<string, number>();
    for (const t of tokens(d.title)) counts.set(t, (counts.get(t) ?? 0) + 2);
    for (const t of tokens(d.summary?.slice(0, 300) ?? '')) counts.set(t, (counts.get(t) ?? 0) + 1);
    return counts;
  });
  const df = new Map<string, number>();
  for (const counts of termCounts) for (const t of counts.keys()) df.set(t, (df.get(t) ?? 0) + 1);

  return termCounts.map((counts) => {
    const v: Vector = new Map();
    let norm = 0;
    for (const [t, c] of counts) {
      const w = c * Math.log(1 + docs.length / df.get(t)!);
      v.set(t, w);
      norm += w * w;
    }
    norm = Math.sqrt(norm) || 1;
    for (const [t, w] of v) v.set(t, w / norm);
    return v;
  });
}

function cosine(a: Vector, b: Vector): number {
  const [small, large] = a.size < b.size ? [a, b] : [b, a];
  let dot = 0;
  for (const [t, w] of small) dot += w * (large.get(t) ?? 0);
  return dot;
}

export function clusterAndScore(docs: RankInput[], now = Date.now()): Cluster[] {
  const vectors = vectorize(docs);
  const order = docs.map((_, i) => i).sort((a, b) => docs[b].weight - docs[a].weight);
  const groups: number[][] = [];

  // Single-linkage: join the first group containing any sufficiently similar article.
  for (const i of order) {
    const group = groups.find((g) => g.some((j) => cosine(vectors[i], vectors[j]) >= SIMILARITY_THRESHOLD));
    if (group) group.push(i);
    else groups.push([i]);
  }

  return groups
    .map((g) => {
      const members = g.map((i) => docs[i]);
      const lead = [...members].sort(
        (a, b) => b.weight - a.weight || b.publishedAt.getTime() - a.publishedAt.getTime(),
      )[0];
      const newest = Math.max(...members.map((m) => m.publishedAt.getTime()));
      const ageHours = Math.max(0, (now - newest) / 3600_000);
      const recency = Math.pow(0.5, ageHours / RECENCY_HALF_LIFE_HOURS);
      const publishers = new Set(members.map((m) => m.publisher)).size;
      const coverage = 1 + Math.log(publishers) + 0.25 * Math.log(members.length);
      return { articles: members, lead, score: recency * lead.weight * coverage };
    })
    .sort((a, b) => b.score - a.score);
}
