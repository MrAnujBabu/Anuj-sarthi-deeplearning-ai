# Workspace move and deployment checklist

## Step 1: Refresh and deploy
- Fresh-link Firecrawl, GitHub API, Parallel and Perplexity after every workspace move.
- Rotate the project LOVABLE_API_KEY; Claude uses this Lovable AI Gateway key, not a separate Anthropic key.
- Securely refresh Vercel encrypted runtime keys and redeploy https://snapsolveanuj.vercel.app/.
- Never commit keys, tokens or environment files to GitHub.
- Automatic code deployments require the Vercel GitHub App installed and this repository linked to the Vercel project. GitHub API access alone is not Lovable Git sync or Vercel Git integration.
- Future workspace moves still require refreshing external hosting secrets; Git pushes do not transfer Lovable secrets automatically.

## Step 2: Verify the live website
- Check Home, Practice, Voice and Admin, then exercise chat, quiz, timer settings, study backup and admin access where authorized.
- Report working, failing and unverified features separately. A page opening does not prove every feature works.
- Do not claim audible voice or locked-screen continuity without a real call.
- Stop AI checks on credit/policy/provider blocks; do not reset persisted pauses automatically.
