import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NCERT_BOOKS } from "@/lib/agent/ncert";
import { embedTexts } from "@/lib/rag/embed.functions";
import { chunkText } from "@/lib/rag/chunk";
import { addChunks, addPyqs, clearPyqs, clearRagBook, pyqStats, ragStats } from "@/lib/rag/store";
import { batches, csvToPyqs, hash, pdfFileToText } from "@/lib/rag/ingest";

/** Admin: build the device-stored NCERT library (PDF → chunks → embeddings) and PYQ bank (CSV). */
export function RagLibrary() {
  const embed = useServerFn(embedTexts);
  const [book, setBook] = useState("11-biology");
  const [chapter, setChapter] = useState("");
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState("");
  const [books, setBooks] = useState<{ book: string; chapters: number; count: number }[]>([]);
  const [pyq, setPyq] = useState<{ count: number; years: number[] }>({ count: 0, years: [] });

  const refresh = async () => { setBooks(await ragStats()); setPyq(await pyqStats()); };
  useEffect(() => { void refresh().catch(() => {}); }, []);

  async function importPdfs(files: FileList | null) {
    if (!files?.length) return;
    setMsg("");
    try {
      for (const file of Array.from(files)) {
        setBusy(`${file.name} padh raha hoon…`);
        const text = await pdfFileToText(file);
        if (!text) { setMsg(`${file.name}: text nahi mila (scanned PDF). Text wala NCERT PDF lagao.`); continue; }
        const ch = chapter.trim() || file.name.replace(/\.pdf$/i, "");
        const chunks = chunkText(text);
        const groups = batches(chunks, 64);
        for (const [i, g] of groups.entries()) {
          setBusy(`${file.name}: ${i + 1}/${groups.length} hissa save ho raha hai…`);
          const { vectors } = await embed({ data: { texts: g.map((c) => c.text) } });
          await addChunks(g.map((c, j) => ({ id: `${book}-${hash(ch)}-${hash(c.text)}`, book, chapter: ch, page: c.page, text: c.text, vector: vectors[j] ?? [] })));
        }
        setMsg(`✅ ${file.name}: ${chunks.length} hisse library me save.`);
      }
    } catch (e) {
      setMsg(`❌ ${e instanceof Error ? e.message : "Import fail hua"}`);
    } finally { setBusy(""); await refresh(); }
  }

  async function importCsv(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    try {
      const { records, skipped } = csvToPyqs(await file.text());
      await addPyqs(records);
      setMsg(`✅ ${records.length} PYQ save${skipped ? `, ${skipped} galat rows chhodi` : ""}.`);
    } catch (e) { setMsg(`❌ ${e instanceof Error ? e.message : "CSV fail"}`); }
    await refresh();
  }

  return (
    <section className="space-y-4 rounded-lg border border-border p-4">
      <h2 className="text-lg font-semibold">NCERT library & PYQ bank (is device par)</h2>
      <p className="text-sm text-muted-foreground">Tutor har sawaal par pehle yahan dhoondhta hai aur book + page batata hai.</p>

      <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
        <select aria-label="Book" value={book} onChange={(e) => setBook(e.target.value)} className="h-9 rounded-md border border-input bg-background px-2 text-sm">
          {Object.entries(NCERT_BOOKS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <Input placeholder="Chapter (khaali = file ka naam)" value={chapter} onChange={(e) => setChapter(e.target.value)} />
        <label className="inline-flex h-9 cursor-pointer items-center justify-center rounded-md bg-primary px-3 text-sm text-primary-foreground">
          NCERT PDF jodo
          <input type="file" accept="application/pdf" multiple hidden disabled={!!busy} onChange={(e) => { void importPdfs(e.target.files); e.target.value = ""; }} />
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <label className="inline-flex h-9 cursor-pointer items-center rounded-md border border-input px-3 text-sm">
          PYQ CSV jodo
          <input type="file" accept=".csv,text/csv" hidden onChange={(e) => { void importCsv(e.target.files); e.target.value = ""; }} />
        </label>
        <span className="text-xs text-muted-foreground">Columns: year, subject, chapter, question, a, b, c, d, answer, explanation, source</span>
      </div>

      {busy && <p className="text-sm">{busy}</p>}
      {msg && <p className="text-sm">{msg}</p>}

      <div className="space-y-1 text-sm">
        {books.length === 0 ? <p className="text-muted-foreground">Abhi koi book nahi.</p> : books.map((b) => (
          <div key={b.book} className="flex items-center justify-between gap-2">
            <span>{NCERT_BOOKS[b.book]?.label ?? b.book}: {b.chapters} chapter, {b.count} hisse</span>
            <Button size="sm" variant="ghost" onClick={async () => { if (confirm("Ye book hatayein?")) { await clearRagBook(b.book); await refresh(); } }}>Hatao</Button>
          </div>
        ))}
        <div className="flex items-center justify-between gap-2">
          <span>PYQ: {pyq.count} sawaal{pyq.years.length ? ` (${pyq.years.at(-1)}–${pyq.years[0]})` : ""}</span>
          {pyq.count > 0 && <Button size="sm" variant="ghost" onClick={async () => { if (confirm("Saare PYQ hatayein?")) { await clearPyqs(); await refresh(); } }}>Hatao</Button>}
        </div>
      </div>
    </section>
  );
}
