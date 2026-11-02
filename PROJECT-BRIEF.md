# SnapSolve — Project Brief (paste anywhere)

Use this block as a prompt whenever you want another AI (or a teammate) to understand
this project in one shot. It contains no secrets.

---

**SnapSolve** is an AI-powered NEET 2027 "snap-to-solve" doubt app for Indian medical-entrance aspirants.

## What the product does
- A student snaps a photo (or uploads a PDF, or pastes a link) of an MCQ, diagram or formula.
- An AI tutor — **Anthropic Claude** — reads it and answers like an expert NEET teacher:
  NCERT-grounded, step-by-step derivation, correct option + why others are wrong,
  NEET tip, memory trick, and a practice MCQ.
- Each doubt is its own conversation with follow-up chat.
- **Quiz mode**: the tutor acts as an examiner — one NEET MCQ at a time, tap-to-answer
  A/B/C/D checkbox cards, optional per-question auto-skip timer, hints, skip, scoring,
  and Leitner spaced-repetition revision cards generated from every question.
- **Saved practice**: when AI credits are exhausted, students keep revising saved
  questions, answers and revision cards with **zero new AI calls** (offline local engine).
- **Live search mode**: optional Perplexity + Parallel web search inside chat.
- **Obsidian export**: every doubt exports as an Obsidian-ready markdown note
  (YAML frontmatter, attachments embedded); bulk export ships a ZIP vault.

## Who runs it
- **AI brain**: Anthropic Claude models, called only from the server route `/api/chat`
  through the **Lovable AI Gateway**. AI usage is metered against the **Lovable workspace
  credit balance** — there is no separate Anthropic bill or key in the app.
- **Backend**: **Lovable Cloud** (managed Supabase) — auth (Sign in with Lovable / Google),
  Postgres tables (`memory_items`, `user_roles`, `agent_settings`) with row-level security,
  and a private `agent-memory` storage bucket. No service keys are exposed to the browser.
- **Research tools**: Lovable App Connectors — Firecrawl (page/PDF reading),
  Parallel (NCERT-restricted search + extract), Perplexity (NEET previous-year search),
  GitHub API (repo sync) — all called through the Lovable connector gateway from server code.
- **Student data in the browser**: doubt threads, photos and PDFs live in
  localStorage + IndexedDB; a study backup exports/imports them as JSON.

## Admin
An `/admin` page (admin-role only) stores the tutor's "brain": NCERT/NTA syllabus chapter
outlines (84 PCB chapters imported), mistake patterns, weak topics, good/bad habits,
files and links — ranked into the tutor's prompt so answers follow the student's own plan.
Admin also sets the quiz timer, default mode and agent role instructions.

## Tech shape
- TanStack Start v1 (React 19, Vite 7) TypeScript SPA/SSR, Tailwind CSS v4,
  Claude-inspired warm-neutral design (Fraunces headings, Work Sans body).
- The web app is the repository root (`legacy/` holds an older Python prototype).
- `vite.vercel.config.ts` + `vercel.json` pin a Vercel-ready build for external hosting;
  the Lovable-hosted deployment is the primary one.

## When moving workspaces / rebuilding
- Reconnect the four App Connectors (Firecrawl, GitHub API, Parallel, Perplexity).
- Cloud data lives in the workspace's Lovable Cloud instance; use the Cloud database
  export ZIP for a data backup (it does not contain app code — the repo is the code backup).
- Rebuild prompt: "Rebuild SnapSolve per PROJECT-MANUAL.md: NEET 2027 snap-to-solve doubt
  app, Claude via Lovable AI Gateway on workspace credits, Lovable Cloud (Supabase) backend
  with RLS, browser-stored doubt threads, admin memory at /admin, quiz mode with
  spaced repetition, Obsidian export."

## Continue-from-here prompt (paste in a new Lovable project)
> This is SnapSolve (NEET 2027 doubt + quiz app) imported from GitHub repo MrAnujBabu/Anuj-sarthi-deeplearning-ai (app at repo root). Stack: TanStack Start, Claude via Lovable AI Gateway (workspace credits), Lovable Cloud backend (table memory_items + user_roles, private bucket agent-memory). Please: 1) enable Lovable Cloud and recreate the schema from supabase/migrations, 2) restore my database export, 3) re-upload agent-memory files, 4) connect Firecrawl, Parallel, Perplexity and GitHub API, 5) recreate my admin account and set the admin role, 6) verify Claude models in this workspace, then run a live tutor + quiz + PDF test. Read AGENTS.md, PROJECT-MANUAL.md and roadmap.md before changing anything.

## Backing up Lovable Cloud
- Database: Cloud → Database → Manage → Settings → Export project data → Database → Export (includes accounts + data; one per 24h).
- Storage files (admin memory uploads) are NOT in that export — download from Cloud → Storage.
- Doubts/quiz history live in each browser — use "Export all (.md / Obsidian)" and the study backup.
- Secrets/connectors are never exported — reconnect them in the new workspace.
