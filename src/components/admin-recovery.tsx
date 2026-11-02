import { useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { Download, ArchiveRestore, Trash2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { parseAdminBackup, type AdminBackup } from '@/lib/admin-backup';
import { exportAdminMemory, restoreAdminMemory, clearBackedUpMemory } from '@/lib/admin-recovery.functions';
import { saveAgentSettings } from '@/lib/memory.functions';

export function AdminRecovery({ onChanged }: { onChanged: () => void }) {
  const exportMemory = useServerFn(exportAdminMemory), restore = useServerFn(restoreAdminMemory), clear = useServerFn(clearBackedUpMemory), settings = useServerFn(saveAgentSettings);
  const [prepared, setPrepared] = useState<AdminBackup | null>(null), [verified, setVerified] = useState<AdminBackup | null>(null);
  const [busy, setBusy] = useState(false), [message, setMessage] = useState(''), [confirmation, setConfirmation] = useState('');
  async function run(action: () => Promise<void>) {
    setBusy(true); setMessage('');
    try { await action(); } catch (e) { setMessage(e instanceof Error ? e.message : 'Operation failed'); } finally { setBusy(false); }
  }
  function download() {
    if (!prepared) return;
    const url = URL.createObjectURL(new Blob([JSON.stringify(prepared, null, 2)], { type: 'application/json' }));
    const a = document.createElement('a'); a.href = url; a.download = `snapsolve-admin-${prepared.exportedAt.slice(0, 10)}.json`; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 30000);
    setMessage('Download requested. Reopen the saved file below before cleanup.');
  }
  return <section className="space-y-4 border-t border-border pt-8">
    <h2 className="font-display text-2xl">Backup & recovery</h2>
    <p className="text-sm text-muted-foreground">Admin memory text, links और agent settings का device backup। Original files, accounts, student chats, secrets और AI credits इसमें नहीं हैं। Full database backup: Lovable Cloud → Database → Manage → Settings → Export data; original files अलग से Storage से download करें।</p>
    <div className="flex flex-wrap gap-2">
      <Button variant="outline" disabled={busy} onClick={() => run(async () => { setPrepared(await exportMemory()); setMessage('Backup ready. Download and keep this file safe.'); })}><RefreshCw />Prepare backup</Button>
      <Button disabled={busy || !prepared} onClick={download}><Download />Download backup</Button>
    </div>
    <label className="block space-y-2 text-sm">Open saved admin backup
      <Input type="file" accept=".json,application/json" disabled={busy} onChange={e => {
        const file = e.target.files?.[0]; setVerified(null); setConfirmation('');
        if (!file) return;
        void run(async () => { if (file.size > 20 * 1024 * 1024) throw new Error('Backup exceeds 20 MB'); const backup = parseAdminBackup(await file.text()); setVerified(backup); setMessage(`Verified ${backup.items.length} memory items. ${backup.items.filter(i => i.file_path).length} original-file references; binaries are not included.`); });
      }} />
    </label>
    {verified && <div className="space-y-3">
      <p className="text-sm">{verified.items.length} items · {verified.exportedAt} · Restore merges missing memory; existing items are not overwritten. Original files are not restored.</p>
      <div className="flex flex-wrap gap-2"><Button variant="outline" disabled={busy} onClick={() => run(async () => {
        let inserted = 0, skipped = 0;
        for (let i = 0; i < verified.items.length; i += 25) { const result = await restore({ data: { items: verified.items.slice(i, i + 25) } }); inserted += result.inserted; skipped += result.skipped; }
        setMessage(`Restored ${inserted}; skipped ${skipped}. Settings unchanged.`); onChanged();
      })}><ArchiveRestore />Restore missing memory</Button>
      <Button variant="outline" disabled={busy} onClick={() => run(async () => {
        if (!window.confirm('Replace current agent brain, quiz timer and default mode with this backup?')) return;
        await settings({ data: verified.settings }); setMessage('Agent settings restored.'); onChanged();
      })}>Restore agent settings</Button></div>
      <p className="text-sm text-destructive">Cleanup is permanent. Only unchanged text-only items in this verified backup are removed. New/changed items and original-file entries stay. Accounts, settings, student practice and AI pause are not reset.</p>
      <Input aria-label="Cleanup confirmation" placeholder="Type CLEAR MEMORY" value={confirmation} onChange={e => setConfirmation(e.target.value)} disabled={busy} />
      <Button variant="destructive" disabled={busy || confirmation !== 'CLEAR MEMORY' || !verified.items.length} onClick={() => run(async () => {
        if (!window.confirm('Permanently remove backed-up, unchanged text-only admin memory? Keep your downloaded backup safe.')) return;
        let removed = 0, preserved = 0;
        for (let i = 0; i < verified.items.length; i += 25) { const result = await clear({ data: { confirmation: 'CLEAR MEMORY', items: verified.items.slice(i, i + 25) } }); removed += result.removed; preserved += result.preserved; }
        setMessage(`Removed ${removed}; preserved ${preserved}. Restore missing memory to bring it back.`); setConfirmation(''); setPrepared(null); onChanged();
      })}><Trash2 />Clear backed-up memory</Button>
    </div>}
    {busy && <p role="status" className="text-sm text-muted-foreground">Working… Keep this page open.</p>}
    {message && <p role="status" className="break-words text-sm">{message}</p>}
  </section>;
}