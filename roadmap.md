# Roadmap

## Done
- [x] Import the app from GitHub repo MrAnujBabu/Anuj-sarthi-deeplearning-ai into this project
- [x] Link GitHub, Firecrawl, Parallel, Perplexity in the current workspace (last re-linked Nov 6, 11:21 UTC)
- [x] End-to-end deep test of the whole app (all pages, quiz, voice, YouTube transcript, admin, practice)
- [x] Deep Scan fixed (wider search, per-page check)
- [x] Fix quiz option selection and voice quiz synchronization
- [x] Fix Hindi voice-over repeating the last line twice (backup voice)
- [x] Skip Sarvam when it is not connected (no failing 503 speech requests)
- [x] Daily study progress on home: doubts today, streak, last 7 days, due cards
- [x] Home polish: dead "Cowork" button removed, subject starters, quick tools, recent doubts
- [x] Sidebar: Mera Batch link
- [x] Saved practice upgrade: stats, box progress, keyboard shortcuts, empty/complete states, review logging
- [x] Fix broken SnapSolve logo/icon on the phone (small logo, real favicon, home-screen icons)
- [x] AI Studio: ByteDance diagram/poster (Seedream 5 Pro), ByteDance concept animation (Seedance 2.5), Topaz video clean-up (Starlight) — each with its own on/off toggle in the tool and in Settings, gallery on the device, "Diagram/Animation banao" shortcuts on tutor answers
- [x] End-to-end test (Nov 6): doubt answer, quiz, home progress, practice, real ByteDance diagram + animation, Topaz 1080p clip
- [x] Commit changes to the GitHub repo (MrAnujBabu/snapsolveanujsarti)

## Ready next
- [x] Screenshot showed signed-out Telegram save without a sign-in action. Added Admin sign in link beside Save and AI Studio return link; mobile navigation verified. Real authenticated save remains unverified (external unmanaged auth).
- [ ] Commit Telegram storage and animation-length changes to GitHub after verification
- [x] Concept Animation: 30 sec enabled and mobile selection/server validation tested; 60 sec shown disabled because one Seedance generation supports at most 30 sec. No paid generation tested: ByteDance disabled in current workspace.
- [x] AI Studio: Save to Telegram button, session-only media, persisted metadata/signed references; My Snapsolve Database bot/channel posting verified. Small real image uploaded and read back via gateway; mobile button/401 guard verified. Signed-in end-to-end save unavailable with external unmanaged auth.
- [ ] 60 sec composed animation — requires separate multi-clip composition flow; not implemented or tested
- [x] Commit latest Studio recovery fixes to GitHub main: 43c84836 (Nov 6)
- [x] Fix Studio busy recovery: provider wait-time, countdown, duplicate request guard and polling backoff; verified with simulated 429, no paid generation
- [x] Preserve accepted Studio jobs if device saving fails; retain Topaz source when a submission outcome is unknown
- [ ] Studio: "Add to practice" for generated diagrams (image flashcards in the practice deck)

## Waiting on the user
- [ ] Admin account — admin email must sign up via "Pehli baar? Account banao" (signed-in checks not possible from here)
- [ ] Link Sarvam voice (credits finished) and Google Sheets (declined)
- [ ] Vedantu login for "Sync now" (declined)
- [ ] Workspace credits are low — tutor answers, voice calls, Deep Scan and AI Studio stop when they run out
- [ ] Existing data (admin memory, user accounts) — waiting on export from the old project

- [x] Auto-clear stale AI credits pause when project/key moves or credits return
- [x] Explain ByteDance + Topaz Labs and how they run through the AI Gateway
- [x] Make AI Studio picture-making (Seedream) faster with good output
- [x] Fix "Output abhi available nahi hai" error
- [x] AI Studio work survives page refresh (keeps running in background)
- [x] Reconnect Perplexity, Firecrawl, Parallel in new workspace and test
- [x] Fix label check blocked by "Ek AI request shuru ho rahi hai"
- [ ] Git commit request (Lovable saves automatically; GitHub push needs reconnect)
