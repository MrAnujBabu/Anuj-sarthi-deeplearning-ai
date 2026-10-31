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
- Sarvam prefers its linked gateway connector; direct keys only for hosts without it. Never send connection keys directly to providers.
- Sarvam SDK smoke scripts stay outside app imports; run only after key confirmation, never replace tutor/voice.
- Sarvam request and stream cancellation use the shared realm-safe cancellation predicate; stream cleanup observes reader cancellation rejections so normal stop/disconnect never becomes an unhandled provider error.
- Browser-safe voice-table shares prompts/explicit-row parsing; preserve completed caption rows and legacy comparison/Match compatibility across subjects/column counts.
- LiveVoicePage stays continuous on its relay. Gemini mutes live audio, substitutes a silent mic while speaking and uses one speaker. Serialize mic recovery by latest intent; cancellation restores the sender. Silent RTP proves neither heartbeat health nor closure cause. Merge waiting thoughts into one eager look-ahead; bounded pre-audio busy/network retries, cut runaway audio without ending calls, stop only on terminal errors; no paid auto-reconnect.
- Live Indian-accent delivery and fallback speech share browser-safe teacher delivery guidance; keep voice identity and provider selection separate from style so prompting never masquerades as cloning.
- Admin device recovery exports only app memory/settings, validates and merges restores, clears only unchanged backed-up text rows; never resets file entries, accounts or AI pause.
- Admin documents keep extracted text by default; originals upload only when retained or needed, temp uploads always cleaned (limits Cloud growth).
- Voice quizzes own a scrollable reading area and separate conversation view; call controls stay outside to prevent overlap.
- Voice/audio and attachment creation settings stay locked during calls; validated teaching toggles and backend model preferences update through app.settings on the same session without hangups or paid replacements.
- Quiz ON during a text answer queues one start until successful readiness; OFF cancels the queue, while Search applies to subsequent requests. Text quiz prose becomes answer cards only after generation finishes, with readiness derived in quiz-options; never carry the preceding user answer into the next question's selection, to avoid presenting locked or preselected new choices.
- Sidebar collapse stays inside DoubtSidebar with a visible reopen control; composer uses fixed-size AI Elements buttons and a two-track footer to prevent overlap.
- SnapSolve stays at repo root, Python under legacy/, for correct hosting detection.
- Separate hosting configs; encrypt Vercel secrets, redeploy after moves. Vercel live voice uses the published Lovable relay; serverless cannot hold calls.
- Sidebar Settings shares device appearance/quiz preferences; timer overrides keep the cached admin default; physical numpad maps to A–D and dialogs block shortcuts to prevent accidental answers.
- PCB outlines are per-chapter admin memory (Botany/Zoology mapped to Biology, original branch and provenance kept); never claim official syllabus verification.
- Device interpret-checkpoint resends finished Hindi as `resume`; server skips saved batches/reuses briefs. Only busy/network errors auto-continue (bounded), so stops never repay finished work.
- Chat uses `/api/chat` (Claude/Gateway Messages, streamed), keeping keys/prompts server-side. Stop is a 499 cancellation, not a crash.
- Doubts use browser threads at `/doubt/$threadId`; downscale photos, throttle streamed renders, and await IndexedDB PDF writes before saving pointers to avoid jank and broken backups.
- Prompt forms disable controls until hydration and use native dialog submission so question text never leaks into URLs.
- Assistant text normalizes inline equation delimiters before markdown, preserves display equations/code, and scopes KaTeX sizing to the surrounding text.
- Saved practice extracts answers/revision cards and grades locally via shared SRS, never the tutor; stable card-ID queues/completed IDs prevent due-date skips on reload; new material joins next session.
- Study backup exports only browser study data + embedded attachments with validated non-destructive imports; source ZIPs/Cloud exports are separate.
- Tutor models share a server-validated catalog. Terminal AI pauses persist server-side; public requests never reset them. Credits pauses permit one atomic probe per cooldown, cleared by real AI success. Stale/unregistered app keys and wrong provider keys are configuration failures: never persist them; ignore old matching rows so updated host keys restore AI.
- Mermaid loads lazily via the diagram adapter only when rendering; its init failures must never block chat or practice.
- Agent memory lives in Cloud table memory_items, editable only by admins (has_role); /api/chat ranks active chapter outlines against bounded recent context, excludes unmatched chapters, injects size-capped memory so follow-ups keep context.
- Chat exports Obsidian markdown/zipped notes; attachments stay placeholders, never data URLs. Voice .md: Obsidian callouts/folds, Word/PDF plain.
- `web_search` (Perplexity + Parallel, URL-deduped) exists only when the client sends `search: true`; quiz mode gets a stricter search note.
- Student links use Parallel extraction with Firecrawl fallback and explicit empty/truncated results, so answers never claim to have read an unavailable page.
- Browser quota failures keep prior threads and report a save failure; media cleanup swaps attachments for markers, clearing IndexedDB only after thread cleanup (answers/cards kept).
- Admin link reads reuse the bounded student reader; files are content-addressed and memory saves dedupe by content/normalized URL.
- Admin imports share parsers/Sheets auth; MIME puts linked PDFs in PDF view. Drive needs authorization; PYQs require sourced evidence. PPTX reads text only; scanned PDFs use explicit lazy browser OCR without silent truncation. Admin/quiz share a device label preference; submissions stay A–D to preserve grading.
- Voice: Claude delegation, one-use quiz IDs, questions follow observed playback (manual fallback), stale answers ignored, timer commits on blur/Enter. Early prepare checks pause/opens Gateway socket; no session before offer. Speed is pace guidance; typed chat is untrusted student text. Screen-off heartbeats hold calls up to BACKGROUND_GRACE_MS; no paid auto-reconnect. History no-ops without database imports; confirmed usage/cleanup retained.
- Read nested AGENTS.md before edits. Shared soft-touch uses opacity, honors reduced motion, exempts players; native haptics need a native host.

# Source origin
- The web app in this repository was imported from GitHub (MrAnujBabu/Anuj-sarthi-deeplearning-ai) into this Lovable project; treat that repo as upstream source and this project as the live working copy.

## Preserved upstream architecture
- Browser-safe voice styles/live mapping share the device selection for live startup and read-aloud; preserve startup-only audio changes and model choices. Reference audio supplies delivery traits, never performer identity.
- Vedantu daily online checks run in GitHub Actions with encrypted step-scoped secrets and a database lease/status row only; never persist fetched course/class/test/note content or use browser timers/database HTTP cron. Manual Sync now returns online data directly.
- YouTube dub uses observed clocks, remaining-duration video-only rate correction, proportional seek offsets, upcoming-segment gap lookup, pause/buffering holds, bounded prefetch and run-scoped rate restoration; voice pitch/speed stay untouched.
- Timed Hindi preserves source viewpoint and per-block facts in simplest spoken phrasing; existing second-vendor review checks these without another paid fluency pass.
- YouTube speech uses Sarvam with cooldown retry and validated persona-specific Lovable preset delivery; backup style is never voice cloning.
- YouTube uses source-digest recovery, rechecks saved Hindi on requested review, matches cache modes, saves before clearing checkpoints and releases settled audio promises; WAV preparation precedes save/share.
