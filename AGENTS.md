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
- Mount TooltipProvider around the root route outlet so every page and portalled control inherits tooltip context, preventing missing-provider crashes.
- Sidebar collapse stays inside DoubtSidebar with a persistent visible reopen control; composer controls use fixed-size AI Elements buttons and a two-track footer to prevent overlap.
- SnapSolve is the repository-root application; keep the previous Python application under legacy/ so hosting detection selects the web app.
- Use vite.vercel.config.ts to pin Nitro's Vercel preset for external deployments; preserve vite.config.ts for Lovable's own deployment target.
- Sidebar Settings shares device appearance/quiz preferences; timer overrides keep the cached admin default; physical numpad maps to A–D and dialogs block shortcuts to prevent accidental answers.
- Repository PCB outlines are stored as per-chapter admin memory, mapping Botany/Zoology to Biology while retaining the original branch and provenance; keeps existing subject choices and avoids claiming official syllabus verification.
- AI tutor calls run only in the `/api/chat` server route (Claude via Lovable AI Gateway Messages API, streamed); keeps the key and prompt server-side.
- Doubts use browser threads at `/doubt/$threadId`; downscale photos, throttle streamed renders, and await IndexedDB PDF writes before saving pointers to avoid jank and broken backups.
- Prompt forms disable controls until hydration and use native dialog submission as a no-navigation fallback, preventing question text from leaking into URLs before React handles submissions.
- Assistant text normalizes inline equation delimiters before markdown rendering, preserves display equations and code, and uses scoped KaTeX sizing so equations follow the surrounding text.

- Saved practice extracts existing answers and revision cards and grades recall locally through the shared SRS persistence API; it never calls the tutor endpoint.
- Study backup exports only browser study data and embedded attachments, with validated non-destructive imports; source ZIPs and Cloud exports are separate backups.
- Tutor models use a shared server-validated catalog; terminal AI pauses are persisted server-side and never reset by public browser requests.
- Load Mermaid through the lazy diagram adapter only when rendering a diagram; graph dependency initialization failures must not prevent chat or practice routes from opening.
- Saved practice persists a stable card-ID queue and completed IDs; due-date changes must not skip cards on reload, and newly saved material joins the next session.
- Agent memory lives in Cloud table memory_items, editable only by admins (has_role); /api/chat ranks active chapter outlines against bounded recent conversation context, excludes unmatched chapters and injects size-capped memory so follow-ups retain context.
- Chat export: `src/lib/export-chat.ts` converts threads to Obsidian-ready markdown (YAML frontmatter, one note per doubt, attachments as placeholders — never embed data URLs); bulk export zips notes + index.md via fflate.
- Web search: `createAgentTools({ webSearch })` adds a `web_search` tool (Perplexity + Parallel in parallel, deduped by URL) only when the client sends `search: true`; /api/chat appends a search instruction to the system prompt and disables it in quiz mode.
- Voice dictation records 16 kHz WAV in the browser and transcribes only through the `/api/transcribe` server route; keeps the AI key server-side and inserts text into the composer for review before sending.
- Dictation forwards SSE unchanged and consumes it with the shared transcription parser; exposes partial text promptly, preserves terminal errors, and propagates explicit cancellation without timeout retries.
- Student links use Parallel full-content extraction with Firecrawl fallback and explicit empty/truncated results; prevents answers falsely claiming to have read an unavailable document.
- Browser quota failures preserve prior threads and return a save failure; media cleanup replaces attachments/extracted documents with markers and clears IndexedDB only after thread cleanup, keeping answers and revision cards intact.
- Admin link reads reuse the bounded student document reader; file paths are content-addressed to avoid repeat uploads, and memory saves compare content/normalized URLs before inserting.
- Admin imports share parsers/Sheets auth; MIME puts linked PDFs in PDF view. Drive needs authorization; PYQs require sourced evidence. PPTX reads text only. Admin/quiz share a device label preference; submissions stay A–D to preserve grading.
- Voice mode uses a persistent /api/live WebSocket relay (src/lib/live-relay.server.ts) to Lovable AI Gateway Live; GPT Live speaks, Claude answers delegated doubts server-side, keeping the key on the server.
