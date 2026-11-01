import { icons, Sparkles } from 'lucide-react';

// Lesson scripts name icons in kebab-case ("trending-up"); lucide exports PascalCase.
export const Icon = ({ name, size, color }: { name?: string; size: number; color: string }) => {
  const key = (name ?? '').replace(/(^|-)([a-z0-9])/g, (_, __, c: string) => c.toUpperCase()) as keyof typeof icons;
  const Component = icons[key] ?? Sparkles;
  return <Component size={size} color={color} strokeWidth={1.75} />;
};
