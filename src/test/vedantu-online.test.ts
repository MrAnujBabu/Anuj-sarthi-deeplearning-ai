import { describe, it, expect, vi, beforeEach } from 'vitest';
const api = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), session: vi.fn() }));
vi.mock('@/lib/vedantu/api.server', async (original) => ({
  ...await original<typeof import('@/lib/vedantu/api.server')>(), vget: api.get, vpost: api.post, vedantuSession: api.session,
}));
import { fetchOnlineOverview, fetchOnlineNotes } from '@/lib/vedantu/online.server';
import { syncCourse, syncRecentNotes } from '@/lib/vedantu/sync.server';

beforeEach(() => {
  vi.clearAllMocks();
  api.session.mockResolvedValue({ userId: 'student' });
  api.get.mockImplementation(async (url: string) => {
    if (url.includes('getBundleEnrolment')) return { enrolledBundles: [{ bundleEnrollmentId: 'enrollment', bundleId: 'bundle', classroomId: 'classroom', title: 'NEET' }] };
    if (url.includes('getCoursesByBundleId')) return [{ batchId: 'batch', subject: 'Biology' }];
    if (url.includes('smart-notes')) return [{ markdown: 'Flower morphology', sectionTitle: 'Botany' }];
    throw new Error('Unexpected endpoint');
  });
  api.post.mockImplementation(async (url: string, body: Record<string, unknown>) => {
    if (url.includes('getTestListingCounts')) return { liveAndUpcomingCount: 1 };
    if (url.includes('getTestListings')) return [{ id: 'test', contentTitle: 'AITS', metadata: { minStartTime: Date.parse('2026-10-24T03:30:00Z'), maxStartTime: Date.parse('2026-10-24T06:30:00Z') } }];
    return body['sessionStatus'] === 'PAST' ? [] : [{ id: 'session', title: 'Morphology', startTime: Date.parse('2026-10-23T05:00:00Z') }];
  });
});

describe('online-only Vedantu', () => {
  it('returns today classes and upcoming tests directly without needing a database', async () => {
    const result = await fetchOnlineOverview(new Date('2026-10-23T04:00:00Z'));
    expect(result.courses).toHaveLength(1);
    expect(result.todayClasses.map(c => c.session_id)).toEqual(['session']);
    expect(result.upcomingTests.map(t => t.content_id)).toEqual(['test']);
    expect(api.post.mock.calls.filter(([url]) => url.includes('getTestListings')).every(([, body]) => ['LIVEANDUPCOMING', 'ALL'].includes(body.contentFilterType))).toBe(true);
  });
  it('daily course fetch writes only lease metadata, never courses/classes/tests/notes', async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: { updated_at: '2026-10-23T04:00:00Z' }, error: null });
    const chain: Record<string, unknown> = {};
    for (const key of ['update', 'eq', 'select']) chain[key] = vi.fn(() => chain);
    chain['maybeSingle'] = maybeSingle;
    const from = vi.fn((_table: string) => chain);
    const admin = { from } as unknown as Parameters<typeof syncCourse>[0];
    expect(await syncCourse(admin, 'lease', 'enrollment')).toEqual({ classes: 1, tests: 1, warnings: 0 });
    expect(await syncRecentNotes(admin, 'lease')).toEqual({ fetched: 0, remaining: 0, failed: 0 });
    expect(from.mock.calls.map(([table]) => table)).toEqual(['vedantu_sync_state', 'vedantu_sync_state']);
  });
  it('fetches notes on demand without saving them', async () => {
    expect((await fetchOnlineNotes('session')).markdown).toContain('Flower morphology');
    expect(api.get).toHaveBeenCalledWith(expect.stringContaining('smart-notes'), { sessionId: 'session', callingUserId: '{userId}' });
  });
  it('marks failed class lists as incomplete, not a confirmed empty schedule', async () => {
    api.post.mockImplementation(async () => { throw new Error('offline'); });
    const result = await fetchOnlineOverview(new Date('2026-10-23T04:00:00Z'));
    expect(result.sync.counts.warnings).toBe(5);
    expect(result.sync.status).toBe('error');
  });
});