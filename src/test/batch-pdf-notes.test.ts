import { describe, expect, it, vi } from "vitest";
import { createBatchTools } from "@/lib/vedantu/batch-tools.server";

const cls = (id: string, pdf: boolean) => ({ session_id: id, title: "Atom-5", subject: "Chemistry", chapter: "", teacher: "", starts_at: null, has_smart_notes: false, has_notes_pdf: pdf });
const overview = async () => ({ todayClasses: [], upcomingClasses: [], recentClasses: [cls("aaaa1111", true), cls("bbbb2222", false)], upcomingTests: [], courses: [], sync: { counts: { warnings: 0 } } }) as never;
const run = (t: ReturnType<typeof createBatchTools>, id: string) => (t.batch_class_pdf_notes as unknown as { execute: (a: { session_id: string }) => Promise<Record<string, unknown>> }).execute({ session_id: id });

describe("batch_class_pdf_notes", () => {
  it("never reads PDFs for ids outside the student's own class list", async () => {
    const pdfNotes = vi.fn(async () => "x");
    const r = await run(createBatchTools({ overview, pdfNotes }), "zzzz9999");
    expect(r["error"]).toBeTruthy();
    expect(pdfNotes).not.toHaveBeenCalled();
  });
  it("skips classes whose PDF is not created", async () => {
    const pdfNotes = vi.fn(async () => "x");
    await run(createBatchTools({ overview, pdfNotes }), "bbbb2222");
    expect(pdfNotes).not.toHaveBeenCalled();
  });
  it("returns the PDF text with the Vedantu notes link", async () => {
    const r = await run(createBatchTools({ overview, pdfNotes: async () => "## Page 1" }), "aaaa1111");
    expect(r["pdf_notes"]).toBe("## Page 1");
    expect(r["pdf_url"]).toBe("https://prod-recordings.vedantu.com/NOTES/PROD/aaaa1111.pdf");
  });
});
