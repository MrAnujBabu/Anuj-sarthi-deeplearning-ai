import { describe, expect, it } from "vitest";
import { splitToggles } from "@/lib/toggles";

describe("splitToggles", () => {
  it("passes plain markdown through untouched", () => {
    const md = "## Heading\n\n- one\n- two";
    expect(splitToggles(md)).toEqual([{ kind: "text", text: md }]);
  });

  it("keeps headings, lists, tables and callouts inside the toggle body", () => {
    const md = `<details>\n<summary>📂 Photosynthesis detail</summary>\n\n## Steps\n\n- Light reaction\n- Dark reaction\n\n1. First\n2. Second\n\n| A | B |\n|---|---|\n| 1 | 2 |\n\n> 💡 **Yaad rakho:** thylakoid me light reaction.\n\n</details>`;
    const segs = splitToggles(md);
    expect(segs).toHaveLength(1);
    const t = segs[0];
    expect(t?.kind).toBe("toggle");
    if (t?.kind !== "toggle") return;
    expect(t.summary).toBe("📂 Photosynthesis detail");
    expect(t.body).toContain("## Steps");
    expect(t.body).toContain("- Light reaction");
    expect(t.body).toContain("1. First");
    expect(t.body).toContain("| A | B |");
    expect(t.body).toContain("> 💡 **Yaad rakho:**");
  });

  it("splits text around a toggle into separate segments", () => {
    const md = `Pehle ye.\n\n<details>\n<summary>Andar</summary>\n\nChhupa hua text.\n\n</details>\n\nBaad me ye.`;
    const segs = splitToggles(md);
    expect(segs.map((s) => s.kind)).toEqual(["text", "toggle", "text"]);
    expect(segs[0]).toMatchObject({ text: "Pehle ye.\n\n" });
    expect(segs[2]).toMatchObject({ text: "\n\nBaad me ye." });
  });

  it("handles multiple toggles in one reply", () => {
    const md = `<details><summary>One</summary>\n\nA\n\n</details>\n\n<details><summary>Two</summary>\n\nB\n\n</details>`;
    const segs = splitToggles(md);
    expect(segs.map((s) => s.kind)).toEqual(["toggle", "toggle"]);
    expect(segs[0]).toMatchObject({ summary: "One", body: "A" });
    expect(segs[1]).toMatchObject({ summary: "Two", body: "B" });
  });

  it("leaves an unclosed toggle as plain text (still streaming)", () => {
    const md = `<details>\n<summary>Adhura</summary>\n\nAbhi aa raha hai…`;
    const segs = splitToggles(md);
    expect(segs).toEqual([{ kind: "text", text: md }]);
  });

  it("strips stray tags from the summary", () => {
    const md = `<details><summary><b>Bold title</b></summary>\n\nBody.\n\n</details>`;
    expect(splitToggles(md)[0]).toMatchObject({ summary: "Bold title" });
  });
});
