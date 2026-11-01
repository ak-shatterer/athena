export * from './lesson';

// 'expired': the video was removed by retention; the lesson and its concept history stay.
export const LESSON_STATUSES = ['planned', 'scripted', 'voiced', 'rendered', 'ready', 'failed', 'expired'] as const;
export type LessonStatus = (typeof LESSON_STATUSES)[number];

// Spaced-review intervals in days, indexed by the number of successful reviews.
export const REVIEW_INTERVALS_DAYS = [1, 3, 7, 21] as const;

export const VIDEO = { width: 720, height: 1280, fps: 30, crf: 28 } as const;
