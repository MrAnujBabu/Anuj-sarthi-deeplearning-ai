import { describe, expect, it } from "vitest";
import { comparisonTable, formatVoiceReply } from "@/lib/voice-format";

describe("spoken comparison tables", () => {
  it("turns a spoken Tulna into a markdown table", () => {
    const r = comparisonTable("Dekho. Tulna: Mitosis aur Meiosis. Cells — Mitosis: 2, Meiosis: 4. Division — Mitosis: ek baar, Meiosis: do baar. Tulna khatam. Samjhe?");
    expect(r?.table).toBe("| Feature | Mitosis | Meiosis |\n|---|---|---|\n| Cells | 2 | 4 |\n| Division | ek baar | do baar |");
    expect(r?.before).toBe("Dekho.");
    expect(r?.after).toBe("Samjhe?");
  });
  it("keeps prose when only one row is spoken", () => {
    expect(comparisonTable("Tulna: A aur B. Size — A: big, B: small.")).toBeNull();
  });
  it("shows the table in the voice transcript", () => {
    expect(formatVoiceReply("Tulna: DNA aur RNA. Sugar — DNA: deoxyribose, RNA: ribose. Strand — DNA: double, RNA: single. Tulna khatam.")).toContain("| Sugar | deoxyribose | ribose |");
  });
});

describe("plain spoken tables", () => {
  it("builds a Part/Bones table from 'Table: Part aur Bones'", () => {
    const r = comparisonTable("Table: Part aur Bones. Skull — 22. Upper limb — 60. Lower limb — 60. Table khatam.");
    expect(r?.table).toBe("| Part | Bones |\n|---|---|\n| Skull | 22 |\n| Upper limb | 60 |\n| Lower limb | 60 |");
  });
});

import { render } from "@testing-library/react";
import { AssistantAnswer } from "@/components/assistant-answer";
describe("voice transcript screen", () => {
  it("draws a real table for a spoken Part/Bones reply", async () => {
    const { container, findByText } = render(<AssistantAnswer text={formatVoiceReply("Theek hai. Table: Part aur Bones. Skull — 22. Upper limb — 60. Lower limb — 60. Table khatam. Kul 206 bones.")} isAnimating={false} compact />);
    await findByText("Skull");
    expect(container.querySelectorAll("table tbody tr").length).toBe(3);
  });
});

describe("live-call transcript variations", () => {
  it("accepts rows joined by commas and colons", () => {
    const r = comparisonTable("Table: Part aur Bones. Skull: 22, Ribs: 24, Sternum: 1. Table khatam.");
    expect(r?.table).toBe("| Part | Bones |\n|---|---|\n| Skull | 22 |\n| Ribs | 24 |\n| Sternum | 1 |");
  });
});

describe("dynamic voice tables", () => {
  const header = "Table: Tissue, Location, Function aur Example. ";
  const first = "Row: Epithelial; Skin; Protection; Epidermis. ";
  const second = "Row: Connective; Between organs; Support; Bone. ";
  it("uses four question-specific columns with exact cell values", () => {
    expect(comparisonTable(header + first + second + "Table khatam.")?.table).toBe(
      "| Tissue | Location | Function | Example |\n|---|---|---|---|\n| Epithelial | Skin | Protection | Epidermis |\n| Connective | Between organs | Support | Bone |",
    );
  });
  it("keeps two completed rows while a third row is still arriving", () => {
    const result = comparisonTable(header + first + second + "Row: Muscle; Limbs; Move");
    expect(result?.table.split("\n")).toHaveLength(4);
    expect(result?.after).toBe("Row: Muscle; Limbs; Move");
    expect(comparisonTable(header + first + second + "Row: Muscle; Limbs; Movement; Biceps. Table khatam.")?.table).toContain("| Muscle | Limbs | Movement | Biceps |");
  });
  it("preserves decimals and commas inside cells without inventing missing cells", () => {
    const result = comparisonTable("Table: Substance, Mass aur Note. Row: A; 2.5 g; Red, solid. Row: B; 3.75 g; Not given. Row: C; 4 g. Table khatam.");
    expect(result?.table).toContain("| A | 2.5 g | Red, solid |");
    expect(result?.table).toContain("| B | 3.75 g | Not given |");
    expect(result?.table).not.toContain("| C |");
    expect(result?.after).toContain("Row: C; 4 g.");
  });
  it("supports Hindi labels and four-way legacy comparisons", () => {
    expect(comparisonTable("टेबल: भाग और हड्डियाँ. पंक्ति: खोपड़ी; 22. पंक्ति: पसलियाँ; 24. टेबल खत्म.")?.table).toContain("| खोपड़ी | 22 |");
    expect(comparisonTable("Tulna: A, B, C aur D. Size — A: 1, B: 2, C: 3, D: 4. Count — A: 5, B: 6, C: 7, D: 8. Tulna khatam.")?.table).toContain("| Feature | A | B | C | D |");
  });
  it("retains multiple tables and the explanation between them", () => {
    const formatted = formatVoiceReply(header + first + second + "Table khatam. Ab bones dekho. Table: Part aur Bones. Row: Skull; 22. Row: Ribs; 24. Table khatam.");
    expect(formatted).toContain("| Tissue | Location | Function | Example |");
    expect(formatted).toContain("Ab bones dekho.");
    expect(formatted).toContain("| Part | Bones |");
  });
});
