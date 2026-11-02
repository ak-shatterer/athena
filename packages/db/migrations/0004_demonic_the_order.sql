ALTER TABLE "lessons" ALTER COLUMN "level" SET DEFAULT 'intermediate';--> statement-breakpoint
ALTER TABLE "user_prefs" ALTER COLUMN "level" SET DEFAULT 'intermediate';--> statement-breakpoint
-- Lessons were pitched too basic; move the existing learner up a level (they can pick again in onboarding).
UPDATE "user_prefs" SET "level" = 'intermediate' WHERE "level" = 'beginner';