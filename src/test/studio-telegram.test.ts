import { describe, expect, it, vi } from 'vitest';
import { encodeTelegramRef, decodeTelegramRef, sendStudioToTelegram } from '@/lib/studio-telegram.server';
import { saveStudioItem } from '@/lib/studio-store';
import 'fake-indexeddb/auto';

describe('Studio Telegram storage', () => {
  it('writes metadata but never generated image/video bytes to device storage', async () => {
    await saveStudioItem({ id: 'telegram-only-test', tool: 'diagram', title: 'Heart', createdAt: 1, status: 'completed', progress: 100, image: 'data:image/png;base64,AA==', video: new Blob(['video']) });
    const db = await new Promise<IDBDatabase>((resolve) => { const r = indexedDB.open('snapsolve-studio', 1); r.onsuccess = () => resolve(r.result); });
    const row = await new Promise<Record<string, unknown>>((resolve) => { const r = db.transaction('items').objectStore('items').get('telegram-only-test'); r.onsuccess = () => resolve(r.result); });
    expect(row['id']).toBe('telegram-only-test');
    expect(row).not.toHaveProperty('image');
    expect(row).not.toHaveProperty('video');
    db.close();
  });
  it('rejects changed preview references', () => {
    vi.stubEnv('STUDIO_TELEGRAM_SIGNING_KEY', 'test-only-not-a-real-key');
    try {
      const token = encodeTelegramRef({ fileId: 'test-file', title: 'Heart', kind: 'image', messageId: 1 });
      expect(decodeTelegramRef(token).fileId).toBe('test-file');
      expect(() => decodeTelegramRef(`X${token}`)).toThrow();
    } finally { vi.unstubAllEnvs(); }
  });
  it('rejects files beyond the Telegram in-app download bound before sending', async () => {
    const file = new Blob([new Uint8Array(20 * 1024 * 1024 + 1)]);
    await expect(sendStudioToTelegram(file, 'Clip', 'video')).rejects.toThrow('20 MB');
  });
});