import { useRef, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { Check, Loader2, Send } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { patchStudioItem, type StudioItem } from '@/lib/studio-store';

export function TelegramSave({ item }: { item: StudioItem }) {
  const [busy, setBusy] = useState(false);
  const [needsSignIn, setNeedsSignIn] = useState(false);
  const lock = useRef(false);
  async function save() {
    if (lock.current || item.telegramRef) return;
    lock.current = true; setBusy(true);
    try {
      const { data } = await supabase.auth.getSession();
      if (!data.session) { setNeedsSignIn(true); return; }
      const fresh = item.imagePath && Date.now() - item.createdAt < 24 * 60 * 60 * 1000 ? `/api/studio-image?path=${encodeURIComponent(item.imagePath)}` : null;
      const source = item.image ?? fresh ?? (item.jobId ? `/api/studio-video-file?id=${encodeURIComponent(item.jobId)}` : null);
      let blob = item.video;
      if (!blob && source) {
        const res = await fetch(source);
        if (!res.ok) throw new Error('Output download nahi hua. Generate dobara na karein.');
        blob = await res.blob();
      }
      if (!blob) throw new Error('Output abhi available nahi hai.');
      if (blob.size > 20 * 1024 * 1024) throw new Error('Telegram se app preview ke liye output 20 MB tak hona chahiye.');
      const form = new FormData();
      form.set('file', blob, item.tool === 'diagram' ? 'image.png' : 'video.mp4');
      form.set('title', item.title); form.set('kind', item.tool === 'diagram' ? 'image' : 'video');
      const res = await fetch('/api/studio-telegram', { method: 'POST', headers: { Authorization: `Bearer ${data.session.access_token}` }, body: form });
      const result: { token?: string; messageUrl?: string; error?: string } = await res.json();
      if (!res.ok || !result.token) throw new Error(result.error || 'Upload confirm nahi hua. Telegram channel check karein.');
      await patchStudioItem(item.id, { telegramRef: result.token, telegramUrl: result.messageUrl, image: undefined, video: undefined });
      toast.success('Telegram channel mein saved.');
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Telegram save nahi hua.'); }
    finally { lock.current = false; setBusy(false); }
  }
  // Images live only in the open session (never stored on the device); after a reload there is nothing to upload.
  const lost = !item.telegramRef && !item.image && !item.video && !item.jobId && !(item.imagePath && Date.now() - item.createdAt < 24 * 60 * 60 * 1000);
  if (lost) return <p className="text-xs text-muted-foreground">Yeh image ab available nahi hai (24 ghante khatam ya purani image). Nayi image banakar "Save to Telegram" dabaiye.</p>;
  return <div className="flex flex-wrap items-center gap-2"><Button type="button" size="sm" variant="outline" disabled={busy || !!item.telegramRef} onClick={() => void save()}>
    {busy ? <Loader2 className="size-4 animate-spin" /> : item.telegramRef ? <Check className="size-4" /> : <Send className="size-4" />}
    {busy ? 'Uploading…' : item.telegramRef ? 'Saved to Telegram' : 'Save to Telegram'}
  </Button>{needsSignIn && <Button asChild size="sm"><Link to="/admin">Admin sign in</Link></Button>}</div>;
}