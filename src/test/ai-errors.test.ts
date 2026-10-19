import { describe, expect, it } from "vitest";
import { classifyAiFailure, encodeAiFailure, isConfigurationError, isCreditError } from "@/lib/ai/errors";
import { extractQuizOptions } from "@/lib/quiz-options";

describe("AI failure classification", () => {
  it("treats Unknown model as a setup issue, not a credit shortage", () => {
    const f = classifyAiFailure(400, { error: { message: "Unknown model: anthropic/foo" } });
    expect(f.kind).toBe("configuration");
    const msg = encodeAiFailure(f);
    expect(isCreditError(msg)).toBe(false);
    expect(isConfigurationError(msg)).toBe(true);
  });
  it("treats 402 as credits", () => {
    expect(classifyAiFailure(402, {}).kind).toBe("credits");
  });
  it("treats a raw gateway 401 as a workspace AI-connection issue, never as credits or raw 'Unauthorized'", () => {
    const f = classifyAiFailure(401, { error: { message: "Unauthorized" } });
    expect(f.kind).toBe("configuration");
    expect(f.message).not.toBe("Unauthorized");
    expect(f.message).toContain("workspace");
    expect(isCreditError(encodeAiFailure(f))).toBe(false);
    expect(isConfigurationError(encodeAiFailure(f))).toBe(true);
  });
});

describe("quiz options", () => {
  it("pulls A-D option text for answer cards", () => {
    const r = extractQuizOptions("**Q1.** Which tissue?\n(A) Xylem\n(B) Endodermis\n(C) Phloem\n(D) Cortex", ["A", "B", "C", "D"]);
    expect(r.labels['B']).toBe("Endodermis");
    expect(r.text).toBe("**Q1.** Which tissue?");
  });
});

describe("quiz options with full-text tags", () => {
  it("removes the inline option line so options show only on the cards", () => {
    const r = extractQuizOptions("**Q1.** Strips made of?\n\n(A) Lignin (B) Cutin (C) Suberin (D) Cellulose", ["Lignin", "Cutin", "Suberin", "Cellulose"]);
    expect(r.text).toBe("**Q1.** Strips made of?");
  });
});
