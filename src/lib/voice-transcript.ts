export type VoiceRow = { id: string; role: "user" | "assistant"; text: string };

export function voiceTranscriptMarkdown(rows: VoiceRow[]) {
  const lines = rows.map((r) => `**${r.role === "user" ? "Me" : "SnapSolve"}:** ${r.text.trim()}`);
  return `---\ntype: voice-call\ndate: ${new Date().toISOString()}\n---\n\n# Voice call\n\n${lines.join("\n\n")}\n`;
}

export function parseVoiceTranscript(text: string): VoiceRow[] {
  if (text.trim().startsWith("{")) {
    const data = JSON.parse(text) as { rows?: VoiceRow[] };
    return (data.rows ?? []).filter((r) => (r.role === "user" || r.role === "assistant") && typeof r.text === "string").map((r) => ({ id: crypto.randomUUID(), role: r.role, text: r.text }));
  }
  const rows: VoiceRow[] = [];
  for (const m of text.matchAll(/\*\*(Me|SnapSolve):\*\*\s*([\s\S]*?)(?=\n\n\*\*(?:Me|SnapSolve):\*\*|\s*$)/g))
    rows.push({ id: crypto.randomUUID(), role: m[1] === "Me" ? "user" : "assistant", text: (m[2] ?? "").trim() });
  return rows;
}

