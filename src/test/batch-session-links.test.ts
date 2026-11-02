import { describe, it, expect } from "vitest";
import { classLine } from "@/lib/vedantu/context.server";

const base = { session_id: "6ad5cceaf75da56f8446571e", starts_at: null, title: "Atom-5", subject: "Chemistry", chapter: "", teacher: "" };

describe("batch session links", () => {
  it("adds the class's own Vedantu session link", () => {
    expect(classLine({ ...base, has_smart_notes: true }, true, true)).toContain("https://session.vedantu.com/session-smart-notes/6ad5cceaf75da56f8446571e");
  });
  it("adds the PDF link only when a PDF exists", () => {
    expect(classLine({ ...base, has_notes_pdf: true }, true, true)).toContain("https://prod-recordings.vedantu.com/NOTES/PROD/6ad5cceaf75da56f8446571e.pdf");
    expect(classLine({ ...base, has_notes_pdf: false }, true, true)).not.toContain(".pdf");
  });
});
