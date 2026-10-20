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

- [ ] Voice credits out: new key → republish relay + Vercel update (Oct 20)
