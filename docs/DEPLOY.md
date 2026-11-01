# Deploying Athena (free tiers)

Everything below is free. The only paid piece is Claude Haiku for writing lessons, and the
daily job skips that step (and makes no new lessons) until you add `ANTHROPIC_API_KEY`.

| Piece | Service | Free tier used |
|---|---|---|
| Code + daily job | GitHub + GitHub Actions | Unlimited minutes on a **public** repo (2,000/month private) |
| Database | Supabase Postgres | 500 MB; pauses after 7 idle days, which the daily job prevents |
| Video files | Supabase Storage | 1 GB → keep `RETENTION_DAYS=7` (~5 MB × lessons × 7 days) |
| Web app | Vercel Hobby | Personal, non-commercial use |

You'll need accounts on GitHub, Supabase and Vercel (sign in to the last two with GitHub).
Keys and passwords go into those dashboards, never into the repo: `.env` is gitignored.

## 1. Put the code on GitHub

```bash
cd ~/athena
git init && git add -A && git commit -m "Athena"
gh repo create athena --public --source . --push
```

A public repo gets unlimited Actions minutes. Nothing secret is committed: `.env`, `.data/`
and `out/` are ignored. Use `--private` instead if you prefer; rendering ~10 lessons a day
fits in the 2,000 free minutes.

## 2. Create the Supabase project

1. supabase.com → **New project**. Pick the region closest to you (e.g. Mumbai), set a database password and keep it.
2. **Connect** (top bar) → **Transaction pooler** → copy the URI (port 6543) and put your password in it. This is `DATABASE_URL`.
3. **Project Settings → API**: copy the **Project URL** (`SUPABASE_URL`) and the **service_role** key (`SUPABASE_SERVICE_ROLE_KEY`). The service role key is an admin key: it only goes in `.env` and GitHub secrets, never in Vercel or the browser.
4. **Storage → New bucket** named `videos`, with **Public bucket** on, so the app can stream the videos.

## 3. Check it from your Mac

Add to `.env`:

```
DATABASE_URL=postgresql://postgres.xxxx:PASSWORD@aws-0-ap-south-1.pooler.supabase.com:6543/postgres
STORAGE_DRIVER=supabase
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=...
ATHENA_PASSCODE=pick-a-long-passphrase
```

```bash
pnpm pipeline doctor
```

Everything should be ✅ except Claude (until you add a key). The first run creates the tables.
Lessons made locally live in the local database and don't move to Supabase; the cloud starts fresh.

## 4. Add GitHub secrets

```bash
gh secret set DATABASE_URL
gh secret set SUPABASE_URL
gh secret set SUPABASE_SERVICE_ROLE_KEY
gh variable set STORAGE_DRIVER --body supabase
gh variable set RETENTION_DAYS --body 7
# later, when you're ready to pay for lessons:
gh secret set ANTHROPIC_API_KEY
```

Each `gh secret set` asks you to paste the value, so it never lands in your shell history.

## 5. Deploy the web app on Vercel

1. vercel.com → **Add New → Project** → import the `athena` repo.
2. **Root Directory**: `apps/web` (Vercel detects Next.js and the pnpm workspace).
3. **Environment variables**: `DATABASE_URL` (same pooler URI) and `ATHENA_PASSCODE`.
4. **Deploy**. Open the URL, enter your passcode, and on your phone choose **Add to Home Screen**.

## 6. Run the daily job once by hand

```bash
gh workflow run daily.yml
gh run watch
```

After that it runs every day at 05:00 IST. Without `ANTHROPIC_API_KEY` it fetches and ranks
news and stops there; with a key it plans, writes, narrates, renders and publishes ~10 lessons.
