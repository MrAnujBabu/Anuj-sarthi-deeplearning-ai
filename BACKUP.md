# SnapSolve backup and moving guide

## Before moving or remixing

Keep four separate copies. A source ZIP alone does not include your Cloud data.

1. **Code:** use the supplied source ZIP, or connect GitHub from Project settings → Git. GitHub keeps the code, not database records or uploaded files.
2. **Saved study in this browser:** open SnapSolve and click **Backup**. Keep the downloaded `snapsolve-study-backup.json`. It contains saved conversations, revision cards, photos and PDFs that are still available in this browser. Click **Restore** in the destination app to import it. Existing items with the same ID are kept. Large backups may exceed browser storage; a failed import keeps existing data intact. If a PDF was already missing, the backup cannot recover it.
3. **Cloud database and accounts:** More → Database → Manage → Settings → Export project data → Export data → Database → Export → Start export. Download the export from the emailed link or More → Storage. The backend must be running. One export per 24 hours; database limit 15 GB and export limit 5 GB. This export includes database structure, records and user accounts with password hashes.
4. **Cloud uploaded files:** download these separately from More → Storage. They are not included in the database export or daily backups.

Cloud exports do not contain secrets, sign-in provider settings, API keys or function code. Reconfigure these securely at the destination. Never put private keys in a source ZIP or study backup.

## Transfer is not the same as remix

Do not assume a workspace move preserves Cloud without confirming the current transfer behavior with Lovable support. A remix is a separate project; it copies backend structure without existing database records. Keep the original project until the destination's sign-in, saved records, attachments and AI answers are verified.

The Cloud Backups page restores the same project's database only. Daily database backups are kept for roughly 14 days; no arbitrary point-in-time restore is offered. Restore loses changes made after the selected snapshot and reverts the schema too. Export the current state before restoring. Storage files are not covered.

## Running the source elsewhere

This is a TanStack Start application. Install dependencies and configure the supported deployment runtime. Source contains database migrations, not a populated database. Recreate a compatible backend, apply migrations, restore the database export and files, and configure sign-in providers and secrets securely. Existing browser study data must be imported on the new origin.

The AI tutor requires `LOVABLE_API_KEY` and a valid Lovable project context, plus configured research connections. To use a different hosting/provider setup, adapt the server configuration deliberately; a ZIP does not carry working service credentials.

## AI credit pause recovery

Saved practice makes no new AI calls. New AI answers still need available workspace AI credits and enabled model access. After a credit or provider denial, SnapSolve stores a server-side pause; there is no automatic retry or public reset. After the owner restores credits/access, ask the project maintainer to clear the relevant `ai_pause_state` row securely, then start a fresh request. Provider refusals stop only the current request.

## Not yet active

Cowork tasks that continue after closing the app are unavailable because the background service connection was declined. The disabled Cowork control does not run work.

## Uploaded database ZIP checked on 18 October 2026

`snapsolveneet_261018.backup.zip` contains one PostgreSQL custom-format database backup, not application source. Its uncompressed backup is already listed in the private Cloud export bucket (310,164 bytes). The original ZIP is preserved unchanged in Files. No restore was performed, and the export's recoverability has not been tested. Storage metadata in a database export is not uploaded-file content. Keep code, uploaded file bytes, browser study JSON, and sign-in/service settings separately. This backup may contain account information; do not publish it or add it to public app assets.