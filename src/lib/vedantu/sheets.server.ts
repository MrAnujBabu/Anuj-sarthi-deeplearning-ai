/**
 * Google Sheets (AITS Test Tracker) reader for the "Mera Batch" page.
 * Server-only: talks to the Lovable connector gateway with LOVABLE_API_KEY +
 * GOOGLE_SHEETS_API_KEY. Never import this from client code.
 */

export const AITS_SHEET_ID = "1Lz6Z12g6t8rsa6NTFlbiD_L_IqeG-Cl1XGvzQ5_U1YE";
const GATEWAY = "https://connector-gateway.lovable.dev/google_sheets/v4";

export type AitsTest = {
  testNo: number;
  name: string;
  type: string;
  dateIso: string | null; // IST-combined date+time, ISO string
  done: boolean;
  completedOn: string | null;
  marks: number | null;
  percentile: number | null;
  syllabus: string;
  subjects: { physics?: string; chemistry?: string; botany?: string; zoology?: string };
};

export type AitsSchedule = {
  tests: AitsTest[];
  summary: { total: number; done: number; pending: number; overdue: number };
  nextTest: AitsTest | null;
};

const MONTHS: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
};

/** "Sun, 26 Jul 2026" + "9:00 AM" -> ISO string in IST. Returns null when unparseable. */
export function aitsDateIso(dateStr: unknown, timeStr: unknown): string | null {
  if (typeof dateStr !== "string") return null;
  const m = dateStr.match(/(\d{1,2})\s+([A-Za-z]{3})\w*\s+(\d{4})/);
  if (!m) return null;
  const [, dStr, monStr, yStr] = m as [string, string, string, string];
  const month = MONTHS[monStr.slice(0, 3).toLowerCase()];
  if (month === undefined) return null;
  let hour = 9, minute = 0;
  if (typeof timeStr === "string") {
    const t = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
    if (t) {
      hour = Number(t[1]) % 12;
      if (t[3]!.toUpperCase() === "PM") hour += 12;
      minute = Number(t[2]);
    }
  }
  // Build as IST wall-clock, then convert to a real Date via UTC offset.
  const ist = new Date(Date.UTC(Number(yStr), month, Number(dStr), hour, minute) - 5.5 * 3600_000);
  return isNaN(ist.getTime()) ? null : `${ist.toISOString().slice(0, 19)}`;
}

function num(v: unknown): number | null {
  if (typeof v === "number" && isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "" && isFinite(Number(v))) return Number(v);
  return null;
}

/** Parse the Schedule tab values (FORMATTED_VALUE render) into AitsTest rows. */
export function parseAitsSchedule(json: unknown): AitsTest[] {
  const values = (json as { values?: unknown[][] } | null)?.values;
  if (!Array.isArray(values) || values.length < 2) return [];
  const out: AitsTest[] = [];
  for (const row of values.slice(1)) {
    if (!Array.isArray(row)) continue;
    const testNo = num(row[1]);
    const name = typeof row[2] === "string" ? row[2].trim() : "";
    if (testNo === null || !name) continue;
    const done = row[0] === true || row[0] === "TRUE";
    const subjects: AitsTest["subjects"] = {};
    if (typeof row[12] === "string" && row[12].trim()) subjects.physics = row[12].trim();
    if (typeof row[13] === "string" && row[13].trim()) subjects.chemistry = row[13].trim();
    if (typeof row[14] === "string" && row[14].trim()) subjects.botany = row[14].trim();
    if (typeof row[15] === "string" && row[15].trim()) subjects.zoology = row[15].trim();
    out.push({
      testNo,
      name,
      type: typeof row[3] === "string" ? row[3] : "",
      dateIso: aitsDateIso(row[4], row[6]),
      done,
      completedOn: typeof row[8] === "string" && row[8].trim() ? row[8].trim() : null,
      marks: num(row[9]),
      percentile: num(row[10]),
      syllabus: typeof row[7] === "string" ? row[7].trim() : "",
      subjects,
    });
  }
  return out.sort((a, b) => a.testNo - b.testNo);
}

export function summarizeAits(tests: AitsTest[], now = new Date()): AitsSchedule {
  const done = tests.filter((t) => t.done).length;
  const overdue = tests.filter((t) => !t.done && t.dateIso && new Date(t.dateIso) < now).length;
  const nextTest =
    tests
      .filter((t) => !t.done && t.dateIso && new Date(t.dateIso) >= now)
      .sort((a, b) => String(a.dateIso).localeCompare(String(b.dateIso)))[0] ?? null;
  return {
    tests,
    summary: { total: tests.length, done, pending: tests.length - done, overdue },
    nextTest,
  };
}

async function sheetsGet(path: string): Promise<unknown> {
  const lovKey = process.env["LOVABLE_API_KEY"];
  const connKey = process.env["GOOGLE_SHEETS_API_KEY"];
  if (!lovKey || !connKey) throw new Error("Google Sheets connection is project me configured nahi hai.");
  const res = await fetch(`${GATEWAY}${path}`, {
    headers: { Authorization: `Bearer ${lovKey}`, "X-Connection-Api-Key": connKey },
  });
  if (!res.ok) {
    const body = await res.text();
    console.error(`Sheets gateway failed [${res.status}]: ${body}`);
    throw new Error(`Google Sheets request failed [${res.status}]`);
  }
  return res.json();
}

export async function fetchAitsSchedule(now = new Date()): Promise<AitsSchedule> {
  const json = await sheetsGet(`/spreadsheets/${AITS_SHEET_ID}/values/Schedule!A1:T70`);
  return summarizeAits(parseAitsSchedule(json), now);
}
