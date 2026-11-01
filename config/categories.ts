// Categories Athena can teach. Add or remove entries freely; the pipeline and
// web app both read from this list. Every source here is free.

export type SourceKind = 'rss' | 'hn' | 'arxiv';
export type DataProvider = 'yahoo' | 'fred' | 'football-data';

export interface Source {
  kind: SourceKind;
  url: string;
  publisher: string;
  weight: number; // 0–1, how much we trust/prioritise this source when ranking
  filter?: RegExp; // keep only items whose title/summary match (for general feeds)
}

export interface Category {
  id: string;
  name: string;
  emoji: string;
  color: string; // accent used in video theme + UI chips
  lessonsPerDay: number;
  sources: Source[];
  dataProviders?: DataProvider[];
  preferredVisuals: string[]; // hints for the lesson writer
}

export const categories: Category[] = [
  {
    id: 'ai',
    name: 'AI',
    emoji: '🤖',
    color: '#7C5CFF',
    lessonsPerDay: 3,
    sources: [
      {
        kind: 'hn',
        url: 'https://hn.algolia.com/api/v1/search?tags=front_page&hitsPerPage=50',
        publisher: 'Hacker News',
        weight: 0.7,
        filter: /\b(AI|LLMs?|GPT|Claude|Gemini|OpenAI|Anthropic|model|neural|machine learning|agents?)\b/i,
      },
      { kind: 'arxiv', url: 'https://export.arxiv.org/rss/cs.AI', publisher: 'arXiv cs.AI', weight: 0.6 },
      { kind: 'rss', url: 'https://www.theverge.com/rss/ai-artificial-intelligence/index.xml', publisher: 'The Verge', weight: 0.8 },
      { kind: 'rss', url: 'https://techcrunch.com/category/artificial-intelligence/feed/', publisher: 'TechCrunch', weight: 0.8 },
    ],
    preferredVisuals: ['flow', 'analogy', 'timeline'],
  },
  {
    id: 'stocks',
    name: 'Stocks & Markets',
    emoji: '📈',
    color: '#16A34A',
    lessonsPerDay: 3,
    sources: [
      { kind: 'rss', url: 'https://www.cnbc.com/id/100003114/device/rss/rss.html', publisher: 'CNBC', weight: 0.8 },
      { kind: 'rss', url: 'https://feeds.content.dowjones.io/public/rss/mw_topstories', publisher: 'MarketWatch', weight: 0.7 },
    ],
    dataProviders: ['yahoo'],
    preferredVisuals: ['chart', 'analogy', 'flow'],
  },
  {
    id: 'football',
    name: 'Football',
    emoji: '⚽',
    color: '#0EA5E9',
    lessonsPerDay: 2,
    sources: [
      { kind: 'rss', url: 'https://feeds.bbci.co.uk/sport/football/rss.xml', publisher: 'BBC Sport', weight: 0.9 },
      { kind: 'rss', url: 'https://www.espn.com/espn/rss/soccer/news', publisher: 'ESPN', weight: 0.7 },
    ],
    dataProviders: ['football-data'],
    preferredVisuals: ['table', 'flow', 'timeline'],
  },
  {
    id: 'politics',
    name: 'World Politics',
    emoji: '🌍',
    color: '#DC2626',
    lessonsPerDay: 3,
    sources: [
      { kind: 'rss', url: 'https://feeds.bbci.co.uk/news/world/rss.xml', publisher: 'BBC World', weight: 0.9 },
      { kind: 'rss', url: 'https://www.aljazeera.com/xml/rss/all.xml', publisher: 'Al Jazeera', weight: 0.8 },
      { kind: 'rss', url: 'https://www.theguardian.com/world/rss', publisher: 'The Guardian', weight: 0.8 },
    ],
    preferredVisuals: ['map', 'timeline', 'flow'],
  },
  {
    id: 'economy',
    name: 'Economy & Money',
    emoji: '💰',
    color: '#CA8A04',
    lessonsPerDay: 2,
    sources: [
      { kind: 'rss', url: 'https://feeds.bbci.co.uk/news/business/rss.xml', publisher: 'BBC Business', weight: 0.8 },
      { kind: 'rss', url: 'https://www.cnbc.com/id/20910258/device/rss/rss.html', publisher: 'CNBC Economy', weight: 0.7 },
      { kind: 'rss', url: 'https://www.theguardian.com/business/economics/rss', publisher: 'The Guardian', weight: 0.8 },
    ],
    dataProviders: ['fred'],
    preferredVisuals: ['chart', 'analogy', 'flow'],
  },
  {
    id: 'science',
    name: 'Science & Space',
    emoji: '🔭',
    color: '#2563EB',
    lessonsPerDay: 2,
    sources: [
      { kind: 'rss', url: 'https://www.nasa.gov/feed/', publisher: 'NASA', weight: 0.8 },
      { kind: 'rss', url: 'https://www.quantamagazine.org/feed/', publisher: 'Quanta', weight: 0.9 },
      { kind: 'rss', url: 'https://www.sciencedaily.com/rss/top/science.xml', publisher: 'ScienceDaily', weight: 0.6 },
    ],
    preferredVisuals: ['flow', 'analogy', 'timeline'],
  },
  {
    id: 'tech',
    name: 'Tech & Startups',
    emoji: '🚀',
    color: '#DB2777',
    lessonsPerDay: 2,
    sources: [
      { kind: 'rss', url: 'https://techcrunch.com/feed/', publisher: 'TechCrunch', weight: 0.8 },
      { kind: 'hn', url: 'https://hn.algolia.com/api/v1/search?tags=front_page&hitsPerPage=50', publisher: 'Hacker News', weight: 0.6 },
    ],
    preferredVisuals: ['timeline', 'flow', 'headline'],
  },
  {
    id: 'climate',
    name: 'Climate & Energy',
    emoji: '🌱',
    color: '#059669',
    lessonsPerDay: 2,
    sources: [
      { kind: 'rss', url: 'https://www.carbonbrief.org/feed/', publisher: 'Carbon Brief', weight: 0.9 },
      { kind: 'rss', url: 'https://www.theguardian.com/environment/rss', publisher: 'The Guardian', weight: 0.7 },
    ],
    preferredVisuals: ['chart', 'map', 'flow'],
  },
];

export const categoryById = Object.fromEntries(categories.map((c) => [c.id, c])) as Record<string, Category>;
