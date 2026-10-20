# Roadmap — workspace move setup

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
- [ ] Call-style voice on Vercel (relay published; push to GitHub)
- [ ] Voice interrupt (barge-in) + locked-screen behaviour
- [ ] Cowork "unavailable" — fix or remove
- [ ] Verify admin login, quiz, timer, backup
- [ ] Data on one device — cloud sync option
- [ ] Vercel token per workspace — reduce
- [ ] Project size — tests guard
