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
- Admin device recovery exports only application memory/settings, validates reselected backups, merges restores, and clears only unchanged backed-up text-only rows; preserves original-file entries, accounts and AI pause to prevent destructive resets.
- Admin document retention defaults to extracted text only; originals are uploaded only when retained or needed for reading, with temporary uploads cleaned on failure/success to avoid needless Cloud growth.
- Mount TooltipProvider around the root outlet for portalled controls.
- Active Voice quizzes own a scrollable reading area and separate conversation view; call controls stay outside to prevent overlap.
- Sidebar collapse stays inside DoubtSidebar with a persistent visible reopen control; composer controls use fixed-size AI Elements buttons and a two-track footer to prevent overlap.
- SnapSolve stays at repo root, Python under legacy/, for correct hosting detection.
- Separate hosting configs; encrypt Vercel secrets and redeploy after moves. Vercel live voice uses the published Lovable relay; serverless cannot hold calls.
- Sidebar Settings shares device appearance/quiz preferences; timer overrides keep the cached admin default; physical numpad maps to A–D and dialogs block shortcuts to prevent accidental answers.
- PCB outlines are per-chapter admin memory (Botany/Zoology mapped to Biology, original branch and provenance kept); never claim official syllabus verification.
- Chat uses `/api/chat` (Claude/Gateway Messages, streamed), keeping keys/prompts server-side. Shared cancellation detection treats Stop as 499 before streaming, not a crash; header wrappers handle pending reads immediately.
- Doubts use browser threads at `/doubt/$threadId`; downscale photos, throttle streamed renders, and await IndexedDB PDF writes before saving pointers to avoid jank and broken backups.
- Prompt forms disable controls until hydration and use native dialog submission as a no-navigation fallback, preventing question text from leaking into URLs before React handles submissions.
- Assistant text normalizes inline equation delimiters before markdown rendering, preserves display equations and code, and uses scoped KaTeX sizing so equations follow the surrounding text.
- Saved practice extracts answers/revision cards and grades locally via shared SRS, never the tutor; stable card-ID queues/completed IDs prevent due-date skips on reload; new material joins next session.
- Study backup exports only browser study data and embedded attachments, with validated non-destructive imports; source ZIPs and Cloud exports are separate backups.
- Tutor models use a shared server-validated catalog; terminal AI pauses are persisted server-side and never reset by public browser requests.
- Load Mermaid through the lazy diagram adapter only when rendering a diagram; graph dependency initialization failures must not prevent chat or practice routes from opening.
- Agent memory lives in Cloud table memory_items, editable only by admins (has_role); /api/chat ranks active chapter outlines against bounded recent conversation context, excludes unmatched chapters and injects size-capped memory so follow-ups retain context.
- Chat exports Obsidian markdown and zipped notes; attachments remain placeholders, never data URLs.
- Web search: `createAgentTools({ webSearch })` adds a `web_search` tool (Perplexity + Parallel in parallel, deduped by URL) only when the client sends `search: true`; /api/chat appends a search instruction to the system prompt and disables it in quiz mode.
- Dictation records 16 kHz WAV and transcribes only via `/api/transcribe` (SSE forwarded unchanged, shared parser, no timeout retries); text lands in the composer for review, keeping the key server-side.
- Student links use Parallel full-content extraction with Firecrawl fallback and explicit empty/truncated results; prevents answers falsely claiming to have read an unavailable document.
- Browser quota failures preserve prior threads and return a save failure; media cleanup replaces attachments/extracted documents with markers and clears IndexedDB only after thread cleanup, keeping answers and revision cards intact.
- Admin link reads reuse the bounded student document reader; file paths are content-addressed to avoid repeat uploads, and memory saves compare content/normalized URLs before inserting.
- Admin imports share parsers/Sheets auth; MIME puts linked PDFs in PDF view. Drive needs authorization; PYQs require sourced evidence. PPTX reads text only; scanned PDFs use explicit lazy browser OCR without silent truncation. Admin/quiz share a device label preference; submissions stay A–D to preserve grading.
- Voice uses Claude delegation and one-use quiz IDs; atomic question/options follow observed playback (manual fallback). Ignore stale answers; timer drafts commit on blur/Enter. Real heartbeats only, no paid auto-reconnect; OS suspension can end calls. History tracking is a no-op without database imports; relay retains confirmed usage and cleanup.
- Answer-check council: `/api/verify` streams NDJSON; Gemini (Google-grounded facts) and GPT (maths) review independently, debate once only when verdicts differ, and Claude (the tutor model) rules on objections. The tutor's answer is never rewritten, quiz turns are never checked, results are cached per device (never in the database), and council model ids live only in `COUNCIL_MODELS` (src/lib/verify.ts) so the frozen tutor catalog stays untouched.
- Photo reading: doubt photos go to `/api/vision-read` before the tutor; the transcription is prepended inside `<photo-reading>` tags (folded in the UI, stripped from titles and search queries), and failure or Skip sends the photo unchanged so the tutor still reads it.
