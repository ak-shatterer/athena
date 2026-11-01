import type { Lesson } from '@athena/shared';

export interface SceneMedia {
  audio: string; // path inside the render's public dir
  durationSec: number;
}

// Fetched before rendering (see apps/pipeline data.ts), keyed by scene id.
export type VisualData = { kind: 'series'; label: string; unit?: string; points: [string, number][] };

export type LessonVideoProps = {
  lesson: Lesson;
  media: SceneMedia[]; // one per scene, same order
  data: Record<string, VisualData>;
};
