import { useRef, useState } from 'react';
import { Download, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { exportStudy, importStudy, parseStudyBackup } from '@/lib/backup';
export function BackupControls() {
  const input=useRef<HTMLInputElement>(null);
  const [status,setStatus]=useState('');
  const [busy,setBusy]=useState(false);
  return <div className="space-y-2">
    <div className="flex gap-2">
      <Button variant="ghost" size="sm" disabled={busy} onClick={async()=>{setBusy(true);try{await exportStudy();setStatus('Study backup downloaded.');}catch{setStatus('Backup failed. Please try again.');}finally{setBusy(false);}}}><Download className="size-4"/>Backup</Button>
      <Button variant="ghost" size="sm" disabled={busy} onClick={()=>input.current?.click()}><Upload className="size-4"/>Restore</Button>
    </div>
    <input ref={input} type="file" accept="application/json,.json" aria-label="Import study backup" className="hidden" onChange={async e=>{const f=e.target.files?.[0];if(!f)return;setBusy(true);try{importStudy(parseStudyBackup(await f.text()));setStatus('Saved study restored. Existing items kept.');}catch(err){setStatus(err instanceof Error?err.message:'Import failed.');}finally{setBusy(false);e.target.value='';}}}/>
    {status && <p role="status" className="px-2 text-xs text-muted-foreground">{status}</p>}
  </div>;
}