# Workspace move handoff — 20 October 2026

## Completed
- GitHub API, Firecrawl, Parallel and Perplexity connections linked in the current Lovable project.
- Supabase project My Personal Agent connected; earlier read found 94 memory items, 1 profile and settings.
- AI key rotation automation documented in WORKSPACE-DEPLOYMENT.md and Lovable project memory.
- Latest move preparation: LOVABLE_API_KEY rotated once; four production Vercel variables updated (LOVABLE_API_KEY, FIRECRAWL_API_KEY, PARALLEL_API_KEY, PERPLEXITY_API_KEY). SUPABASE_* variables untouched.
- Production redeployment dpl_31zAQ6kpK6cACnGSEPH2J5TWHMmA reached READY.
- After redeployment, Home, Practice, Voice and Admin each returned HTTP 200 at https://snapsolveanuj.vercel.app/.
- Earlier AI chat test answered 2+2 correctly with 4. This was not repeated after the latest rotation.

## Failing / blocked
- Last actual voice-answer test returned “Not enough credits”. Rotation does not establish that this billing/spending-limit issue is resolved.
- Home still displays “Cowork · unavailable”.

## Unverified
- Admin authenticated login: sign-in page opens, but no authorized sign-in access was available for a full login check.
- Audible voice, real phone call and locked-screen continuity.
- Quiz, timer settings and backup/restore workflows.

## Next workspace
- The move itself has NOT been performed or verified by this handoff.
- Save VERCEL_TOKEN securely in the destination workspace; never commit credentials.
- Re-link/check all four connections there and run the existing workspace-move checklist.
- Verify destination Supabase access without changing existing data or SUPABASE_* keys.
- Ask before additional credit-spending AI tests. Resolve voice credit/spending-limit access before retesting voice.
- Old rotated key remains valid about one hour; this grace period cannot be shortened.
