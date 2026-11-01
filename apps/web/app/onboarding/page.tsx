import { categories } from '@athena/config/categories';
import { getPrefs } from '../lib/queries';
import { TopicPicker } from './TopicPicker';

export const dynamic = 'force-dynamic';

export default async function Onboarding() {
  const prefs = await getPrefs();
  const options = categories.map((c) => ({ id: c.id, name: c.name, emoji: c.emoji, color: c.color, perDay: c.lessonsPerDay }));
  return <TopicPicker options={options} initial={prefs.categories} initialLevel={prefs.level} />;
}
