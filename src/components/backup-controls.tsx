import { useRef, useState } from 'react';
import { Download, Upload, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { exportStudy, importStudy, parseStudyBackup } from '@/lib/backup';
import { clearThreadMedia } from '@/lib/threads';
import { clearDocumentStore } from '@/lib/doc-store';
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel } from '@/components/ui/alert-dialog';
export function BackupControls() {
  const input=useRef<HTMLInputElement>(null);
  const [status,setStatus]=useState('');
  const [busy,setBusy]=useState(false);
  const [confirmOpen,setConfirmOpen]=useState(false);
  return <div className="space-y-2">
    <div className="flex gap-2">
      <Button variant="ghost" size="sm" disabled={busy} onClick={async()=>{setBusy(true);try{await exportStudy();setStatus('Study backup downloaded.');}catch{setStatus('Backup failed. Please try again.');}finally{setBusy(false);}}}><Download className="size-4"/>Backup</Button>
      <Button variant="ghost" size="sm" disabled={busy} onClick={()=>input.current?.click()}><Upload className="size-4"/>Restore</Button>
    </div>
    <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
      <AlertDialogTrigger asChild><Button variant="ghost" size="sm" disabled={busy}><Trash2 className="size-4"/>Clear uploaded media</Button></AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogTitle>Clear uploaded media from this browser?</AlertDialogTitle>
        <AlertDialogDescription>Removes saved photos, PDFs and extracted document text from all chats on this device, including unused PDFs. Questions, answers and revision cards stay. Admin Cloud files and external originals are untouched. Download a Backup first; close other SnapSolve tabs. Removed documents must be uploaded again for follow-up questions.</AlertDialogDescription>
        <AlertDialogFooter><AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel><Button disabled={busy} onClick={async()=>{setBusy(true);try{clearThreadMedia();await clearDocumentStore();window.location.reload();}catch(err){setStatus(err instanceof Error?err.message:'Cleanup failed. Try again.');setConfirmOpen(false);}finally{setBusy(false);}}}>Clear media, keep answers</Button></AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    <input ref={input} type="file" accept="application/json,.json" aria-label="Import study backup" className="hidden" onChange={async e=>{const f=e.target.files?.[0];if(!f)return;setBusy(true);try{importStudy(parseStudyBackup(await f.text()));setStatus('Saved study restored. Existing items kept.');}catch(err){setStatus(err instanceof Error?err.message:'Import failed.');}finally{setBusy(false);e.target.value='';}}}/>
    {status && <p role="status" className="px-2 text-xs text-muted-foreground">{status}</p>}
  </div>;
}