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
- [ ] After move: reconnect Firecrawl, GitHub API, Parallel, Perplexity; update Vercel keys; redeploy
- [ ] In the moved project, continue the open "Test + optimise" tasks from the handoff report (user asked 18:53)

## Test + optimise (18:41 UTC)
- [x] Save all finished work to GitHub before testing (user asked 18:41)
- [ ] Measure answer-check + web search speed (Perplexity, Parallel, Firecrawl), make it faster without losing accuracy
- [ ] Voice call: connection must not drop — test a real call (fake mic), network drop + recovery
- [ ] Adversarial tests: bad inputs / injection / huge payloads on every AI route, fix what breaks
- [ ] Research which AI has the most natural Hindi / Indian voice (Perplexity, Parallel, Firecrawl), test it, add it (user asked 18:49)
- [ ] Final report: rating + pros/cons
