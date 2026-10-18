import { describe, expect, it } from "vitest";
import { MAX_TOOL_CALLS, isNcertUrl, textbookUrl } from "@/lib/agent/ncert";

describe("NCERT agent rules", () => {
  it("caps paid lookups at 4 per answer", () => {
    expect(MAX_TOOL_CALLS).toBe(4);
  });
  it("only reads ncert.nic.in", () => {
    expect(isNcertUrl("https://ncert.nic.in/textbook/pdf/keph105.pdf")).toBe(true);
    expect(isNcertUrl("https://evil.com/ncert.nic.in")).toBe(false);
  });
  it("maps Class 12 Biology to its textbook", () => {
    expect(textbookUrl(12, "Biology")).toBe("https://ncert.nic.in/textbook.php?lebo1=0-");
  });
});
