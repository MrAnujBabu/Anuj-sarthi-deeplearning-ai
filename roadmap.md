# Roadmap — workspace move setup

## Mobile Voice quiz (13:09 UTC)
- [x] Verify connected external Supabase is readable
- [x] Give active questions and answer choices the main reading area, with conversation accessible separately
- [x] Verify Match / Assertion–Reason reading and answer taps at 360px, 390px and desktop widths using simulated call events (not a paid live call)

- [x] Connect Firecrawl (std_01m5c2azptf4s9ne7mxc0qma11, gateway-backed)
- [x] Connect GitHub API (std_01m5c2xa9se41bkjcabnd8fzk3)
- [x] Connect Parallel (std_01m5c2yjkmfzc9xfhtdg8wg2wk)
- [x] Connect Perplexity (std_01m5c33cbhe009je7m4e7tbkfj)
- [x] Supabase "My Personal Agent" — already connected (ref dsazygocmjgjfqkqkwcp)
- [x] Rotate AI key (LOVABLE_API_KEY) + update 4 Vercel env vars + redeploy (dpl_DVhV8Zt6QzCpN2SsRZ5Jkq37BpE6 READY)
- [x] Verify site: Home/Practice/Voice/Admin all HTTP 200

## Voice "Not enough credits" (2026-10-20)
- [x] Find cause: voice uses relay on Lovable project 8cc816c6 (its workspace credits), not the Vercel key
- [x] Save in memory
- [x] Answer: why old key stops after rotation
- [x] Fix voice — replaced by Vercel-only talk-and-listen voice

## Voice on Vercel (2026-10-20)
- [x] Talk-and-listen voice on Vercel (no Lovable project needed)
- [x] Pushed to GitHub, Vercel auto-deployed, verified live
- [x] Runbook: credits khatam → switch to the new workspace key (no needless rotation)
- [x] Durable approach chosen: voice on Vercel

## Call voice + weaknesses (2026-10-20)
- [x] Call-style voice on Vercel (verified live: tutor greets, Live · bolo)
- [x] Voice interrupt — live call supports talking over the tutor; [ ] locked-screen check needs a real phone
- [ ] Cowork "unavailable" — fix or remove
- [ ] Verify admin login, quiz, timer, backup
- [ ] Data on one device — cloud sync option
- [ ] Vercel token per workspace — reduce
- [ ] Project size — tests guard

- [x] Voice: show Match the Following as a table and A–D answer buttons in call transcript

## Workspace move (10:52 UTC)
- [x] Firecrawl, GitHub API, Parallel, Perplexity linked in new workspace

- [x] Live site real voice call: Match + AR asked, table and AR box shown; [ ] grading reply after a tapped answer not yet seen in a test call

## Deep NCERT voice quiz (12:33 UTC)
- [x] Real NCERT Class 11/12 Biology question bank for Advanced switch, official chapter names shown
- [ ] Send to GitHub / live site (ask user)

## Workspace move (12:43 UTC)
- [x] Connect Firecrawl, GitHub API, Parallel, Perplexity in new workspace

## Workspace move (12:46 UTC)
- [x] Firecrawl, GitHub API, Parallel, Perplexity linked (nbbb's GitHub API)
- [x] Vercel: LOVABLE_API_KEY + FIRECRAWL/PARALLEL/PERPLEXITY updated, production redeploy READY (no rotation)
- [x] Verify Home/Practice/Voice/Admin all HTTP 200; voice relay still this project (069fc516)

## NCERT deep-mode answer key (12:59 UTC)
- [x] Spot-check 6 chapters (11-1, 11-5, 11-8, 12-5, 12-6, 12-12) against NCERT PDFs: all 12 checked answers VERIFIED, chapter numbers/titles correct for the rationalised edition
- [x] Build a visible correct-answer key (question → right option + NCERT basis) — NCERT-voice-answer-key.md
- [ ] Send deep NCERT bank + answer key to GitHub so snapsolveanuj.vercel.app updates

## Live call check (12:59 UTC)
- [ ] Real call with deep switch on: ask, tap an answer, see grading reply + result layout — preview call never reached "Live · bolo" (settings toggles all on, Start clicked); needs a run against the published relay / live site instead
- [ ] Phone lock-screen behaviour — needs the user's real phone

## Workspace move (13:35 UTC)
- [x] Firecrawl linked (std_01m5crdgy0fbea5af1693g8t43, gateway-backed)
- [x] GitHub API linked (std_01m5crgnhsfwdr9wsjehnahs5t)
- [x] Parallel linked (std_01m5crh9b7f198dnease5dbt8f)
- [x] Perplexity linked (std_01m5crn857fcksatmsg1y66214)
- [x] Supabase "My Personal Agent" — already connected, readable (94 memory items, 1 agent_settings row)
- [x] Vercel: LOVABLE/FIRECRAWL/PARALLEL/PERPLEXITY updated, SUPABASE_* untouched, no key rotation
- [x] Production redeploy dpl_HUGSPozW8mH9msa7wmB9Qua6XZ9B READY
- [x] Verify Home/Practice/Voice/Admin all HTTP 200; relay still project 069fc516 (published)
- [ ] AI chat / voice reply not exercised this move (credit-spending tests need user's go-ahead)

- [x] Voice credits out: relay moved + Vercel updated (Oct 20)

- [x] Workspace move: connectors + Vercel keys + redeploy done
- [x] Voice relay moved to this project (new workspace), published; probe OK
- [x] Supabase "My Personal Agent" connected
- [x] Mobile voice buttons, grouped chat history, pause/resume + auto-resume on reconnect (pushed fec3d78)

## Voice connection drop + controls (16:54 UTC)
- [x] Fix "Voice control connection lost" (heartbeat 1s + 8s ack timeout; auto-reconnect on drop, max 2)
- [x] Pause/Resume button in voice call dock (Stop = End already there)
- [x] Push to GitHub (1196250) + Vercel redeploy READY + pages 200

## Workspace move (17:02 UTC)
- [x] Connect Firecrawl (std_01m5d47t70ej6r3z46yk21qxvs), GitHub API (std_01m5d4aadpfw5ajs46pctcqvaz), Parallel (std_01m5d4b63fff1s64qb9hdwrhyk), Perplexity (std_01m5d4bw98f8m85fpm4y3fq40x)
- [x] Vercel 4 keys updated to new workspace, deploy dpl_ARpwVbb3YMffrJ2SYzERqr2TuRSt READY, Home/Practice/Voice/Admin 200
- [x] Relay probe OK (SDP offer error = key sahi)
- [ ] Supabase "My Personal Agent" — user khud Settings → General → External Supabase me jode
- [ ] Real phone par voice call + pause/resume test (user)

## Premium AI models (17:35 UTC)
- [x] Lovable AI Gateway enabled (workspace-level, no API keys needed)
- [x] Chat/tutor already top premium (Fable 5.1 default) — untouched
- [x] TTS -> gemini-2.5-pro-tts, dictation STT -> gemini-3.5-transcribe, doc text extraction -> claude-sonnet-5 (all live-tested on gateway)
- [x] Push to GitHub (08959c1) + Vercel deploy dpl_3oq2nxj14YieKpEaA35Z4GhoJqtb READY + pages 200
- [x] Claude/Anthropic untouched on user instruction (doc extraction reverted to Haiku 4.5)

## Best model per job + Verify (17:46 UTC)
- [x] /api/verify route (Gemini 3.1 Pro + GPT-6 Astra + Claude Fable 5.1 council, Perplexity/Parallel sources)
- [x] /api/vision-read route (Gemini 3.1 Pro photo transcription)
- [x] src/lib/verify.ts, src/lib/gateway-chat.server.ts, settings hooks useAutoVerify/usePhotoReading (default ON)
- [x] verify-card.tsx + Verify button in message-actions (auto when setting ON, skip quiz)
- [x] Settings toggles (Auto-verify, Photo reading) in study-settings.tsx
- [x] Photo pre-read in doubt sendMessage (solve mode, images, setting ON)
- [x] Council: Gemini 3.1 Pro (Google-grounded facts) + GPT-6 Astra (maths) review, debate when verdicts differ, Claude Fable 5.1 rules (web research confirmed Astra > 6.1 Sol)
- [x] Tests (council rules, parsing, routes) + live tests: photo read 200, wrong answer → needs_fix (ruled), right answer → verified by all 3, quiz → 400
- [x] Push GitHub (b4324ff) + Vercel env keys (new workspace) + deploy READY; live test on Vercel: photo read 200, council needs_fix ruled in 16s
- [x] "Ask the tutor to explain the correction" button when the council finds a mistake

## Next ideas (ready)
- [ ] Long PDFs: Gemini 3.1 Pro reads big PDFs/scans and hands the tutor a page-cited summary (today the browser extracts text only)
- [ ] Voice mode: optional council check of the tutor's spoken explanation, shown in the transcript after the turn
- [ ] Practice: council-checked revision cards before they enter the review queue

## Workspace move #3 (18:11 UTC)
- [x] Reconnect Firecrawl, GitHub API, Parallel, Perplexity in the new workspace
- [x] Update Vercel env keys (LOVABLE_API_KEY + 3 connector keys) after reconnect, redeploy

## Workspace move #4 (18:31 UTC)
- [x] Reconnect Firecrawl, GitHub API, Parallel, Perplexity in the new workspace
- [x] Update Vercel env keys (LOVABLE_API_KEY + 3 connector keys) and redeploy

## Project move prep (18:52 UTC)
- [x] Backup to Files: clean source ZIP, handoff report with continue-prompt, helper/test scripts (private)
- [x] Commit handoff report + roadmap to GitHub (user asked 18:54)
- [x] After move #5: Firecrawl, GitHub API, Parallel, Perplexity linked; Vercel 4 keys updated + redeploy READY; pages 200; Supabase verified (94 memory rows); GitHub push dry-run OK
- [x] In the moved project, continue the open "Test + optimise" tasks from the handoff report (user asked 18:53)

## Test + optimise (18:41 UTC)
- [x] Save all finished work to GitHub before testing (user asked 18:41)
- [x] Make answer-check faster without losing accuracy (19:02 UTC): Gemini starts with its own Google Search while Perplexity/Parallel evidence still loads; per-provider timeouts (8s search / 15s extract / 20s scrape) so one slow service never stalls; Firecrawl early-starts after 4s if Parallel is slow on link/PDF reads; AI-pause check cached 60s (fewer free-tier DB reads); verify panel shows "Claude confirming" as soon as both reviewers flag the answer. Timings live: right 8.8s, wrong 10.3–13.7s (was right 6–10s, wrong 10–12s, but search no longer serial — review starts ~2s earlier). 258 tests pass.
- [x] Voice call (19:30 UTC): survives 15s network blink (heartbeats continue while media recovers), public STUN added; deployed 07f10a4. Real fake-mic call blocked: test sandbox gathers zero ICE candidates — user to test on phone. Credit-limit drops need workspace credits, not code.
- [x] Adversarial tests on every AI route (19:08 UTC): bad/empty/huge payloads, null bodies, wrong types, prompt injection, dead link, garbage photo. Fixed 3 bugs found: null JSON body crashed /api/speech and /api/chat (now 400); oversized pasted text/attachments reached the gateway and returned an empty content-filter reply (now capped 100k text / 2MB body with a clear 413). Injection rejected (council caught "ignore rules" + wrong maths → needs_fix); dead link → tutor admits it can't read it, offers upload; garbage photo → clean [unclear: …] reading. 263 tests pass (new chat-route + fallback + pause-cache tests).
- [x] Hindi voice research: Sarvam Bulbul V3 best (needs Sarvam key — waiting on user); current Gemini 2.5 Pro TTS reads Hinglish+Devanagari word-perfect, kept.
- [x] Final report: rating + pros/cons (Files: snapsolve-rating-report.md)

## Admin panel verify (19:17 UTC, user request)
- [x] Login as the user's admin account and verify the admin panel end to end
- [x] Check Vercel deploy of d07210b finished READY + pages 200 (19:22 UTC)
- [x] Admin panel verified on production (19:26 UTC): login with the provided account works; tabs — Agent memory (84 notes, add/edit/delete/Deep analysis), Voice calls (latest 10 with real usage + failure reasons), brain & role, settings — all load without console errors. Note: several 10/19 voice calls failed on "out of credits or spending limit" / heartbeat_timeout — ties into the open voice-connection task.

## 2026-10-21 tasks
- [x] Fix "LOVABLE_API_KEY is not registered" (rotate once, update Vercel, republish)
- [x] End-to-end test: quiz option select, PDF quiz (real phone voice call: waits on user)
- [x] Add mobile-data voice call test steps to the app manual

## New workspace setup (21 Oct)
- [x] Connect Firecrawl
- [x] Connect GitHub API
- [x] Connect Parallel
- [x] Connect Perplexity
- [x] Connect Supabase project "My Personal Agent" (already linked, data verified)

## Voice transcript PDF/Word export + Vercel keys (21 Oct, 01:55 UTC)
- [x] /voice: PDF + Word export buttons (md format intact — tables, lists, callouts); PDF via print dialog (Save as PDF), Word as .doc
- [x] Tests for the md→document conversion (9 new, 282 total pass)
- [x] Workspace moved: Vercel keys updated (LOVABLE_API_KEY rotated once + 3 connector keys), redeploy dpl_3Zq6pyhCZ3rr6MApsAtefUJsjJBx READY
- [x] Push to GitHub (5ed6eb5) + live pages 200; also synced 5 stale voice files (speed, transcript format) that had never been pushed
- [ ] Real phone voice call on mobile data (user)

## Voice toggles + traffic-noise filter (21 Oct, 02:02 UTC)
- [x] Toggle format: spoken "Detail mein: …" → collapsible section in transcript, Word/PDF exports keep it
- [x] Noise filter extended: car/bus/train/bike horn, engine, factory machine, crowd, wind, rain, dog, siren tags (EN+HI) dropped; real speech untouched
- [x] Tutor + delegation instructions ask for toggle phrasing; 288 tests pass
- [x] Pushed to GitHub (a3df100), Vercel deploy dpl_F5udWFnkzNWviRoghNYhGtWThybE READY, pages 200, relay republished

## Voice connect speed + PDF quiz extras (21 Oct, 03:20 UTC)
- [x] Workspace move (03:28 UTC): connect Firecrawl, GitHub API, Parallel, Perplexity (all gateway-backed)
- [x] Workspace move (03:43 UTC): connect Firecrawl, GitHub API, Parallel, Perplexity again (all gateway-backed)
- [x] Workspace move (03:56 UTC): connect Firecrawl, GitHub API, Parallel, Perplexity again (all gateway-backed)
- [x] Workspace move (04:14 UTC): connect Firecrawl, GitHub API, Parallel, Perplexity again (all gateway-backed)
- [x] Workspace move (04:15 UTC): Supabase "My Personal Agent" linked; data intact (memory 94, roles 1, settings 1, voice calls 10, private bucket)
- [x] Voice call connect time under ~10s → as low as possible (parallel mic/socket/gateway, fast ICE, early greeting, relay prewarm, stage display)
- [x] PDF quiz view: speed control + toggle (collapsible) format in the quiz card
- [x] Transcript export (MD/Word/PDF) includes quiz questions with A–D options and the chosen answer
- [x] Voice mode eye button (03:50 UTC): tap hides the bottom call buttons, tap again shows them; no auto-hide, no tap-anywhere show
- [x] Voice settings "Chat" toggle (04:07 UTC): type messages to the tutor during a voice call; tutor answers aloud + in transcript (relay probe: typed message → Claude answer in ~5s)
- [ ] Tests, push to GitHub, Vercel deploy READY, relay republish
