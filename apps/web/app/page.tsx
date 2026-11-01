import { categoryById } from '@athena/config/categories';
import { Feed } from './components/Feed';
import { getFeed, getPrefs } from './lib/queries';

export const dynamic = 'force-dynamic';

export default async function Home({ searchParams }: { searchParams: Promise<{ c?: string; v?: string }> }) {
  const { c, v } = await searchParams;
  const prefs = await getPrefs();
  const active = c && categoryById[c] ? c : undefined;
  const items = await getFeed(active);
  const chips = prefs.categories.filter((id) => categoryById[id]).map((id) => ({ id, ...pick(id) }));
  return <Feed items={items} chips={chips} active={active} startAt={v} />;
}

const pick = (id: string) => ({ name: categoryById[id].name, emoji: categoryById[id].emoji, color: categoryById[id].color });
