# Batch-based SnapSolve: Batch Mode + Loophole Tracker

Abhi jo system chal raha hai (tutor, quiz, voice, practice, admin) use chhede bina do naye hisse jodenge. Vedantu par koi login, password ya scraping nahi hoga — aapka material aap khud lecture notes / DPP / test ki photo ya PDF dekar laayenge.

## Step 1 — Batch selector (aaj kis batch ki padhai)

- Home page aur doubt page ke controls mein ek chhota "Batch" chooser: `General NEET` (default, abhi jaisa), `NEET Manthan 2026-27`, `Target Bio 360`.
- Chunav isi device par yaad rahega; Settings mein bhi dikhega.
- Tutor ko batch ka lens milega:
  - Manthan: Physics/Chemistry/Biology full NEET pattern, PYQ style, numerical speed.
  - Bio 360: sirf Biology, NCERT line-by-line, Assertion-Reason aur Match questions par zor.
- Voice call mein bhi yahi batch chalega (call ke beech badalne par bina call kaate lagu hoga, jaise baaki teaching toggles).
- Har naye doubt/quiz thread par batch ka label lagega, taaki baad mein tracking ho sake.

## Step 2 — Loophole / Accuracy Tracker (Saved practice page par)

Har quiz jawab aur practice review se ye nikalega:
- Chapter-wise accuracy (kitne sahi / galat).
- Sabse kamzor 3 chapter, batch-wise filter ke saath.
- Galti ka type: Concept gap, Reading trap (NOT/EXCEPT miss), Calculation, Guess — quiz mein galat jawab ke baad tutor ek chhota tag dega; practice mein "Needs revision" dabane par aap ek tap se type chun sakte hain (optional).
- "Agle test se pehle ye 3 revise karo" list — ek tap se un chapters ka quiz shuru.
- Sab data isi browser mein; Settings → Study data backup mein shamil.
- Koi naya AI kharcha nahi — ginti aur analysis local hoga.

## Kya nahi badlega

- Existing tutor answers, quiz grading (A–D), voice call ka behaviour, admin memory, backups ka format (sirf naye fields jodenge, purane backups chalte rahenge).
- `General NEET` chuna ho to sab kuch bilkul pehle jaisa.

## Baad ke steps (abhi nahi)

- Batch timetable / syllabus roadmap (aap schedule ki photo denge to admin memory mein chapter outline banega).
- Weekly progress report (Word/PDF export).

## Technical details

- New `src/lib/batch.ts`: batch ids, labels, prompt lens text; `useBatchChoice()` hook in `quiz-label-preference.ts` style (localStorage `snapsolve.batch`).
- Client sends `batch` in `/api/chat` body; server validates against allow-list and appends lens to system prompt; unknown → General. Voice: add `batch` to `CallPrefs` + `parseCallPrefs` + `app.settings` merge.
- Thread gets optional `batch` field (`threads.ts`), backward compatible.
- Tutor quiz feedback emits optional `<!-- mistake {"type":"concept|trap|calc|guess","chapter":"..."} -->` tag; parsed + stripped like card tags in `srs.ts`; stored in new local key `snapsolve.attempts.v1` (bounded, last 2000).
- `src/lib/loophole.ts` pure aggregation (accuracy by chapter, top weak, mistake-type mix) + `LoopholeCard` component on `/practice`.
- Backup export/import includes attempts with validation; non-destructive merge.
- Tests: batch allow-list fallback, mistake-tag parsing/stripping, aggregation (weakest chapter ordering, accuracy math), backup round-trip.
- AGENTS.md: one rule for batch lens being server-validated and default General unchanged.
