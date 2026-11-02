import { createServerFn } from '@tanstack/react-start';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { z } from 'zod';
import { adminBackupSchema, recoveryItemSchema, canClearRecoveryItem, restorePayload, type RecoveryItem } from './admin-backup';
import { isDuplicateMemory } from './memory-duplicates';

export const exportAdminMemory = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth]).handler(async ({ context }) => {
    const { data: admin, error: roleError } = await context.supabase.rpc('has_role', { _user_id: context.userId, _role: 'admin' });
    if (roleError || !admin) throw new Error('Access denied');
    const items: RecoveryItem[] = [];
    for (let offset = 0; ; offset += 500) {
      const { data, error } = await context.supabase.from('memory_items').select('*').order('id').range(offset, offset + 499);
      if (error) throw new Error(error.message);
      items.push(...(data ?? []).map(i => recoveryItemSchema.parse(i)));
      if (items.length > 10000) throw new Error('Library too large for device content backup; use Cloud export.');
      if (!data || data.length < 500) break;
    }
    const { data: settings, error } = await context.supabase.from('agent_settings').select('brain,quiz_timer_seconds,default_mode').eq('id', 'main').maybeSingle();
    if (error) throw new Error(error.message);
    const backup = adminBackupSchema.parse({ format: 'snapsolve-admin-memory', version: 1, exportedAt: new Date().toISOString(), items, settings: settings ?? { brain: '', quiz_timer_seconds: 0, default_mode: 'solve' } });
    if (new TextEncoder().encode(JSON.stringify(backup)).byteLength > 20 * 1024 * 1024) throw new Error('Backup exceeds 20 MB; use Cloud export.');
    return backup;
  });

export const restoreAdminMemory = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ items: z.array(recoveryItemSchema).min(1).max(25) }).parse(d))
  .handler(async ({ context, data }) => {
    const { data: admin, error: roleError } = await context.supabase.rpc('has_role', { _user_id: context.userId, _role: 'admin' });
    if (roleError || !admin) throw new Error('Access denied');
    let inserted = 0, skipped = 0;
    for (const item of data.items) {
      const { data: existing, error: readError } = await context.supabase.from('memory_items').select('id,title,content,source_url').or(`id.eq.${item.id}`);
      if (readError) throw new Error(readError.message);
      if (existing?.length) { skipped++; continue; }
      // Read candidates in pages; do not overwrite current memory or settings.
      let duplicate = false;
      for (let offset = 0; ; offset += 500) {
        const { data: candidates, error } = await context.supabase.from('memory_items').select('title,content,source_url').order('id').range(offset, offset + 499);
        if (error) throw new Error(error.message);
        if (candidates?.some(i => isDuplicateMemory({ ...item, source_url: item.source_url ?? null }, i))) { duplicate = true; break; }
        if (!candidates || candidates.length < 500) break;
      }
      if (duplicate) { skipped++; continue; }
      const { error } = await context.supabase.from('memory_items').insert(restorePayload(item));
      if (error) throw new Error(`Restore stopped; earlier batches may be saved. Retry safely. ${error.message}`);
      inserted++;
    }
    return { inserted, skipped };
  });

export const clearBackedUpMemory = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ confirmation: z.literal('CLEAR MEMORY'), items: z.array(recoveryItemSchema).min(1).max(25) }).parse(d))
  .handler(async ({ context, data }) => {
    const { data: admin, error: roleError } = await context.supabase.rpc('has_role', { _user_id: context.userId, _role: 'admin' });
    if (roleError || !admin) throw new Error('Access denied');
    let removed = 0, preserved = 0;
    for (const item of data.items) {
      const { data: current, error } = await context.supabase.from('memory_items').select('*').eq('id', item.id).maybeSingle();
      if (error) throw new Error(error.message);
      // Retained originals need a separate original-file backup; never delete their references here.
      if (!current || !canClearRecoveryItem(item, recoveryItemSchema.parse(current))) { preserved++; continue; }
      const { data: deleted, error: deleteError } = await context.supabase.from('memory_items').delete().eq('id', item.id).eq('updated_at', item.updated_at).select('id');
      if (deleteError) throw new Error(`Cleanup stopped; some earlier rows may be removed. ${deleteError.message}`);
      removed += deleted?.length ?? 0;
      if (!deleted?.length) preserved++;
    }
    return { removed, preserved };
  });