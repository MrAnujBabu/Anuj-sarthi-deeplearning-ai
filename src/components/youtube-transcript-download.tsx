import { useState } from 'react';
import { FileDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { downloadBlob } from '@/lib/transcript-export';
import type { YouTubeResult } from '@/lib/youtube-study-store';

/** Download the Hindi explanation (and the source transcript, when present) as a markdown file. */
export function YouTubeTranscriptDownload({ result, transcript, disabled }: {
  result: YouTubeResult; transcript: string; disabled: boolean;
}) {
  const [error, setError] = useState('');

  function download() {
    try {
      const title = result.title?.trim() || 'YouTube transcript';
      const parts = [`# ${title}`, '', '## सरल Hindi explanation', '', result.hindi.trim()];
      const source = transcript.trim();
      if (source) parts.push('', '## Original transcript', '', source);
      const blob = new Blob([`${parts.join('\n')}\n`], { type: 'text/markdown;charset=utf-8' });
      const slug = (result.videoId ?? title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40)) || 'transcript';
      downloadBlob(`snapsolve-transcript-${slug}.md`, blob);
      setError('');
    } catch {
      setError('Transcript save नहीं हुआ। दोबारा कोशिश करें।');
    }
  }

  return (
    <div className="space-y-2">
      <Button variant="outline" disabled={disabled || !result.hindi.trim()} onClick={download}>
        <FileDown className="size-4" />Transcript (.md) download करो
      </Button>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
