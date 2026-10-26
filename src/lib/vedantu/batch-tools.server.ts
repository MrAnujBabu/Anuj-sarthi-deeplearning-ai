import { tool } from "ai";
import { z } from "zod";
import { notesPdfUrl } from "./parse";
import { classLine, getBatchOverview, ist } from "./context.server";

const NOTES_CHARS = 12_000;
const norm = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[^\p{L}\p{N} ]/gu, " ");

/**
 * Admin-only Mera Batch tools. Callers must have verified the admin first.
 * Reads go through the shared 5-minute online overview; notes are fetched on
 * demand from Vedantu and never stored.
 */
export function createBatchTools(deps: { overview?: typeof getBatchOverview; notes?: (sessionId: string) => Promise<string>; pdfNotes?: (sessionId: string) => Promise<string> } = {}) {
  const pdfNotes = deps.pdfNotes ?? (async (id: string) => (await import("./online.server")).fetchOnlinePdfNotes(id));
  const overview = deps.overview ?? getBatchOverview;
  const notes = deps.notes ?? (async (id: string) => (await (await import("./online.server")).fetchOnlineNotes(id)).markdown);
  return {
    batch_schedule: tool({
      description: "Look up the student's own Vedantu batch: classes (today, upcoming, recent with notes) and upcoming tests. Filter by IST date (YYYY-MM-DD) and/or keywords (subject, chapter, teacher, test name).",
      inputSchema: z.object({
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe("IST date, e.g. 2026-10-24"),
        query: z.string().max(80).optional().describe("Keywords like 'botany', 'Morphology', 'test'"),
      }),
      execute: async ({ date, query }) => {
        try {
          const o = await overview();
          const seen = new Set<string>();
          let classes = [...o.recentClasses, ...o.upcomingClasses, ...o.todayClasses].filter((c) => (seen.has(c.session_id) ? false : (seen.add(c.session_id), true)));
          let tests = o.upcomingTests;
          if (date) {
            const day = (iso: string | null) => (iso ? new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date(iso)) : "");
            classes = classes.filter((c) => day(c.starts_at) === date);
            tests = tests.filter((t) => day(t.opens_at) === date || day(t.closes_at) === date);
          }
          if (query?.trim()) {
            const words = norm(query).split(/\s+/).filter(Boolean);
            // Vedantu labels Botany/Zoology classes as "Biology".
            const hit = (text: string) => words.every((w) => norm(text).includes(w) || (/^(botany|zoology)$/.test(w) && norm(text).includes("biology")));
            classes = classes.filter((c) => hit(`${c.title} ${c.subject} ${c.chapter} ${c.teacher} ${c.course_title}`));
            tests = tests.filter((t) => hit(`${t.title} ${t.subjects.join(" ")}`));
          }
          classes.sort((a, b) => (a.starts_at ?? "").localeCompare(b.starts_at ?? ""));
          return {
            classes: classes.slice(0, 30).map((c) => classLine(c, true, true)),
            tests: tests.slice(0, 10).map((t) => `- ${t.title}${t.subjects.length ? ` [${t.subjects.join(", ")}]` : ""} — ${ist(t.opens_at)} se ${ist(t.closes_at)}`),
            note: o.sync.counts.warnings ? "Some Vedantu lists were unavailable or capped; missing items are not proof of cancellation." : undefined,
          };
        } catch (e) {
          console.error("batch_schedule failed:", e);
          return { classes: [], tests: [], error: "Vedantu schedule abhi unavailable hai — student ko /batch page dekhne ko kaho." };
        }
      },
    }),
    batch_class_notes: tool({
      description: "Fetch one of the student's own Vedantu lectures by [notes id] (session ID): timestamped smart notes from the live lecture transcript plus the lecture topic outline. Use to teach or quiz from that class and cite time points (e.g. 'sir ne 13:08 pe').",
      inputSchema: z.object({ session_id: z.string().min(4).max(64) }),
      execute: async ({ session_id }) => {
        try {
          const o = await overview();
          const known = [...o.todayClasses, ...o.recentClasses, ...o.upcomingClasses].find((c) => c.session_id === session_id);
          // Only classes from the student's own fetched lists — never arbitrary ids.
          if (!known) return { error: "Yeh class id student ke batch list mein nahi mili. Pehle batch_schedule se sahi [notes id] lo." };
          const pdf_url = known.has_notes_pdf ? notesPdfUrl(session_id) : undefined;
          if (!known.has_smart_notes) return pdf_url ? { title: known.title, session_id, pdf_url, error: "Smart notes nahi hain; batch_class_pdf_notes se is class ki whiteboard PDF padho." } : { title: known.title, error: "Is class ke notes abhi available nahi hain." };
          const text = await notes(session_id);
          if (!text.trim()) return { title: known.title, session_id, pdf_url, error: "Smart notes khaali aaye." };
          return { title: known.title, subject: known.subject, chapter: known.chapter, teacher: known.teacher, session_id, pdf_url, smart_notes_url: `https://session.vedantu.com/session-smart-notes/${session_id}`, notes: text.slice(0, NOTES_CHARS), truncated: text.length > NOTES_CHARS };
        } catch (e) {
          console.error("batch_class_notes failed:", e);
          return { error: "Vedantu notes abhi load nahi hue — baad mein try karo." };
        }
      },
    }),
    batch_class_pdf_notes: tool({
      description: "Read the handwritten whiteboard PDF of one of the student's own Vedantu classes (by [notes id]) as text. Slower; use when smart notes are missing or the student asks about the board/PDF notes, diagrams or what the teacher wrote.",
      inputSchema: z.object({ session_id: z.string().min(4).max(64) }),
      execute: async ({ session_id }) => {
        try {
          const o = await overview();
          const known = [...o.todayClasses, ...o.recentClasses, ...o.upcomingClasses].find((c) => c.session_id === session_id);
          if (!known) return { error: "Yeh class id student ke batch list mein nahi mili." };
          if (!known.has_notes_pdf) return { title: known.title, error: "Is class ki PDF abhi bani nahi hai." };
          const text = await pdfNotes(session_id);
          if (!text) return { title: known.title, error: "PDF padhi nahi ja saki." };
          return { title: known.title, subject: known.subject, session_id, pdf_url: notesPdfUrl(session_id), pdf_notes: text.slice(0, NOTES_CHARS), truncated: text.length > NOTES_CHARS };
        } catch (e) {
          console.error("batch_class_pdf_notes failed:", e);
          return { error: "Class PDF abhi padhi nahi ja saki — link se dekh lo.", pdf_url: notesPdfUrl(session_id) };
        }
      },
    }),
  };
}
