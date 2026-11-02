# SnapSolve — NEET 2027 study companion

[Open SnapSolve](https://snapsolveneet.lovable.app) · [Original NEET Sarathi app](https://anujsarthiai.streamlit.app/) · [Naveen Bharat platform](https://naveenbharatlog-in.vercel.app/)

Photograph a question, get a step-by-step NCERT explanation from Claude, and continue in the same doubt thread. Covers Class 11 and 12 Physics, Chemistry and Biology. AI can make mistakes: check important facts against NCERT and official NTA notices.

## Study tools

- Photo, MCQ, diagram and formula doubt solving with follow-up chat.
- Quiz mode: selectable answers, hints, skip, scoring and an admin-configurable timer.
- Credit-free saved-question practice and spaced-repetition cards. New tutor answers, AI document extraction and live searches may use credits.
- Visible Search switch: Perplexity and Parallel find current information; Firecrawl reads links and provides extraction fallbacks. Sources appear in answers; Search is disabled in quiz mode.
- Reply toolbar: like/dislike, copy and sharing.
- Obsidian export: markdown notes or a vault ZIP containing notes, index and available photo/PDF files in `attachments/`, with relative wiki links. Files no longer available in the browser cannot be recovered by export.
- Private `/admin`: tutor role, notes, links, files, mistakes, weak topics, habits, syllabus memory, quiz timer and default mode. Admin memory and uploaded originals are admin-only.

## Storage and backups

Doubts and feedback stay in browser localStorage; PDF attachments use IndexedDB. Admin memory/settings and private originals use Lovable Cloud. Active relevant memory is included in tutor instructions with a size cap; this is not model training.

Keep separate backups of **source code**, **Cloud data and uploaded originals**, and **browser study data/Obsidian attachments**. This source export does not include production database rows, private files, secrets or browser history.

`data/imported-pcb.json` contains 84 chapters extracted from the original `app.py`: Physics 27, Chemistry 25, Botany 17 and Zoology 15. Admin memory uses Biology for Botany/Zoology and retains their original branch in each note. This user-provided study outline is **not a verified official NTA 2027 syllabus**.

## Repository layout and local setup

SnapSolve is the main application at the repository root (`package.json`, `src/`, `public/`). The previous Python app is archived under `legacy/` and is not part of the web deployment. Do not set the Vercel Root Directory to `snapsolve`.

```sh
git clone https://github.com/MrAnujBabu/Anuj-sarthi-deeplearning-ai.git
cd Anuj-sarthi-deeplearning-ai
bun install
bun run dev
bun run test
```

React 19, TanStack Start, TypeScript, Tailwind CSS and Lovable Cloud; server deployment targets Cloudflare Workers. A separate deployment needs its own Cloud/auth/storage configuration and server credentials for Lovable AI, Firecrawl, Parallel and Perplexity. Copying source does not provision or transfer these services. Never commit `.env` or private credentials. The GitHub API export is a one-time copy, **not automatic two-way Git sync**.

## Vercel deployment

Import this repository with **Root Directory left at the repository root** and framework **TanStack Start**. `vercel.json` uses `bun install --frozen-lockfile` and `bun run build:vercel`; `vite.vercel.config.ts` selects Nitro's Vercel preset and retains the existing SSR entry. Leave Output Directory at its framework default; do not use a static `dist` directory or SPA rewrites for this full-stack app.

**A source move alone does not make every service work on Vercel.** Browser configuration needs `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` for the target backend. Server authentication needs the corresponding `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY`. The current memory, agent settings and persistent AI-pause implementations also depend on a privileged server client. That privileged credential is managed internally by Lovable Cloud and is not available to export; do not substitute a publishable key or expose any privileged key to the browser. A fully independent Vercel deployment needs an appropriately provisioned backend or a deliberately redesigned, authenticated service boundary.

AI/search connections and their credentials are not automatically copied to Vercel. Their external-host access must be confirmed separately. Set private credentials only through the hosting service's environment settings, never in the repository. Configure permitted auth redirect origins for the eventual Vercel URL. Database migrations and private uploaded files require separate transfer and checks; do not run them blindly against production.

This setup is source configuration, not proof of a successful Vercel deployment. Verify a deployed preview's page reloads, sign-in, `/admin` read/write, `/api/chat` streaming, live search and attachment access before treating it as production-ready. Browser study history is origin-specific and must be exported/imported when moving domains.

## Future vision — Naveen Bharat

The original vision is retained: **Build Your Own AI Tutor on Mobile** book, offline courses on prompt engineering and logic building, contributor opportunities, and voice interaction. These are future ideas, not implemented feature claims. Cowork background tasks still require a connected background service.

[Visit Naveenbharatprism](https://naveenbharatlog-in.vercel.app/) · [Legacy Streamlit app](https://anujsarthiai.streamlit.app/)

Developed by Anuj, with [Lovable](https://lovable.dev).

---

## Original future-project vision (preserved)

## : Naveen Bharat Platform 🇮🇳

Yeh project sirf shuruwat hai. Hamara lakshya (Goal) bada hai:

1. **📘 Book:**
   * Hum jald hi ek book launch karenge: *"Build Your Own AI Tutor on Mobile"* logic par.
   * Isme hum ye sikhaenge ki kaise bina heavy coding background ke, Logic aur AI ke dam par problems solve ki jati hain.
2. **🎓 Offline Course Integration:**
   * **Naveen Bharat** platform ke under hum students ko "Ratta Maarna" nahi, balki "AI Tools Banana" sikhaenge.
   * **Contributor** :- To Genrate Employee ment and Job
   * Students will learn **Prompt Engineering** and **Logic Building** to create their own subject-specific bots.
3. **Next Tech Upgrade:**
   * Voice Interaction (Baat karne wala Dr. Sharma).
   * Image Analysis (Question ki photo khinch kar solution).

## 🤝 Contributing

Contributions are welcome! Agar aapke paas naye "Traps" ya "Deepthink Layers" ke ideas hain, to Pull Request bhejein.

**Developed with ❤️ & Logic by Anuj**
*visit our platform [Naveenbharatprism](https://naveenbharatlog-in.vercel.app/)🇮🇳
