import { describe, expect, it } from "vitest";
import { batches, csvToPyqs, parseCsv } from "@/lib/rag/ingest";

describe("PYQ CSV import", () => {
  it("keeps quoted commas inside a cell", () => {
    expect(parseCsv('a,"b, c",d\n')).toEqual([["a", "b, c", "d"]]);
  });
  it("imports a valid row and skips a row without an A–D answer", () => {
    const csv = "year,subject,chapter,question,a,b,c,d,answer\n2023,Biology,Cell,Powerhouse?,Ribosome,Mitochondria,Golgi,Nucleus,(B)\n2022,Biology,Cell,Bad row,1,2,3,4,E";
    const { records, skipped } = csvToPyqs(csv);
    expect(records).toHaveLength(1);
    expect(records[0]!.answer).toBe("B");
    expect(skipped).toBe(1);
  });
  it("re-importing the same question gives the same id (no duplicates)", () => {
    const csv = "year,question,a,b,c,d,answer\n2021,Q,1,2,3,4,A";
    expect(csvToPyqs(csv).records[0]!.id).toBe(csvToPyqs(csv).records[0]!.id);
  });
  it("embeds in batches of the given size", () => {
    expect(batches([1, 2, 3, 4, 5], 2).map((b) => b.length)).toEqual([2, 2, 1]);
  });
});
