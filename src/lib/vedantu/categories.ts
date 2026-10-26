/** Browser-safe grouping of Vedantu items into the /batch category tabs. */
export type TestCategory = "dpp" | "pyq" | "test";

/** HWT (Home Work Test) is Vedantu's DPP; PYQ papers are year/chapter-wise past NEET papers. */
export function testCategory(title: string, series = ""): TestCategory {
  const t = `${title} ${series}`;
  if (/\b(dpp|hwt|home\s*work|daily\s*practice)/i.test(t)) return "dpp";
  if (/\b(pyqs?|previous\s*year)\b/i.test(t) || /^\s*(re-?\s*)?neet\s*(ug\s*)?\d{4}\b/i.test(title)) return "pyq";
  return "test";
}

export const smartNotesUrl = (sessionId: string) => `https://session.vedantu.com/session-smart-notes/${encodeURIComponent(sessionId)}`;
export const notesPdfLink = (sessionId: string) => `https://prod-recordings.vedantu.com/NOTES/PROD/${encodeURIComponent(sessionId)}.pdf`;
