import { describe, expect, it, vi } from 'vitest';
vi.mock('@/lib/voice-tracking.server', () => ({ createVoiceTracking: () => () => {} }));
vi.mock('@/lib/ai/pause.server', () => ({ getAiPause: async () => null, setAiPause: async () => {} }));
import { createBatchTools } from '@/lib/vedantu/batch-tools.server';
import { formatBatchSnapshot } from '@/lib/vedantu/context.server';
import { parseCallPrefs } from '@/lib/live-relay.server';

const cls = (id: string, starts: string, extra: Record<string, unknown> = {}) => ({
  enrollment_id: 'e', session_id: id, batch_id: 'b', subject: 'Botany', chapter: 'Morphology', title: `Class ${id}`, description: '', teacher: 'Sir',
  starts_at: starts, ends_at: null, attended_seconds: 0, has_notes_pdf: false, has_smart_notes: true, course_title: 'MANTHAN', ...extra,
});
const overview = {
  courses: [{ title: 'MANTHAN 4.0' }], sync: { counts: { warnings: 0 } },
  todayClasses: [cls('today1', '2026-10-23T05:00:00Z')],
  upcomingClasses: [cls('up1', '2026-10-24T05:00:00Z', { subject: 'Zoology', chapter: 'Animal Kingdom', has_smart_notes: false })],
  recentClasses: [cls('old1', '2026-10-22T05:00:00Z')],
  upcomingTests: [{ title: 'Weekly Test 5', subjects: ['Biology'], opens_at: '2026-10-25T04:00:00Z', closes_at: '2026-10-25T07:00:00Z' }],
  testStats: { upcoming: 1, attempted: 3, missed: 0, practice: 2 },
} as any;
const run = (t: any, args: any) => t.execute(args, { toolCallId: 'x', messages: [] });

describe('Mera Batch agent data', () => {
  it('snapshot lists today, recent notes ids and tests', () => {
    const text = formatBatchSnapshot(overview);
    expect(text).toContain('Aaj ki classes');
    expect(text).toContain('[notes id: today1]');
    expect(text).toContain('[notes id: old1]');
    expect(text).toContain('Weekly Test 5');
  });
  it('schedule tool filters by IST date and keyword', async () => {
    const tools = createBatchTools({ overview: async () => overview });
    const byDate = await run(tools.batch_schedule, { date: '2026-10-24' });
    expect(byDate.classes).toHaveLength(1);
    expect(byDate.classes[0]).toContain('Class up1');
    const byWord = await run(tools.batch_schedule, { query: 'zoology' });
    expect(byWord.classes.map((c: string) => c.includes('up1'))).toEqual([true]);
  });
  it('notes tool only fetches classes from the student\'s own list', async () => {
    const notes = vi.fn(async () => '# Notes');
    const tools = createBatchTools({ overview: async () => overview, notes });
    expect((await run(tools.batch_class_notes, { session_id: 'someone-else' })).error).toBeTruthy();
    expect(notes).not.toHaveBeenCalled();
    expect((await run(tools.batch_class_notes, { session_id: 'old1' })).notes).toBe('# Notes');
  });
  it('voice turns batch on only with a sign-in token', () => {
    expect(parseCallPrefs({ batch: true }).batch).toBe(false);
    expect(parseCallPrefs({ batch: true, batchToken: 'tok' }).batch).toBe(true);
    expect(parseCallPrefs({ batchToken: 'tok' }).batchToken).toBe('');
  });
});

describe('Mera Batch subject words', () => {
  it('botany finds Vedantu "Biology" classes', async () => {
    const bio = { ...overview, todayClasses: [cls('bio1', '2026-10-23T05:00:00Z', { subject: 'Biology', chapter: '' })], upcomingClasses: [], recentClasses: [] };
    const tools = createBatchTools({ overview: async () => bio });
    expect((await run(tools.batch_schedule, { query: 'botany' })).classes).toHaveLength(1);
  });
});
