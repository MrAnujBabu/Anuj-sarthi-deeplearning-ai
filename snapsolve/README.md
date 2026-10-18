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

The original `app.py` and `requirements.txt` remain at the repository root. The complete SnapSolve web app lives in `snapsolve/`; these are separate applications.

```sh
git clone https://github.com/MrAnujBabu/Anuj-sarthi-deeplearning-ai.git
cd Anuj-sarthi-deeplearning-ai/snapsolve
bun install
bun run dev
bun run test
```

React 19, TanStack Start, TypeScript, Tailwind CSS and Lovable Cloud; server deployment targets Cloudflare Workers. A separate deployment needs its own Cloud/auth/storage configuration and server credentials for Lovable AI, Firecrawl, Parallel and Perplexity. Copying source does not provision or transfer these services. Never commit `.env` or private credentials. The GitHub API export is a one-time copy, **not automatic two-way Git sync**.

## Future vision — Naveen Bharat

The original vision is retained: **Build Your Own AI Tutor on Mobile** book, offline courses on prompt engineering and logic building, contributor opportunities, and voice interaction. These are future ideas, not implemented feature claims. Cowork background tasks still require a connected background service.

[Visit Naveenbharatprism](https://naveenbharatlog-in.vercel.app/) · [Legacy Streamlit app](https://anujsarthiai.streamlit.app/)

Developed by Anuj, with [Lovable](https://lovable.dev).
