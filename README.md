# Athena

Your daily AI learning assistant. Every morning Athena reads the top stories in the categories you follow, picks one concept per story, and turns it into a short vertical video that **explains the idea at your level, then connects it to today's news**. Alongside the news, each topic gets one lesson a day from a classic book (see `config/curriculum.ts`). Scroll through them in the web app, take the quiz, ask follow-ups, and Athena remembers what you already know.

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the full design and [docs/DEPLOY.md](docs/DEPLOY.md) to put it online for free.

## Layout
```
config/            categories, model choices (Haiku by default), prompts
packages/shared    Lesson / Scene / Visual zod schemas (LLM ↔ voice ↔ video contract)
packages/db        Drizzle schema for Supabase Postgres
packages/llm       Claude client: batches, prompt caching, validate-retry, budget guard
packages/storage   R2 or Supabase Storage behind one interface
packages/tts       Kokoro-82M narration (free, local CPU)
packages/video     Remotion compositions → 720×1280 MP4
apps/pipeline      daily CLI: ingest → rank → plan → write → voice → render → publish
apps/web           Next.js app: swipe feed, topics, quiz, library
.github/workflows  daily cron on GitHub Actions
```

## Free-tier stack
| Piece | Service | Cost |
|---|---|---|
| Lesson writing, Ask Athena | Claude Haiku (+ Batch API, prompt caching) | only paid item, capped by `DAILY_TOKEN_BUDGET` |
| Voice | Kokoro-82M via kokoro-js | free |
| Video | Remotion (free for individuals) | free |
| DB + auth | Supabase free tier | free |
| Video files | Supabase Storage (1 GB) or Cloudflare R2 (10 GB) | free |
| Daily job | GitHub Actions (unlimited on public repos) | free |
| Web app | Vercel Hobby | free |

## Getting started
```bash
npm install -g pnpm@9.15.0 && pnpm install
cp .env.example .env   # optional for now: without DATABASE_URL a local PGlite DB in .data/ is used
pnpm pipeline ingest   # fetch today's articles
pnpm pipeline rank     # cluster into stories, print top 5 per category
pnpm pipeline plan     # Haiku picks one concept per story (needs ANTHROPIC_API_KEY)
pnpm pipeline write    # Haiku writes lesson scripts → out/lessons/<date>/*.json
                       # --sync skips the Batch API, --dry-run prints prompts without calling Claude
pnpm pipeline voice    # Kokoro narration per scene → out/media/ (first run downloads the ~90 MB model)
pnpm pipeline render   # Remotion → out/videos/<date>/*.mp4 + .jpg thumbnails (first run downloads Chrome)
pnpm pipeline publish  # upload to storage (STORAGE_DRIVER) and delete expired videos
pnpm pipeline doctor   # check config, database, storage and feeds before deploying
pnpm studio            # preview/edit the video design live in Remotion Studio
```

## Local database caveat
Without `DATABASE_URL`, both the pipeline and the web app use the embedded PGlite database in
`.data/`. PGlite allows only one process at a time, so **stop the web app while the pipeline
runs**. This goes away once `DATABASE_URL` points at Supabase (phase 6).

## Running without API credits
Set `LLM_MODE=offline` in `.env`. `plan` and `write` then don't call Claude: each request is
saved as `out/llm/<id>.request.md` (instructions, input and the JSON schema). Save the answer as
`out/llm/<id>.json` (written by hand or pasted from any Claude chat) and re-run the step. It
is checked against the schema exactly like a live response.

## Build phases
1. ✅ Scaffold
2. ✅ Ingest + rank
3. ✅ Lesson writer (tested offline; first live Haiku run pending)
4. ✅ Voice + video
5. ✅ Web app (`pnpm web` → http://localhost:3030)
6. ✅ Cloud: publish to storage, passcode login, daily GitHub job (see docs/DEPLOY.md)
7. Learning loop (mastery, spaced review, Ask Athena, weekly recap)
