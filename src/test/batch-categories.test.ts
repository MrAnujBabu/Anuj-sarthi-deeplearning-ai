import { describe, expect, it } from "vitest";
import { testCategory } from "@/lib/vedantu/categories";

describe("testCategory", () => {
  it("puts HWT homework tests under DPP", () => {
    expect(testCategory("Test 3 | HWT Test | Chemistry")).toBe("dpp");
    expect(testCategory("HWT-06 Biology")).toBe("dpp");
  });
  it("puts past NEET papers under PYQ", () => {
    expect(testCategory("Optics (NEET 2013-2026 PYQs) Chapter Test")).toBe("pyq");
    expect(testCategory("NEET 2019")).toBe("pyq");
    expect(testCategory("Re-NEET 2024")).toBe("pyq");
  });
  it("keeps part/cumulative/AITS tests under Tests", () => {
    expect(testCategory("EKLAVYA-NEET-PT-3")).toBe("test");
    expect(testCategory("Chapter Review Test-Evolution")).toBe("test");
  });
});
