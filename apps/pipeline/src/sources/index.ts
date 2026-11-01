import Parser from 'rss-parser';
import type { Source } from '@athena/config/categories';

export interface RawArticle {
  url: string;
  title: string;
  summary?: string;
  publisher: string;
  publishedAt?: Date;
}

const TIMEOUT_MS = 15_000;
const USER_AGENT = 'AthenaLearningBot/0.1 (personal learning feed)';
// Promos, podcasts and live blogs make poor lessons; dropped at ingest and rank.
const NOISE = /\b(podcast|sponsored|days? left|early[- ]bird|promo code|deals? of the|newsletter)\b|[–-] (as it happened|live)\b|\blive updates\b|^APOD:/i;

export function isNoise(title: string): boolean {
  return NOISE.test(title);
}

// Parsing only: rss-parser's own HTTP client leaves sockets open, which keeps
// the CLI from exiting, so feeds are downloaded with fetch.
const rss = new Parser();

export async function fetchSource(source: Source): Promise<RawArticle[]> {
  const items = await fetchers[source.kind](source);
  const filtered = source.filter
    ? items.filter((a) => source.filter!.test(`${a.title} ${a.summary ?? ''}`))
    : items;
  return filtered.filter((a) => a.url && a.title && !isNoise(a.title));
}

const fetchers: Record<Source['kind'], (s: Source) => Promise<RawArticle[]>> = {
  rss: fetchRss,
  arxiv: fetchRss,

  async hn(source) {
    const data = await getJson<{ hits: { title: string; url?: string; created_at: string }[] }>(source.url);
    return data.hits
      .filter((h) => h.url)
      .map((h) => ({ url: h.url!, title: h.title, publisher: source.publisher, publishedAt: new Date(h.created_at) }));
  },
};

async function fetchRss(source: Source): Promise<RawArticle[]> {
  const res = await fetch(source.url, { headers: { 'User-Agent': USER_AGENT }, signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const feed = await rss.parseString(await res.text());
  return feed.items.map((item) => ({
    url: item.link ?? '',
    title: cleanText(item.title) ?? '',
    summary: cleanText(item.contentSnippet ?? item.summary ?? item.content),
    publisher: source.publisher,
    publishedAt: item.isoDate ? new Date(item.isoDate) : item.pubDate ? new Date(item.pubDate) : undefined,
  }));
}

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT }, signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as T;
}

function cleanText(s?: string): string | undefined {
  if (!s) return undefined;
  const text = s
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#39;|&rsquo;/g, "'")
    .replace(/&quot;|&ldquo;|&rdquo;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
  return text.slice(0, 1000) || undefined;
}
