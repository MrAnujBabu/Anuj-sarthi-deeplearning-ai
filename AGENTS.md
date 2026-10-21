<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Architecture
- Admin device recovery exports only app memory/settings, validates and merges restores, clears only unchanged backed-up text rows; never resets file entries, accounts or AI pause.
- Admin documents keep extracted text by default; originals upload only when retained or needed, temp uploads always cleaned (limits Cloud growth).
- Active Voice quizzes own a scrollable reading area and separate conversation view; call controls stay outside to prevent overlap.
- Sidebar collapse stays inside DoubtSidebar with a persistent visible reopen control; composer controls use fixed-size AI Elements buttons and a two-track footer to prevent overlap.
- SnapSolve stays at repo root, Python under legacy/, for correct hosting detection.
- Separate hosting configs; encrypt Vercel secrets and redeploy after moves. Vercel live voice uses the published Lovable relay; serverless cannot hold calls.
- Sidebar Settings shares device appearance/quiz preferences; timer overrides keep the cached admin default; physical numpad maps to A–D and dialogs block shortcuts to prevent accidental answers.
- PCB outlines are per-chapter admin memory (Botany/Zoology mapped to Biology, original branch and provenance kept); never claim official syllabus verification.
- Chat uses `/api/chat` (Claude/Gateway Messages, streamed), keeping keys/prompts server-side. Stop is a 499 cancellation, not a crash.
- Doubts use browser threads at `/doubt/$threadId`; downscale photos, throttle streamed renders, and await IndexedDB PDF writes before saving pointers to avoid jank and broken backups.
- Prompt forms disable controls until hydration and use native dialog submission so question text never leaks into URLs.
- Assistant text normalizes inline equation delimiters before markdown rendering, preserves display equations and code, and uses scoped KaTeX sizing so equations follow the surrounding text.
- Saved practice extracts answers/revision cards and grades locally via shared SRS, never the tutor; stable card-ID queues/completed IDs prevent due-date skips on reload; new material joins next session.
- Study backup exports only browser study data and embedded attachments, with validated non-destructive imports; source ZIPs and Cloud exports are separate backups.
- Tutor models use a shared server-validated catalog; terminal AI pauses are persisted server-side and never reset by public browser requests.
- Mermaid loads lazily via the diagram adapter only when rendering; its init failures must never block chat or practice.
- Agent memory lives in Cloud table memory_items, editable only by admins (has_role); /api/chat ranks active chapter outlines against bounded recent conversation context, excludes unmatched chapters and injects size-capped memory so follow-ups retain context.
- Chat exports Obsidian markdown and zipped notes; attachments remain placeholders, never data URLs.
- `web_search` (Perplexity + Parallel, URL-deduped) exists only when the client sends `search: true`; quiz mode gets a stricter search note.
- Dictation records 16 kHz WAV and transcribes only via `/api/transcribe` (SSE forwarded unchanged, shared parser, no timeout retries); text lands in the composer for review. Voice/dictation share noise-filter mic settings and transcript cleanup.
- Student links use Parallel extraction with Firecrawl fallback and explicit empty/truncated results, so answers never claim to have read an unavailable page.
- Browser quota failures keep prior threads and report a save failure; media cleanup swaps attachments for markers and clears IndexedDB only after thread cleanup, keeping answers and cards.
- Admin link reads reuse the bounded student reader; files are content-addressed and memory saves dedupe by content/normalized URL.
- Admin imports share parsers/Sheets auth; MIME puts linked PDFs in PDF view. Drive needs authorization; PYQs require sourced evidence. PPTX reads text only; scanned PDFs use explicit lazy browser OCR without silent truncation. Admin/quiz share a device label preference; submissions stay A–D to preserve grading.
- Voice uses Claude delegation and one-use quiz IDs; atomic question/options follow observed playback (manual fallback). Ignore stale answers; timer drafts commit on blur/Enter. Real heartbeats only, no paid auto-reconnect; OS suspension can end calls. History tracking is a no-op without database imports; relay retains confirmed usage and cleanup.
- Answer-check council (`/api/verify`, NDJSON): Gemini (grounded facts) and GPT (maths) review, debate only when verdicts differ, Claude rules. Tutor answer never rewritten, quiz turns never checked, results cached per device only; council ids live only in `COUNCIL_MODELS` so the frozen tutor catalog stays untouched.
- `/api/vision-read` transcribes doubt photos before the tutor inside `<photo-reading>` tags (folded in UI, stripped from titles/search); failure or Skip sends the photo unchanged.
- Subdirectories have their own `AGENTS.md`; read them before changing files there.
