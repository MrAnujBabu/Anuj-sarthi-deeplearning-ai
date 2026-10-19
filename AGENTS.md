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
- SnapSolve is the repository-root application; keep the previous Python application under legacy/ so hosting detection selects the web app.
- Use vite.vercel.config.ts to pin Nitro's Vercel preset for external deployments; preserve vite.config.ts for Lovable's own deployment target.
- Share chat settings between home and doubt composers through ChatControls; keeps model, effort and mode behavior consistent within the input widget.
- Repository PCB outlines are stored as per-chapter admin memory, mapping Botany/Zoology to Biology while retaining the original branch and provenance; keeps existing subject choices and avoids claiming official syllabus verification.
- AI tutor calls run only in the `/api/chat` server route (Claude via Lovable AI Gateway Messages API, streamed); keeps the key and prompt server-side.
- Doubts are threads stored in browser localStorage (`src/lib/threads.ts`), one page per doubt at `/doubt/$threadId`; photos are downscaled to JPEG before sending so history fits in storage.
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
