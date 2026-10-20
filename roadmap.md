# Roadmap

## Live voice failure recheck (Oct 20, 04:22 UTC)
- [x] Keep the already published website at https://snapsolveanuj.vercel.app/; no domain change requested.
- [x] Recheck hosted endpoints: Vercel /api/live returns 500; separate Lovable /api/public/live returns 404 with 'No published build'. Website publication does not publish the separate call service.
- [ ] Publish the separate call service with owner approval, then sync/deploy the Vercel client and verify a real hosted call; audible and screen-off behavior remain unverified.

## New workspace move (Oct 20, 04:04 UTC)
- [x] Fresh-link Firecrawl, GitHub API, Parallel and Perplexity; ignore every previous connection ID.
- [x] Check Supabase binding: external project dsazygocmjgjfqkqkwcp remains connected, service-role binding present; display name My Personal Agent cannot be independently verified. Existing notes/accounts unchanged.
- [x] ElevenLabs requires its own connector/provider credits, not the Lovable AI key; existing voice models unchanged.

## Workspace deployment automation (Oct 20, 03:45 UTC)
- [ ] Fix voice startup on Vercel: owner chose separate relay with website unchanged. Direct secure relay endpoint and exact-origin checks passed 11 focused tests; build OK. Two publish approval calls cancelled by incoming questions, so nothing published. Await completed publish approval before syncing/deploying Vercel client; hosted audio unverified. Claude stays on Lovable credits, no Anthropic key.
- [x] Verify GitHub main: 285106c4 includes Step 2 and earlier voice timer synchronization, but newer no-history, stale-chat-options and cancellation fixes differ or are missing. No merge/push performed by this verification.
- [x] Verify Vercel GitHub link now points to MrAnujBabu/Anuj-sarthi-deeplearning-ai main; latest deploy is still manual redeploy, so actual push-to-live automation remains unverified. Live pages return 200, timer 27 persists, backup downloads; chat returns 402.
- [x] Diagnose live AI pause: current workspace has 6.80 credits; shared Supabase still holds workspace credits pause from Oct 20 03:40:39 UTC. No gateway requests recorded; do not reset automatically.
- [x] Owner approved resuming AI: removed only matching old workspace credits pause; live Vercel chat returns 200 and answers F = 6 N, retained after reload, no page errors. Other pauses and study data preserved.
- [x] Step 2 saved in memory and GitHub WORKSPACE-DEPLOYMENT.md (commit 285106c4). Home, Practice, Voice and signed-out Admin return 200 without page errors; chat remains AI-paused. Practice grading, signed-in admin, audible voice, quiz/search/upload still unverified in this deployment.
- [x] Rotate Lovable AI Gateway key (Claude uses this, not a separate Anthropic key); authenticated models check returns 200.
- [x] Refresh four Vercel runtime keys securely and redeploy production; deployment READY.
- [x] Live site returns 200; browser tutor check reaches persisted 'Not enough credits / AI is paused' state, so answer verification stopped without retry or pause reset.
- [ ] Verify first GitHub-triggered deployment — repository/main link now confirmed; waiting on a requested code push to prove automatic deployment, keys must never be committed.
- [x] Save recurring workspace-move deployment preference without storing any credentials in memory.

## Latest requests (Oct 20, 03:41 UTC)
- [x] Check current Supabase binding after new workspace move: connected external project responds with 94 memory items; project display name not independently verified. No connection switch or database changes made.
- [x] Fresh-link Firecrawl, GitHub API, Parallel and Perplexity in the new workspace; all four linked and accessible, previous connection IDs ignored.
- [x] Diagnose voice startup: Vercel /api/live upgrade probe returns 500, local Vite returns 101; browser test stops at ICE network setup timeout before opening its control socket. Hosted relay uses Worker-specific WebSocket APIs; audible call remains unverified.
- [ ] Restore hosted voice compatibility — requires choosing and deploying a supported long-lived voice relay; no deployment changes requested yet.

## Latest workspace connections (Oct 20, 02:19 UTC)
- [x] Fresh-link Firecrawl, GitHub API, Parallel and Perplexity; previous workspace connections do not apply.
- [ ] Connect the user's existing My Personal Agent project — user must select it in Settings → General → External Supabase → Connect; chat cannot link an external project. Keep application voice-call history disabled.

## Current deep feature audit (Oct 20)
- [x] Handle AI cancellation as 499 before streaming; suppress expected SDK abort logs and attach first-chunk rejection handling immediately. Real browser Stop during thinking, fresh Claude answer and reload passed with no page errors; 192 tests pass, 1 opt-in skipped.
- [x] Stop all application voice-call history writes; no database client import/work remains. Test confirms no writes, warnings or queued history work; live usage/cleanup unchanged. Existing rows untouched.
- [x] Reverify voice timer auto-skip, atomic next-question/options and usable next options: 21 focused tests pass; real Claude expiry-to-next-question test passes.
- [x] Explain external connection setup shown in screenshot; user must complete Connect in Settings, current external link remains unverified.
- [x] Diagnose history warning: missing server database configuration. Intentionally disabled history rather than connecting a backend or weakening security.
- [x] Complete regression suite: 189 passed, 1 opt-in live test skipped; separately real Claude test passed. Earlier browser chat, practice, timer, backup, PDF and search checks passed. Latest voice Start has no page errors but ICE/network setup timed out; audible auto-skip remains blocked.
- [ ] Real audible voice auto-skip/screen-off verification — blocked by local ICE/network setup timeout; needs a working device call.
- [x] Prevent chat-quiz fallback to earlier assistant questions and exclude hidden graded-card payloads from option extraction; 23 targeted tests pass. Real model response omission cannot itself be prevented, but old options no longer populate new answers.

## Current voice quiz synchronization
- [x] Fresh-link Firecrawl, GitHub API, Parallel and Perplexity after Oct 20 workspace move; disregard all previous connections
- [x] Fix premature next-option transitions; 44 targeted tests and simulated browser flow verify atomic question/options, 3-second skip once and next B tap; real audio remains unverified
- [x] Export latest tested voice quiz/timer/settings changes to GitHub main: 57c3e668; 189 regression tests pass, 1 opt-in live test skipped; simulated browser sync flow passes
- [x] Display question with its option IDs; pause countdown until observed audio silence plus final-option captions, with explicit timer-start fallback
- [x] Add typed seconds to voice Settings; 27 seconds saves and survives browser reload
- [x] 52 targeted regression tests pass; voice Settings browser check has no page errors
- [ ] Verify real audible synchronized quiz transitions — requires a working microphone/WebRTC call; local earlier ICE timeout blocks audible verification

## Current model and voice reliability audit
- [x] Chat + voice delegate use catalog's most capable Claude Fable 5.1 at high reasoning; chat UI and real voice-delegate Messages calls verified
- [x] Voice quiz uses wall-clock expiry, completion events and rejected-send resets; skip/answer races and fresh IDs tested
- [x] Remove arbitrary six-check-in silence cap; check-ins need recent real browser heartbeats, only transcripts count as activity; delegate tasks use runtime waitUntil
- [ ] Physical locked-screen/silent audible call verification — local browser ICE gathering timed out before opening a paid call; OS suspension still cannot be prevented by web code
- [x] Regression suite: 182 pass; live delegate test separately passed; physical/deployed call results not claimed

## Current voice polish
- [x] Explain publishing, workspace credit exhaustion/recovery and supported lower-friction credit management; no automated workspace move or documented runtime balance API
- [x] Compact voice screen; Search/voice controls in side panel, shared transcript text sizing; imported conversation verified at desktop/390px
- [x] Upgrade voice tutor only to Claude Fable 5.1; real Messages response HTTP 200, preserve call/quiz behavior; physical audio remains unverified
- [x] 174 tests pass; desktop/390px transcript and side settings checked, no page errors; commit tested source to GitHub

## Workspace move (Oct 19, 16:54 UTC)
- [x] Fresh-link Firecrawl, Parallel, Perplexity, GitHub API; previous workspace connections ignored
- [x] My Personal Agent database verified: 94 memory items, agent settings, AI pause table, owner admin role, private 25 MB agent-memory bucket (0 files)
- [x] All 5 Claude models available; live tutor, quiz option select (B graded 1/1) and PDF quiz verified; Unknown model shows setup message (400); 167 tests pass
- [x] Tutor keeps answering when the AI pause check can't reach the database
- [x] PDF quiz numbered (1)–(4) options now show full text on A–D cards; live PDF Q40 verified, 170 tests pass
- [ ] Re-upload admin memory files to Storage (agent-memory has 0 files) — waiting on user
- [x] Commit tested changes to GitHub after the current voice/Supabase audit (167 tests and clean preview verified)
- [x] Latest audit: Supabase has 94 memory items, 1 admin and private 25 MB bucket; voice_calls RLS/admin policy verified; Explain simpler real chat passed; no recorded voice calls
- [x] Current voice expansion: server-owned admin call/PDF metadata and confirmed-duration tracking; browser scanned-PDF OCR attachment passed; unexpected disconnect remains failed even with final usage; 167 tests pass
- [ ] Real spoken Quiz/Search/PDF and Indian-style audio — blocked: physical microphone/playback and user phone required; available Live voice has no native Indian regional option
- [ ] Actual per-call settled credits and signed-in admin call-history readback — blocked: no real-call billing evidence; external Supabase managed browser session unavailable
- [ ] Public voice spending protection — existing no-login access preserved; spending-abuse risk needs an owner decision about student sign-in/access before changing that flow
- [ ] Quiz explanations: verified NCERT chapter → topic → subtopic → paragraph/page references; explicitly mark unavailable edition-specific details
- [ ] Settings quiz timer with admin-default/device override; verify countdown, auto-skip, off and grading pause
- [ ] Settings: bold questions, selectable study text size and shared Hide Chat Widget toggle; retain existing quiz switches
- [ ] Sidebar Settings, shared controls and numpad support with top-row keys preserved
- [ ] Full regression/live checks, targeted performance fixes and updated manual/report
- [x] Rotate current workspace AI key; live uploaded PDF answer B = 6 N, HTTP 200, no page errors
- [x] Recheck saved 2017–2026 PYQ references; live 2020 Code E1 Q1 topic tip cites actual question/source; reference-only 2021/2024/2025 excluded from evidence
- [x] Add shared admin/device shortcut preference; reload verified, live key 2 submitted B and graded correct 1/1; 130 tests pass
- [x] New workspace: Firecrawl, GitHub API, Google Sheets, Parallel and Perplexity freshly linked; all five confirmed linked and accessible
- [x] Reversible A–D / 1–4 labels and live key 2 → B; PPTX text-only live quiz verified, legacy PPT requires PDF export
- [x] Admin PDF links classified by MIME; ten 2017–2026 sourced references saved with duplicate re-import blocked; seven papers readable, three explicitly unverified; live 2020 Q1 sourced tip verified
- [ ] Private Google Drive extraction blocked: connector authorization declined; 2021/2024/2025 question-level English evidence incomplete
- [x] Admin device memory/settings backup, validated merge restore and backup-verified text-only cleanup; download/QA cleanup/restore/duplicate restore and 390px verified; 84 originals preserved; DOCX/PPTX/XLSX basic reading and public PDF link verified (XLSX cell mapping, legacy Office and scanned PDF remain limited)
- [x] Recheck reference/mobile controls; fix mobile Close interception; admin PDF/notes/link duplicates verified; text-only retention, simulated 402 and practice reload verified; 96 tests pass; report delivered
- [x] 03:44 workspace move: Firecrawl, GitHub API, Parallel and Perplexity freshly linked; previous workspace connections ignored
- [x] Polish composer buttons, persistent sidebar hide/reopen; 923/390/320px checks and 93 tests pass
- [x] Laptop/Mac keys 1–4 select A–D; tests ignore typing, modifiers, held keys and grading; browser key 2 verified
- [x] Admin bounded PDF-link reading, same-file/content/link duplicate protection; signed-in notes and public PDF link verified (full tutor grounding/office formats not re-verified)
- [x] Storage safety cleanup preserves answers/cards, no silent eviction, focus toggle; 93 tests and live checks pass, reliability report delivered
- [ ] Perplexity numeric balance — blocked: managed Search connection has no separate account balance and no documented remaining-balance API; no fake counter
- [x] Current workspace: connect Firecrawl, GitHub API, Parallel and Perplexity fresh; disregard previous workspace connection IDs
- [x] Core regression/live checks and report: 82 tests pass; voice sample, quiz wrong answer/hint/reload, search, PDF link, simulated 402 and zero-AI saved practice verified
- [x] Match reference mic + waveform placement; streamed dictation, cancellation and terminal credit message verified
- [ ] Physical-phone microphone and remaining full live suite — blocked: physical device/user input and hosted verification unavailable; see test report
- [ ] Real-time numeric workspace credits — blocked: supported runtime credit-balance API details required
- [x] New workspace move: reconnect Firecrawl, Parallel, Perplexity, GitHub API; Cloud schema 0000–0005 + private agent-memory bucket; 84 memory items restored from CSV
- [x] Restore missing quiz files (option cards, key-term emphasis), "Unknown model" shown as setup issue not credits; live tutor, PDF quiz, answer tap and saved practice verified; 63 tests pass
- [x] Admin access verified with the owner account during signed-in PDF/notes/link tests
- [ ] Re-upload admin memory files to Storage — waiting on user
- [x] Keep quiz selection visibly tinted during live grading, add persistent sidebar collapse/expand, and emphasize key question terms; 9 tests pass
- [x] Show full quiz option text inside checkbox buttons; live Endodermis selection sends B once, grading and next-question cards survive reload
- [x] Difficult Anatomy quiz at high effort with Quiz+Search: fix answer cards not submitting; verify B grading, score, hint, skip, stop, cards and reload
- [x] Fix blank model/effort from native chat selector events; preserve real selections and verify anatomy quiz submission
- [x] Remember workspace-move/model error recovery; distinguish Unknown model from exhausted credits and keep saved practice available
- [x] Polish composer to match the annotated minimal reference; model/Quiz/Search visible, send/stop/reload verified, no mobile overflow or page errors
- [x] Make current SnapSolve the GitHub repository root app; archive legacy source without losing future links
- [x] Add separate Vercel configuration; 60 tests and live quiz/hint/reload/export pass in Lovable preview
- [ ] Verify actual Vercel deployment — blocked: external hosting/backend/service configuration not supplied; Cloud privileged credentials are not exportable
- [x] Signed-in admin rechecked with managed owner session; temporary QA items removed
- [x] Consolidate model, effort, quiz and search controls inside the polished chat composer; fix embedded selector reset and busy Enter draft loss
- [x] Verify all 84 imported chapter contents/categories/provenance, admin reload persistence, live PCB tutor replies and contextual follow-up; 59 tests pass
- [x] Reconnect Firecrawl, GitHub API, Parallel and Perplexity in the new workspace
- [x] Import repository app.py PCB data into admin subject memory
- [x] Rewrite project README while preserving future-project links
- [x] Connect GitHub and export full SnapSolve app with toolbar into repository; preserve original app and future links
- [x] Obsidian markdown export (per-doubt .md + full vault zip)
- [x] Visible Search toggle in chat → live data via Perplexity/Parallel/Firecrawl
- [ ] Cowork background tasks — blocked: background-service connection was declined by user
- [x] Reconnect Firecrawl, GitHub API, Parallel and Perplexity in the new workspace (GitHub live-verified)
- [x] Quiz mode: compact question/A-B-C-D option spacing on mobile; checkbox-card selection
- [x] Project handover prompt (PROJECT-BRIEF.md) + end-to-end manual (PROJECT-MANUAL.md)


- [x] Quiz: long options wrap neatly on mobile with checkbox + letter aligned
- [x] Fast PDF chat: text PDFs read in browser once (scanned stay AI-read); answer-key grading + NCERT/web verification
- [x] Backup guide + GitHub commit of latest code + continue prompt (PROJECT-BRIEF.md)

## Reconnect integrations (new workspace)
- [x] Link Firecrawl, GitHub API, Parallel, Perplexity fresh in this workspace
- [x] Fix raw 401 "Unauthorized" from AI gateway -> friendly configuration message (done, 104 tests pass)

## Current import and tutor verification
- [x] Add PDF-focused admin view and explicit saved-document deep analysis; complete Sonnet response confirms F=6 N and answer key
- [x] Add Markdown and Anki raw text/JSON imports with 25 MB validation; local tests and signed-in admin imports verified
- [x] Generate and verify mixed Google Sheet import via linked account; PYQ/Flashcard/Assertion in correct tabs, duplicate reimport skipped
- [x] Rotate workspace AI key and verify complete live PDF tutor response, no 401; temporary QA rows removed

- [x] Backend moved to "My Personal Agent": schema, 94 memory items, agent-memory bucket, connectors
- [x] Admin toggle for 25 MB upload limit
- [ ] Admin: sign up again with owner email (auto-admin)
- [ ] Browser check of quiz option select + PDF quiz after admin sign-in

- [ ] Verify admin account anujkumar75yadav@gmail.com and turn off email confirmation
- [x] Admin account created, confirmed, admin role (email-confirm toggle must be switched off in Supabase dashboard)
- [x] Push latest code to GitHub + backup ZIP before workspace move

## Workspace move (Oct 19, latest)
- [x] 15:00 UTC workspace move: freshly link Firecrawl, GitHub API, Parallel and Perplexity; My Personal Agent binding confirmed by current platform state (dsazygocmjgjfqkqkwcp); no fresh database or live feature audit
- [x] Fresh-link Firecrawl, GitHub API, Parallel, Perplexity in the new workspace
- [x] Supabase "My Personal Agent" connected and verified: 94 memory items, 1 admin role, agent-memory bucket live

## Session handover and voice verification (Oct 19, 14:35 UTC)
- [x] Confirm My Personal Agent external Supabase connection after latest workspace move; expected project configured, auth health HTTP 200 (roles/storage not rechecked)
- [x] Fresh-link Firecrawl, GitHub API, Parallel and Perplexity after the latest workspace move; ignore earlier connection references
- [x] Deliver session report file with implemented, verified and blocked work
- [x] Verify safe voice changes: 161 tests pass; simulated 390px connected-call B tap submits once and stays selected; real spoken grading remains unverified
- [x] Commit current code to GitHub (verified remote file hashes before handover)
- [x] Voice quiz: show the normal chat A–D option cards and send tapped answers into the active voice conversation
- [ ] Diagnose quickly lost voice media connection — blocked: no failing real-call trace; heartbeat limits and paid-session cleanup preserved, no automatic paid reconnect
- [x] Fix mobile home title/navigation overlap: 390px top/scrolled screenshots checked, no horizontal overflow/page errors; Quiz toggle selected successfully (spoken option grading still unverified)
- [ ] Physical-phone Start / 2–3 questions / End and PDF spoken-answer verification — requires user's phone and audible input/output
- [x] Report historical duration/cost records observed before latest workspace move; current workspace has no matching logs, so final settlement and post-fix voice verification remain unconfirmed
- [ ] Genuine Indian regional voice/model — blocked: authenticated catalog checked before move exposes GPT Live only; documented regional voices do not establish an Indian-native voice, no arbitrary model substitution

## Voice (Oct 19)
- [x] Voice silence mitigations implemented; screen lock can still suspend browser and end call, not verified as uninterrupted
- [x] Voice quiz expiry/selection tested in component and relay; actual audible next-question flow remains unverified

- [ ] Confirm Supabase project "My Personal Agent" is the linked backend (ref dsazygocmjgjfqkqkwcp)

- [ ] Voice must work on https://snapsolveanuj.vercel.app itself (user-facing address unchanged); needs voice relay published, then Vercel redeploy
