import { describe, expect, it, vi } from 'vitest';
import { listStudioItems, saveStudioItem } from '@/lib/studio-store';

describe('Accepted Studio job storage failure', () => {
  it('keeps the accepted job and upload pointer visible without another generation', async () => {
    vi.stubGlobal('indexedDB', { open: () => { throw new Error('quota'); } });
    try {
      const item = { id: 'accepted-job-test', jobId: 'vid_accepted', tool: 'enhance' as const, title: 'Board', createdAt: 1, status: 'queued' as const, progress: 0, uploadPath: 'topaz/source.mp4' };
      await expect(saveStudioItem(item)).rejects.toThrow('quota');
      expect(await listStudioItems()).toContainEqual(item);
    } finally { vi.unstubAllGlobals(); }
  });
});