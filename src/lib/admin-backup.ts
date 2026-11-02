import { ALL_KINDS } from './import-sources';
import { z } from 'zod';

export const recoveryItemSchema = z.object({
  id: z.string().uuid(), kind: z.enum(ALL_KINDS),
  title: z.string().trim().min(1).max(200), category: z.string().max(200),
  subject: z.string().max(200), chapter: z.string().max(400), content: z.string().max(400000),
  source_url: z.string().max(4000).nullable().optional().refine(v => !v || /^https?:\/\//i.test(v), 'Invalid source URL'),
  file_path: z.string().max(1000).nullable().optional(), mime: z.string().max(200).nullable().optional(),
  tracker_type: z.enum(['mistake', 'good_habit', 'bad_habit']).nullable().optional(),
  frequency: z.number().int().min(1).max(2147483647), active: z.boolean(),
  created_at: z.string().datetime({ offset: true }), updated_at: z.string().datetime({ offset: true }),
}).strip();
export const recoverySettingsSchema = z.object({ brain: z.string().max(20000), quiz_timer_seconds: z.number().int().min(0).max(600), default_mode: z.enum(['solve', 'quiz']) });
export const adminBackupSchema = z.object({
  format: z.literal('snapsolve-admin-memory'), version: z.literal(1),
  exportedAt: z.string().datetime(), items: z.array(recoveryItemSchema).max(10000), settings: recoverySettingsSchema,
}).superRefine((v, ctx) => {
  if (new Set(v.items.map(i => i.id)).size !== v.items.length) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Repeated IDs in backup' });
});
export type AdminBackup = z.infer<typeof adminBackupSchema>;
export type RecoveryItem = z.infer<typeof recoveryItemSchema>;
export function parseAdminBackup(text: string): AdminBackup {
  if (new TextEncoder().encode(text).byteLength > 20 * 1024 * 1024) throw new Error('Backup exceeds 20 MB; use Cloud export for larger libraries.');
  return adminBackupSchema.parse(JSON.parse(text));
}
export function sameRecoveryItem(a: RecoveryItem, b: RecoveryItem) {
  return JSON.stringify(recoveryItemSchema.parse(a)) === JSON.stringify(recoveryItemSchema.parse(b));
}
export function canClearRecoveryItem(backedUp: RecoveryItem, current: RecoveryItem) {
  return !current.file_path && sameRecoveryItem(backedUp, current);
}
export function restorePayload(item: RecoveryItem) {
  // Original binaries are not included in this application-content backup.
  return { ...item, file_path: null, source_url: item.source_url ?? null, mime: item.mime ?? null, tracker_type: item.tracker_type ?? null };
}