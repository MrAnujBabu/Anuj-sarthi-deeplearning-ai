import { describe, expect, it } from "vitest";
import { smartNotesToLecture, parseLectureTopics } from "@/lib/vedantu/parse";

describe("smartNotesToLecture", () => {
  it("keeps timestamps and only Vedantu slide images, drops promotional notes", () => {
    const out = smartNotesToLecture([
      { sectionTitle: "Atom", noteTitle: "Bohr", timeStamp: "0:13:08", endTimeStamp: "0:20:00", markdown: "r = n²", images: ["https://ai-contentsearch.vedantu.com/a.jpg", "https://evil.example/x.jpg"] },
      { type: "Promotional", markdown: "Buy now" },
    ]);
    expect(out).toHaveLength(1);
    expect(out[0]?.start).toBe("0:13:08");
    expect(out[0]?.images).toEqual(["https://ai-contentsearch.vedantu.com/a.jpg"]);
  });
});

describe("parseLectureTopics", () => {
  it("reads topic timeline", () => {
    const r = parseLectureTopics({ topics: [{ timeStamp: "00:13:08", title: "Hydrogen Spectrum" }], description: { sections: [{ md: "Intro" }] } });
    expect(r.topics).toEqual([{ at: "00:13:08", title: "Hydrogen Spectrum" }]);
    expect(r.summary).toBe("Intro");
  });
});
