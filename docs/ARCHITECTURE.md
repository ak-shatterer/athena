# Athena: a daily AI learning assistant that makes short videos

## Context
You want a personal learning feed, not a news feed. Every day Athena collects the top stories in the categories you pick and turns each one into a short vertical video (60–120s) with illustrations, on-screen text and a narrator. Each video **teaches the underlying concept at your level first** ("What is a rate cut?") and **then connects it to today's news** ("…which is why the Fed's move yesterday matters"). You scroll through them in a web app and choose categories. Over time Athena remembers which concepts you already know, so it moves on to harder material, quizzes you, and brings back older ideas for review.

`/Users/akshatterer/athena` is empty. Your choices so far: **real MP4 files**, **free/local voice**, **cloud from day one**.

## Learning design (the part that makes it more than news)
This follows well-known learning-science ideas (Feynman technique, retrieval practice, spaced repetition, Bloom's "2-sigma" one-to-one tutoring). AI-tutor products like Khanmigo, and the "use LLMs as a personal tutor" approach many creators teach, are built on the same ideas:

1. **Concept first, news second.** Every lesson has a fixed arc: *Hook → Concept from zero (plain words + analogy) → How it works (diagram) → Today's news through that lens → Why it matters to you → 1 quiz question.*
2. **Concept graph and memory.** Concepts are stored as nodes with prerequisites (e.g. `inflation → interest-rates → rate-cut → bond-yields`). The lesson writer is told what you already know, so it skips basics you've seen and picks the next concept you're missing.
3. **Levels.** Each concept you've seen has a mastery level (0 = new, 1 = seen, 2 = quiz correct, 3 = reviewed). Quiz answers update it.
4. **Spaced review.** Concepts are due again after 1, 3, 7 and 21 days. Each day's feed includes 1–2 "Remember this?" recap videos built from due concepts.
5. **Ask Athena.** On any video you can ask a follow-up ("explain it like I'm 12", "show the opposite view"). Claude answers using that lesson's script and sources as context.
6. **Weekly recap.** Every Sunday, a 3-minute "what you learned this week" video that connects the week's concepts.

## Categories (starter set; in config, easy to edit)
| Category | Free sources (RSS/APIs) | Special visuals |
|---|---|---|
| AI | HN Algolia API, arXiv cs.AI/cs.CL, The Verge AI / TechCrunch AI RSS | flow diagrams |
| Stocks & Markets | CNBC / Yahoo Finance RSS, Yahoo Finance chart API | real price charts |
| Football | BBC Sport / ESPN RSS, football-data.org (free tier) | league tables, scorelines |
| World Politics | BBC World, Al Jazeera, The Guardian, AP RSS | world map highlights |
| Economy & Money | FT/Economist free RSS, FRED API | line charts (CPI, rates) |
| Science & Space | NASA, Quanta, ScienceDaily RSS | diagrams, timelines |
| Tech & Startups | TechCrunch, HN front page | company/timeline cards |
| Climate & Energy | Carbon Brief, Guardian Environment | maps, charts |

Default volume: about 2–3 lessons per selected category, plus 1–2 review videos, so roughly 20 videos a day.

## Architecture

```
GitHub Actions cron (daily 05:00 IST)
  └─ pipeline (Node/TS)
      1. ingest     RSS + APIs ─────────────► articles (Postgres)
      2. rank       dedupe, cluster into stories, score (recency × source weight × cross-source count)
      3. plan       Claude: pick story + the concept to teach, given your concept graph + mastery
      4. write      Claude: lesson script JSON (scenes, narration, visuals, quiz) → zod-validated
      5. data       fetch chart/map/table data the script asks for (Yahoo Finance, FRED, football-data)
      6. voice      Kokoro TTS (kokoro-js, local CPU, free) → one WAV per scene → scene length
      7. render     Remotion → 720×1280 MP4 + thumbnail (Remotion ships its own ffmpeg)
      8. publish    upload to R2 (or Supabase Storage), mark lesson "ready", delete expired videos
                                   │
Supabase Postgres + Auth ◄────────┤
R2 / Supabase Storage (videos) ◄──┘
        ▲
Next.js web app on Vercel: vertical swipe feed, category chips, quiz, Ask Athena, library, progress
```

**Stack choices**
- **TypeScript everywhere**, pnpm monorepo. Kokoro runs in Node through `kokoro-js`, so there's no Python (your local Python 3.9 is too old for Kokoro anyway).
- **LLM: Claude Haiku by default for everything.** `claude-haiku-5-5` handles ranking, concept planning, lesson writing, quizzes, Ask Athena and the weekly recap. The model is set per task in `config/models.ts`. If a lesson fails validation twice, it can escalate once to `claude-sonnet-5-5`. That escalation is off by default; turn it on only if Haiku's lesson quality isn't good enough.
  - Ways to keep the Claude bill small:
    - The daily lesson writing goes through the **Message Batches API**, which costs about 50% less. Nothing is urgent, because results come back well within the cron window.
    - **Prompt caching** on the long, unchanging system prompts (lesson-writer rules, scene schema, style guide).
    - Cheap, non-LLM work happens before Claude sees anything: deduplication and clustering use plain text similarity, not an LLM.
    - Haiku only receives the top story candidates, and it gets short summaries rather than full articles.
    - A **daily token budget guard** in the pipeline stops the run if it goes over the limit you set.
  - Structured output is checked against zod schemas, and a lesson that fails validation is retried once.
- **Video:** Remotion (React to MP4). It's free for individuals. Scenes are React components driven by the script JSON.
- **Voice:** Kokoro-82M (Apache-2.0, runs on CPU, good quality). Sentence-level captions come from text and audio timing. Word-level captions can be added later with whisper.cpp.
- **DB/Auth:** Supabase free tier. Login is a magic link, locked to your email. Supabase pauses free projects after 7 days of inactivity; the daily cron writes to the database, so the project stays awake.
- **Storage:** Cloudflare R2 free tier: 10 GB, no egress fees, $0 while under the limits, but you have to add a card on file.
  - **No-card fallback:** Supabase Storage (1 GB free) with 7-day retention. Both are behind one `storage` interface, so you can switch with an environment variable.
  - **Keeping files small:** render at 720×1280 with H.264 CRF ~28, which is about 2–4 MB per video, or roughly 60 MB a day.
  - **Retention:** delete unsaved videos after 14 days on R2, or 7 days on Supabase. Saved videos are kept.
- **Hosting:** Vercel Hobby (free) runs the Next.js app. Ask Athena is an Edge route on the same plan.
- **Cron:** GitHub Actions.
  - **Public repo** (recommended): unlimited free minutes. All secrets stay in GitHub Secrets.
  - **Private repo:** 2,000 free minutes a month. About 20 videos at 720p take roughly 20–30 runner-minutes a day, which fits.
  - Work runs as a matrix of 4 parallel jobs, so the batch finishes in about 10 minutes.
- **Free data sources only:** RSS, the HN Algolia API, arXiv, the Yahoo Finance chart API, FRED CSV downloads, the football-data.org free tier. None of these need payment.
- **Free assets only:** Lucide icons (ISC licence), Twemoji (CC-BY, credited in the app), world-atlas TopoJSON and Google Fonts. No paid stock media.
- **Cost:** $0 for everything except Claude Haiku usage. With batching and caching, that should be roughly a dollar or two a month at ~20 lessons a day (check current pricing). You set the ceiling with `DAILY_TOKEN_BUDGET`.

## Lesson script schema (the contract between LLM, voice and video)
```ts
Lesson {
  id, date, category, title, level: 'beginner'|'intermediate',
  concept: { slug, name, prerequisites: string[] },
  story: { headline, summary, sources: {title,url,publisher}[] },
  scenes: Scene[],               // 6–9 scenes
  quiz: { question, options: string[4], answerIndex, explanation },
  takeaway: string
}
Scene = { id, narration, onScreenText?, visual: Visual }
Visual =
 | {type:'title', heading, sub}
 | {type:'kinetic', lines: string[]}                 // animated text
 | {type:'analogy', left:{icon,label}, right:{icon,label}, relation}
 | {type:'flow', nodes:{id,label,icon?}[], edges:{from,to,label?}[]}   // diagrams from JSON, not raw SVG
 | {type:'chart', series:'yahoo:AAPL'|'fred:CPIAUCSL'|..., range, annotate?}
 | {type:'map', countries: string[], caption}        // world-atlas topojson
 | {type:'table', kind:'league'|'scoreline', ref}
 | {type:'timeline', events:{date,label}[]}
 | {type:'headline', publisher, text}
 | {type:'quiz'}
```
Illustrations are built from **structured visuals plus an icon set** (Lucide, plus emoji/Twemoji), not generated images. That keeps them free, consistent and safe from copyright problems. AI image generation can be added later as one more `Visual` type.

## Directory layout (to create in `/Users/akshatterer/athena`)
```
athena/
├─ package.json, pnpm-workspace.yaml, turbo.json, tsconfig.base.json, .env.example, README.md
├─ config/
│  ├─ categories.ts          # categories, sources, weights, lessons/day
│  ├─ models.ts              # model per task (Haiku default), escalation flag, token budget
│  └─ prompts/               # planner.md, lesson-writer.md, ask-athena.md, recap.md
├─ packages/
│  ├─ shared/                # zod schemas (Lesson, Scene, Visual), types, constants
│  ├─ db/                    # Drizzle schema + migrations + client
│  ├─ llm/                   # Claude client (batch + prompt caching), prompt loader, validate-retry, budget guard
│  ├─ storage/               # one interface; R2 or Supabase Storage chosen by env var
│  ├─ tts/                   # Kokoro wrapper: text → wav + duration
│  └─ video/                 # Remotion project
│     ├─ src/Root.tsx, Lesson.tsx
│     ├─ src/scenes/         # Title, Kinetic, Analogy, Flow, Chart, Map, Table, Timeline, Headline, Quiz
│     └─ src/theme/          # per-category colors, fonts, captions
├─ apps/
│  ├─ pipeline/              # CLI: ingest | rank | plan | write | voice | render | publish | run-daily
│  │  └─ src/sources/        # index.ts (RSS, Hacker News, arXiv); data.ts fetches chart series (Yahoo, FRED)
│  └─ web/                   # Next.js (App Router) + Tailwind
│     ├─ app/(feed)/page.tsx         # vertical snap-scroll feed, autoplay in view
│     ├─ app/onboarding/             # pick categories + starting level
│     ├─ app/library/                # saved videos, concept graph, mastery
│     ├─ app/api/ask/route.ts        # Ask Athena (streamed Claude)
│     └─ components/VideoCard, QuizSheet, CategoryChips, AskSheet
└─ .github/workflows/daily.yml       # cron → pipeline matrix → R2 → DB
```

## Data model (Postgres / Drizzle)
`categories`, `sources`, `articles(url unique, category, published_at, text)`, `stories(cluster of articles, score, date)`, `concepts(slug, name, category, prerequisites[])`, `lessons(story_id, concept_id, script jsonb, status: planned|scripted|voiced|rendered|ready|failed)`, `videos(lesson_id, r2_key, duration, thumb_key)`, `user_prefs(categories[], level, daily_count)`, `views(video_id, watched_pct, liked, saved)`, `quiz_attempts`, `concept_mastery(concept_id, level, next_review_at)`.

The lesson `status` field makes the pipeline **resumable and idempotent**: each step only picks up rows in the previous state.

## Web app UX
- **Feed:** full-screen vertical videos with snap scrolling. Category chips at the top (All · AI · Stocks · …). A "Today" / "Review" toggle. A card says when you've finished today's videos.
- **On each video:** like, save, sources, "Ask Athena", and a quiz sheet that slides up when the video ends.
- **Library:** saved videos, a concept map (with mastery colors), and a streak.
- **Mobile-first PWA**, so you can install it to your phone's home screen.

## Build phases
1. **Scaffold:** monorepo, shared schemas, Drizzle schema, Supabase project, `.env.example` (ANTHROPIC_API_KEY, SUPABASE_*, R2_*, FOOTBALL_DATA_KEY, FRED_KEY).
2. **Ingest + rank:** RSS and API sources, dedupe, clustering, scoring. `pnpm pipeline ingest && pnpm pipeline rank` prints the top stories per category.
3. **Lesson writer:** planner and writer prompts, the concept graph and the validate-retry loop. Outputs `lessons/*.json` you can read.
4. **Video:** Remotion scene components, the Kokoro voice step, and one-command rendering of a lesson JSON to MP4. Check in Remotion Studio.
5. **Web app:** feed, categories, quiz, save, onboarding; reads from Supabase and R2.
6. **Cloud:** GitHub Actions daily cron (matrix render), R2 upload, retention cleanup, Vercel deploy.
7. **Learning loop:** mastery updates, spaced-review videos, Ask Athena, weekly recap, difficulty adaptation.

## Verification
- `pnpm pipeline ingest --category ai` → articles in the DB. `rank` → a sensible top 5.
- `pnpm pipeline write --story <id>` → JSON that passes zod; read it to check it teaches from zero first and then mentions the news.
- `pnpm pipeline render --lesson <id>` → MP4 plays locally: voice in sync, captions readable at 720×1280, file under about 4 MB, under 2 minutes.
- `pnpm --filter web dev` → open in the browser pane at mobile size: swipe, autoplay, change categories, answer a quiz, and confirm mastery updates.
- Trigger the GitHub workflow manually (`workflow_dispatch`) → videos appear in R2 and in the deployed feed the next morning.
