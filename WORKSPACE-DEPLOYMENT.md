# Workspace move and deployment checklist

## Lovable agent: one-prompt automation
When the owner says "rotate AI key" (or "workspace move"), the Lovable agent runs everything below automatically, without asking:
1. Link GitHub API, Firecrawl, Parallel and Perplexity to the Lovable project (connect any that are missing).
2. Rotate the project LOVABLE_API_KEY once. Claude uses this Lovable AI Gateway key, not a separate Anthropic key. The old key stays valid about 1 hour.
3. Using the VERCEL_TOKEN project secret (own-account scope), update these Vercel env vars on project "snapsolve": LOVABLE_API_KEY, FIRECRAWL_API_KEY, PARALLEL_API_KEY, PERPLEXITY_API_KEY. Never print values. Do not touch SUPABASE_* keys.
4. Redeploy the latest production deployment and wait until READY.
5. Run Step 2 below and report.
If Vercel rejects the token, the agent opens the secure token form again.

## Step 1: Refresh and deploy
- Fresh-link Firecrawl, GitHub API, Parallel and Perplexity after every workspace move.
- Rotate the project LOVABLE_API_KEY; Claude uses this Lovable AI Gateway key, not a separate Anthropic key.
- Securely refresh Vercel encrypted runtime keys and redeploy https://snapsolveanuj.vercel.app/.
- Never commit keys, tokens or environment files to GitHub.
- Automatic code deployments require the Vercel GitHub App installed and this repository linked to the Vercel project. GitHub API access alone is not Lovable Git sync or Vercel Git integration.
- Future workspace moves still require refreshing external hosting secrets; Git pushes do not transfer Lovable secrets automatically. A new workspace also needs the VERCEL_TOKEN secret saved again.

## Step 2: Verify the live website
- Check Home, Practice, Voice and Admin, then exercise chat, quiz, timer settings, study backup and admin access where authorized.
- Report working, failing and unverified features separately. A page opening does not prove every feature works.
- Do not claim audible voice or locked-screen continuity without a real call.
- Stop AI checks on credit/policy/provider blocks; do not reset persisted pauses automatically.
