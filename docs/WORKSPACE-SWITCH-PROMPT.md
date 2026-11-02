# Workspace badalne / credits khatam hone ka prompt (copy-paste)

> Jab bhi workspace badlo ya credits khatam ho, neeche wala poora prompt naye project chat me bhejo.

---

Mere Lovable workspace ke credits khatam ho gaye the / maine workspace badla hai. SnapSolve (NEET 2027 doubt + quiz app) ab is workspace me hai. Pichhle workspace ke connections yahan kaam nahi karenge — pichhli baaton ke connections ignore karo. Saare steps khud karo, koi sawal mat poochho. Key values kabhi print/echo/log/file me mat likho.

**0. Pehle padho:** AGENTS.md, PROJECT-MANUAL.md, PROJECT-BRIEF.md, roadmap.md, docs/WORKSPACE-SWITCH-PROMPT.md. Code GitHub repo `MrAnujBabu/Anuj-sarthi-deeplearning-ai` ke root me hai. Helper scripts Files `/mnt/documents/.lovable/scripts/` (vercel.mjs, deploy.mjs, push.mjs) → `/tmp` me copy karo.

**1. Connectors:** Firecrawl, GitHub API, Parallel, Perplexity — `list_connections` se dekho, jo missing/unlinked ho use fresh connect karo (gateway mode). Supabase "My Personal Agent" connector nahi hai — wo project ka external backend hai; sirf check karo ki `SUPABASE_URL` / service-role key kaam kar rahi hai (read-only query). Supabase ko kabhi re-link, reset ya migrate mat karo.

**2. Database check (sirf padhna):** tables memory_items, user_roles, agent settings, AI pause, voice_calls aur private bucket `agent-memory` maujood hain? Row counts batao. Khaali ho to sirf bata do — main export restore karunga. Admin `anujkumar75yadav@gmail.com` ke paas `admin` role hai, confirm karo.

**3. Purani key archive, nayi key live (Vercel `prj_KAfMzNmicHwaDYbuv9Kmi6mTvvoX`, team `team_TRTXKvVxmn5degOgP8YtYDz7`):**
   - Pehle purani `LOVABLE_API_KEY` ki value ko encrypted env `LOVABLE_API_KEY_ARCHIVED` (production) me copy karo — rollback ke liye. Value screen pe mat dikhao.
   - Phir ye 4 keys `PATCH /v10/projects/{pid}/env/{envId}` se naye workspace ki values par update karo: LOVABLE_API_KEY, FIRECRAWL_API_KEY, PARALLEL_API_KEY, PERPLEXITY_API_KEY (type `encrypted`).
   - `SUPABASE_*` aur `VERCEL_TOKEN` ko kabhi haath mat lagao.
   - Agar nayi key fail ho to `LOVABLE_API_KEY_ARCHIVED` se wapas restore karo aur batao.

**4. Redeploy:** Vercel production redeploy karo, READY tak wait karo, phir `/`, `/practice`, `/voice`, `/admin` ka HTTP 200 verify karo.

**5. Voice relay republish:** live voice relay Lovable publish par chalta hai — purane publish par purani key rehti hai. Is project ko republish karo. Verify: `/api/public/live` par WebSocket probe se fake SDP bhejo — "transport must contain a WebRTC audio SDP offer" aaye to key sahi hai. "not registered" aaye to step 6.

**6. Key rotate ka niyam:** `LOVABLE_API_KEY` sirf tab rotate karo jab key leak hui ho ya error ho "LOVABLE_API_KEY is not registered for this project". Ek error par sirf ek baar. Warna kabhi rotate mat karo — rotate karne se purani key ~1 ghante me band ho jaati hai.

**7. Credits khatam = key ki problem nahi.** 402 / "out of credits or spending limit" pe rotate mat karo. Mujhe bolo: Settings → Plans & credits me top-up karo, ya workspace AI usage limit badhao. "Unknown model" ko credit ki kami mat samjho — wo model id ki galti hai. AI ruk jaye to saved practice bina AI ke chalti rahni chahiye.

**8. Live test:** ek asli tutor jawab (Claude Fable 5.1), quiz mode me option select, PDF se quiz, answer-check, read-aloud. Anthropic/Claude wale hisse bina mere kahe mat badlo. Jo toote use minimal fix karo, tests chalao, GitHub par commit karo, Vercel redeploy karo.

**Report (Hinglish, simple):** kaunse connectors jode, DB row counts + admin role, Vercel deploy status + 4 pages, relay probe result, live test results, aur kya cheez credits/provider limit par tiki hai.

---

## Kyon (seekh)
- Credits khatam hone pe key galat nahi hoti — naye workspace ki key Vercel me daalna kaafi hai.
- Rotate se purani key turant nahi, ~1 ghante me band hoti hai; archived copy se rollback safe rahta hai.
- Relay purane publish ki key use karta hai — republish zaroori.
- Voice calls credits-limit pe kat-ti hain: ye provider/workspace limit hai, code se theek nahi hota.
