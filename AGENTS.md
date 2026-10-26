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
- NCERT Deep Scan: /api/ncert-scan fetches chapters online (Perplexity Search → Firecrawl scrape, both Lovable-managed gateway connectors, keys server-only), skips PDF/index pages, Gemini verifies extracted lines and flagged ones are dropped, results cache in Supabase ncert_snippets (anon read, service-role write). Snippet/diagram cards join the local SRS deck via addCards (never graded on insert); diagram flashcards stream from /api/ncert-diagram (gpt-image default) and store data URLs locally — chats and cards stay on-device per user choice.
- Sarvam's first-call SDK script stays in scripts/ and is not imported into the app; run only after user key confirmation so setup does not spend credits or replace the existing tutor/voice.
- Sarvam request and stream cancellation use the shared realm-safe cancellation predicate; stream cleanup observes reader cancellation rejections so normal stop/disconnect never becomes an unhandled provider error.
- Optional Sarvam speech uses its own server endpoint (Sarvam streaming TTS, re-emitted progressively as whole-sample events) and device engine/speaker choice, adapting explicit linear16 24 kHz audio to the shared speech queue; UI and endpoint share one validated persona catalog to prevent mismatches, migrate legacy device speaker preferences to their corresponding personas, preserve Gemini/live selections, and keep provider credentials server-only; a chunk holding no letter or digit is skipped before the request (the provider refuses such text), and only a credits/access refusal moves the call to the backup voice.
- Voice page defaults to continuous LiveVoicePage on its existing relay; Gemini voices mute live audio, swap the mic for a generated silent track while speaking, and play through one shared speaker per call. Serialize mic swaps and recovery using the latest gate intent so cancellation cannot leave a silent sender; silent RTP does not prove control-heartbeat health or explain a call's closure. Their speech queue merges waiting thoughts into one look-ahead request read eagerly, retries busy/network failures before audio with bounded backoff, cuts runaway audio without stopping, and stops only on terminal failures; no paid automatic reconnect.
- Live Indian-accent delivery and fallback speech share browser-safe teacher delivery guidance; keep voice identity and provider selection separate from style so prompting never masquerades as cloning.
- Admin device recovery exports only app memory/settings, validates and merges restores, clears only unchanged backed-up text rows; never resets file entries, accounts or AI pause.
- Admin documents keep extracted text by default; originals upload only when retained or needed, temp uploads always cleaned (limits Cloud growth).
- Voice quizzes own a scrollable reading area and separate conversation view; call controls stay outside to prevent overlap.
- Voice/audio and attachment creation settings stay locked during calls; validated teaching toggles and backend model preferences update through app.settings on the same session without hangups or paid replacements.
- Quiz ON during a text answer queues one start until successful readiness; OFF cancels the queue, while Search applies to subsequent requests.
- Sidebar collapse stays inside DoubtSidebar with a visible reopen control; composer uses fixed-size AI Elements buttons and a two-track footer to prevent overlap.
- SnapSolve stays at repo root, Python under legacy/, for correct hosting detection.
- Separate hosting configs; encrypt Vercel secrets, redeploy after moves. Vercel live voice uses the published Lovable relay; serverless cannot hold calls.
- Sidebar Settings shares device appearance/quiz preferences; timer overrides keep the cached admin default; physical numpad maps to A–D and dialogs block shortcuts to prevent accidental answers.
- PCB outlines are per-chapter admin memory (Botany/Zoology mapped to Biology, original branch and provenance kept); never claim official syllabus verification.
- Chat uses `/api/chat` (Claude/Gateway Messages, streamed), keeping keys/prompts server-side. Stop is a 499 cancellation, not a crash.
- Doubts use browser threads at `/doubt/$threadId`; downscale photos, throttle streamed renders, and await IndexedDB PDF writes before saving pointers to avoid jank and broken backups.
- Prompt forms disable controls until hydration and use native dialog submission so question text never leaks into URLs.
- Assistant text normalizes inline equation delimiters before markdown, preserves display equations/code, and scopes KaTeX sizing to the surrounding text.
- Saved practice extracts answers/revision cards and grades locally via shared SRS, never the tutor; stable card-ID queues/completed IDs prevent due-date skips on reload; new material joins next session.
- Study backup exports only browser study data + embedded attachments with validated non-destructive imports; source ZIPs/Cloud exports are separate.
- Tutor models use a shared server-validated catalog; terminal AI pauses are persisted server-side and never reset by public browser requests.
- Mermaid loads lazily via the diagram adapter only when rendering; its init failures must never block chat or practice.
- Agent memory lives in Cloud table memory_items, editable only by admins (has_role); /api/chat ranks active chapter outlines against bounded recent context, excludes unmatched chapters, injects size-capped memory so follow-ups keep context.
- Chat exports Obsidian markdown/zipped notes; attachments stay placeholders, never data URLs. Voice .md: Obsidian callouts/folds, Word/PDF plain.
- `web_search` (Perplexity + Parallel, URL-deduped) exists only when the client sends `search: true`; quiz mode gets a stricter search note.
- Dictation records 16 kHz WAV and transcribes only via `/api/transcribe` (SSE forwarded unchanged, shared parser, no timeout retries); text lands in composer for review; voice/dictation share noise-filter settings and transcript cleanup.
- Student links use Parallel extraction with Firecrawl fallback and explicit empty/truncated results, so answers never claim to have read an unavailable page.
- Browser quota failures keep prior threads and report a save failure; media cleanup swaps attachments for markers, clearing IndexedDB only after thread cleanup (answers/cards kept).
- Admin link reads reuse the bounded student reader; files are content-addressed and memory saves dedupe by content/normalized URL.
- Admin imports share parsers/Sheets auth; MIME puts linked PDFs in PDF view. Drive needs authorization; PYQs require sourced evidence. PPTX reads text only; scanned PDFs use explicit lazy browser OCR without silent truncation. Admin/quiz share a device label preference; submissions stay A–D to preserve grading.
- Voice: Claude delegation, one-use quiz IDs; question/options follow observed playback (manual fallback); stale answers ignored; timer drafts commit on blur/Enter. Relay capabilities: early prepare (pause check + Gateway socket, no session before offer), speed as a pace instruction, typed chat as untrusted student text on delegation path. Screen-off holds the call via relay heartbeats up to BACKGROUND_GRACE_MS; no paid auto-reconnect. History tracking no-ops without database imports; relay keeps confirmed usage/cleanup.
- Answer-check council (`/api/verify`, NDJSON): Gemini (grounded facts) and GPT (maths) review, debate only when verdicts differ, Claude rules. Tutor answer never rewritten, quiz turns never checked, results cached per device only; council ids live only in `COUNCIL_MODELS`, keeping the frozen tutor catalog untouched.
- `/api/vision-read` transcribes doubt photos before the tutor inside `<photo-reading>` tags (folded in UI, stripped from titles/search); failure or Skip sends the photo unchanged.
- Subdirectories have their own `AGENTS.md`; read them before changing files there.

# Source origin
- The web app in this repository was imported from GitHub (MrAnujBabu/Anuj-sarthi-deeplearning-ai) into this Lovable project; treat that repo as upstream source and this project as the live working copy.

## Preserved upstream architecture
- Voice delivery styles share browser-safe definitions and live-delivery mapping; the device voice selector drives live startup and read-aloud requests, preserving startup-only audio changes and existing model choices so both speech paths honor the same selection. Reference audio supplies general delivery traits only, never performer identity.
- Vedantu daily online checks run in GitHub Actions with encrypted step-scoped secrets and a database lease/status row only; never persist fetched course/class/test/note content or use browser timers/database HTTP cron. Manual Sync now returns online data directly.
- Admin device recovery exports only app memory/settings, validates and merges restores, clears only unchanged backed-up text rows; never resets file entries, accounts or AI pause.
- Admin documents keep extracted text by default; originals upload only when retained or needed, temp uploads always cleaned (limits Cloud growth).
- Voice quizzes own a scrollable reading area and separate conversation view; call controls stay outside to prevent overlap.
- Voice/audio and attachment creation settings stay locked during calls; validated teaching toggles and backend model preferences update through app.settings on the same session without hangups or paid replacements.
- Quiz ON during a text answer queues one start until successful readiness; OFF cancels the queue, while Search applies to subsequent requests.
- Sidebar collapse stays inside DoubtSidebar with a visible reopen control; composer uses fixed-size AI Elements buttons and a two-track footer to prevent overlap.
- SnapSolve stays at repo root, Python under legacy/, for correct hosting detection.
- Separate hosting configs; encrypt Vercel secrets, redeploy after moves. Vercel live voice uses the published Lovable relay; serverless cannot hold calls.
- Sidebar Settings shares device appearance/quiz preferences; timer overrides keep the cached admin default; physical numpad maps to A–D and dialogs block shortcuts to prevent accidental answers.
- PCB outlines are per-chapter admin memory (Botany/Zoology mapped to Biology, original branch and provenance kept); never claim official syllabus verification.
- Chat uses `/api/chat` (Claude/Gateway Messages, streamed), keeping keys/prompts server-side. Stop is a 499 cancellation, not a crash.
- Doubts use browser threads at `/doubt/$threadId`; downscale photos, throttle streamed renders, and await IndexedDB PDF writes before saving pointers to avoid jank and broken backups.
- Prompt forms disable controls until hydration and use native dialog submission so question text never leaks into URLs.
- Assistant text normalizes inline equation delimiters before markdown, preserves display equations/code, and scopes KaTeX sizing to the surrounding text.
- Saved practice extracts answers/revision cards and grades locally via shared SRS, never the tutor; stable card-ID queues/completed IDs prevent due-date skips on reload; new material joins next session.
- Study backup exports only browser study data + embedded attachments with validated non-destructive imports; source ZIPs/Cloud exports are separate.
- Tutor models use a shared server-validated catalog; terminal AI pauses are persisted server-side and never reset by public browser requests.
- Mermaid loads lazily via the diagram adapter only when rendering; its init failures must never block chat or practice.
- Agent memory lives in Cloud table memory_items, editable only by admins (has_role); /api/chat ranks active chapter outlines against bounded recent context, excludes unmatched chapters, injects size-capped memory so follow-ups keep context.
- Chat exports Obsidian markdown/zipped notes; attachments stay placeholders, never data URLs. Voice .md: Obsidian callouts/folds, Word/PDF plain.
- `web_search` (Perplexity + Parallel, URL-deduped) exists only when the client sends `search: true`; quiz mode gets a stricter search note.
- Dictation records 16 kHz WAV and transcribes only via `/api/transcribe` (SSE forwarded unchanged, shared parser, no timeout retries); text lands in composer for review; voice/dictation share noise-filter settings and transcript cleanup.
- Student links use Parallel extraction with Firecrawl fallback and explicit empty/truncated results, so answers never claim to have read an unavailable page.
- Browser quota failures keep prior threads and report a save failure; media cleanup swaps attachments for markers, clearing IndexedDB only after thread cleanup (answers/cards kept).
- Admin link reads reuse the bounded student reader; files are content-addressed and memory saves dedupe by content/normalized URL.
- Admin imports share parsers/Sheets auth; MIME puts linked PDFs in PDF view. Drive needs authorization; PYQs require sourced evidence. PPTX reads text only; scanned PDFs use explicit lazy browser OCR without silent truncation. Admin/quiz share a device label preference; submissions stay A–D to preserve grading.
- Voice: Claude delegation, one-use quiz IDs; question/options follow observed playback (manual fallback); stale answers ignored; timer drafts commit on blur/Enter. Relay capabilities: early prepare (pause check + Gateway socket, no session before offer), speed as a pace instruction, typed chat as untrusted student text on delegation path. Screen-off holds the call via relay heartbeats up to BACKGROUND_GRACE_MS; no paid auto-reconnect. History tracking no-ops without database imports; relay keeps confirmed usage/cleanup.
- Answer-check council (`/api/verify`, NDJSON): Gemini (grounded facts) and GPT (maths) review, debate only when verdicts differ, Claude rules. Tutor answer never rewritten, quiz turns never checked, results cached per device only; council ids live only in `COUNCIL_MODELS`, keeping the frozen tutor catalog untouched.
- `/api/vision-read` transcribes doubt photos before the tutor inside `<photo-reading>` tags (folded in UI, stripped from titles/search); failure or Skip sends the photo unchanged.
- Subdirectories have their own `AGENTS.md`; read them before changing files there.
- Mera Batch: `/batch` uses the server-only `online.server.ts` authenticated Vedantu reader, bounded schedule/upcoming-test lists and on-demand notes, with no database content reads/writes; existing mirror rows remain untouched. AITS still uses `sheets.server.ts`; chat and live voice share one admin-verified batch snapshot plus `batch_schedule`/`batch_class_notes` tools over a five-minute cached online overview (notes and vision-read whiteboard PDFs only for the student's own listed classes; PDF readings cached in worker memory only); voice sends the session token once per call and the relay drops it after verification, so outages or denials never break chat or calls. Lectures (timestamped smart notes, Vedantu-hosted slide images, transcript-data topic outline) come from `fetchOnlineLecture` with a 30-minute worker-memory cache and render in the in-app LectureViewer; Ved AI has no stable HTTP API (live-class socket only), so it is not integrated.
