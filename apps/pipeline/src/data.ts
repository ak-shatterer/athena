// Fetches the real numbers behind chart visuals before rendering. Both sources
// are free and keyless: Yahoo Finance's chart API (stocks, indices, crypto) and
// FRED's CSV download (US economic series).
import type { Lesson } from '@athena/shared';
import type { VisualData } from '@athena/video/render';

const USER_AGENT = 'Mozilla/5.0 (AthenaLearningBot/0.1)';
const MAX_POINTS = 120;
const RANGE_DAYS = { '1m': 31, '6m': 183, '1y': 366, '5y': 1827, '20y': 7305 } as const;

export async function fetchVisualData(lesson: Lesson): Promise<Record<string, VisualData>> {
  const out: Record<string, VisualData> = {};
  for (const scene of lesson.scenes) {
    if (scene.visual.type !== 'chart') continue;
    const [provider, id] = scene.visual.series.split(':');
    try {
      const points = provider === 'yahoo' ? await yahoo(id, scene.visual.range) : await fred(id, scene.visual.range);
      out[scene.id] = { kind: 'series', label: id, points: downsample(points) };
    } catch (e) {
      // The video still renders: the chart scene falls back to a placeholder card.
      console.warn(`    ! chart ${scene.visual.series}: ${(e as Error).message}`);
    }
  }
  return out;
}

async function yahoo(symbol: string, range: keyof typeof RANGE_DAYS): Promise<[string, number][]> {
  const yahooRange = { '1m': '1mo', '6m': '6mo', '1y': '1y', '5y': '5y', '20y': 'max' }[range];
  const interval = range === '1m' || range === '6m' ? '1d' : range === '1y' ? '1wk' : '1mo';
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=${yahooRange}&interval=${interval}`;
  const json = (await get(url).then((r) => r.json())) as {
    chart: { result?: { timestamp: number[]; indicators: { quote: { close: (number | null)[] }[] } }[] };
  };
  const result = json.chart.result?.[0];
  if (!result) throw new Error('no data');
  const closes = result.indicators.quote[0].close;
  return result.timestamp.flatMap((t, i) => (closes[i] == null ? [] : [[isoDate(t * 1000), closes[i]!] as [string, number]]));
}

async function fred(series: string, range: keyof typeof RANGE_DAYS): Promise<[string, number][]> {
  const csv = await get(`https://fred.stlouisfed.org/graph/fredgraph.csv?id=${encodeURIComponent(series)}`).then((r) => r.text());
  const since = isoDate(Date.now() - RANGE_DAYS[range] * 86400_000);
  return csv
    .trim()
    .split('\n')
    .slice(1)
    .map((line) => line.split(','))
    .filter(([date, value]) => date >= since && value !== '.' && value !== '')
    .map(([date, value]) => [date, Number(value)]);
}

async function get(url: string) {
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT }, signal: AbortSignal.timeout(20_000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res;
}

function downsample(points: [string, number][]) {
  if (points.length <= MAX_POINTS) return points;
  const step = points.length / MAX_POINTS;
  return Array.from({ length: MAX_POINTS }, (_, i) => points[Math.floor(i * step)]).concat([points[points.length - 1]]);
}

const isoDate = (ms: number) => new Date(ms).toISOString().slice(0, 10);
