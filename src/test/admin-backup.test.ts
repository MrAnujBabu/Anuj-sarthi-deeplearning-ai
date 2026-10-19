import { describe, it, expect } from 'vitest';
import { adminBackupSchema, parseAdminBackup, sameRecoveryItem, restorePayload, canClearRecoveryItem } from '../lib/admin-backup';
const item = { id: '01234567-89ab-4cde-8fab-0123456789ab', kind: 'file' as const, title: 'Physics', category: 'General', subject: 'Physics', chapter: '', content: 'F = ma', frequency: 1, active: true, created_at: '2026-10-19T04:00:00.000Z', updated_at: '2026-10-19T04:00:00.000Z', file_path: null };
const backup = { format: 'snapsolve-admin-memory', version: 1, exportedAt: item.updated_at, items: [item], settings: { brain: 'Tutor', quiz_timer_seconds: 30, default_mode: 'quiz' } };
describe('admin device recovery safety', () => {
  it('round trips memory content and agent settings', () => { const result = parseAdminBackup(JSON.stringify(backup)); expect(result.items[0]?.content).toBe('F = ma'); expect(result.settings.quiz_timer_seconds).toBe(30); });
  it('rejects unrelated study backups and malformed items', () => { expect(() => parseAdminBackup('{"format":"study"}')).toThrow(); expect(() => adminBackupSchema.parse({ ...backup, items: [{ ...item, id: 'bad' }] })).toThrow(); });
  it('rejects duplicate IDs before cleanup or restore', () => { expect(() => adminBackupSchema.parse({ ...backup, items: [item, item] })).toThrow(); });
  it('accepts database UTC-offset timestamps without losing precision', () => { const timestamp = '2026-10-19T04:00:00.123456+00:00'; const result = adminBackupSchema.parse({ ...backup, items: [{ ...item, updated_at: timestamp }] }); expect(result.items[0]?.updated_at).toBe(timestamp); });
  it('preserves changed content instead of approving deletion', () => { expect(sameRecoveryItem(item, { ...item, content: 'Changed answer' })).toBe(false); expect(sameRecoveryItem(item, item)).toBe(true); });
  it('does not restore dangling original-file references', () => { expect(restorePayload({ ...item, file_path: 'private.pdf' }).file_path).toBeNull(); expect(restorePayload(item).content).toBe('F = ma'); });
  it('preserves original-file entries even when the text backup matches', () => { const retained = { ...item, file_path: 'original.pdf' }; expect(canClearRecoveryItem(retained, retained)).toBe(false); expect(canClearRecoveryItem(item, item)).toBe(true); });
});