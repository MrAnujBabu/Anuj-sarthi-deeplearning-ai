import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { amIAdmin, getAgentSettings, saveAgentSettings, listMemory, saveMemory, deleteMemory, readLinkForMemory, extractWithAi, getStorageLimit, setStorageLimit, type MemoryInput } from "@/lib/memory.functions";
import { extractLocally, needsAi } from "@/lib/file-extract";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { canonicalMemoryUrl } from '@/lib/memory-duplicates';
import { readableMemoryText, retainedFilePath } from '@/lib/admin-retention';
import { Switch } from '@/components/ui/switch';
import { AdminRecovery } from '@/components/admin-recovery';
import { STUDY_KINDS, isStudyKind, csvToStudyItems, ankiToStudyItems, validateImportSize, type MemoryKind, type StudyKind } from '@/lib/import-sources';
import { pendingFirstMessage } from '@/lib/threads';
import { useNumericAnswerLabels } from '@/lib/quiz-label-preference';

export const Route = createFileRoute("/admin")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Agent Memory Admin — SnapSolve" },
      { name: "description", content: "Private admin area to manage SnapSolve tutor memory." },
      { property: "og:title", content: "Agent Memory Admin — SnapSolve" },
      { property: "og:description", content: "Private admin area to manage SnapSolve tutor memory." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: AdminPage,
});

type Item = MemoryInput & { id: string; updated_at: string };
type Tab = MemoryKind | 'pdf';
const TABS: { id: Tab; label: string }[] = [
  { id: "note", label: "Notes" },
  { id: "link", label: "Links" },
  { id: "file", label: "Files" },
  { id: "pdf", label: "PDF" },
  { id: "tracker", label: "Tracker" },
  ...STUDY_KINDS.map(k => ({ id: k.id as Tab, label: k.label })),
];
const CATEGORIES = ["General", "Syllabus", "Mistake", "Weak topic", "Habit", "Strategy"];
const WISDOM_TOPICS = ["Revision", "Test strategy", "Mistakes", "Time management", "Motivation", "Health & sleep", "Life"];
const SUBJECTS = ["", "Physics", "Chemistry", "Biology"];
const TRACK = [
  { id: "mistake", label: "Mistake pattern" },
  { id: "good_habit", label: "Good habit" },
  { id: "bad_habit", label: "Bad habit" },
] as const;
/** One-tap presets so the admin can add common study intel fast. */
const PRESETS: { label: string; tab: Tab; fill: Partial<MemoryInput> }[] = [
  { label: "Mistake pattern", tab: "tracker", fill: { tracker_type: "mistake", category: "Mistake", title: "", content: "Question: \nMeri galti: \nSahi approach: " } },
  { label: "Weak topic", tab: "note", fill: { category: "Weak topic", content: "Topic: \nKahan atakta hoon: \nRevision plan: " } },
  { label: "NTA syllabus", tab: "link", fill: { category: "Syllabus", title: "NTA NEET syllabus" } },
];

function AdminPage() {
  const [recoveryVersion, setRecoveryVersion] = useState(0);
  const [state, setState] = useState<"loading" | "out" | "denied" | "in">("loading");
  const check = useServerFn(amIAdmin);
  const refresh = async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) return setState("out");
    try { setState((await check()).admin ? "in" : "denied"); } catch { setState("denied"); }
  };
  useEffect(() => { refresh(); }, []);

  const signOut = async () => { await supabase.auth.signOut(); setState("out"); };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="flex items-center justify-between border-b border-border px-6 py-4">
        <Link to="/" className="font-display text-xl">SnapSolve <span className="text-muted-foreground text-base">· Agent memory</span></Link>
        {state === "in" || state === "denied" ? <Button variant="ghost" size="sm" onClick={signOut}>Sign out</Button> : null}
      </header>
      <main className="mx-auto max-w-4xl px-6 py-8">
        {state === "loading" && <p className="text-muted-foreground">Loading…</p>}
        {state === "out" && <SignIn onDone={refresh} />}
        {state === "denied" && <p className="text-destructive">Access denied — this account is not an admin.</p>}
        {state === "in" && <div className="space-y-10"><BrainSettings key={`brain-${recoveryVersion}`} /><Library key={`library-${recoveryVersion}`} /><AdminRecovery onChanged={() => setRecoveryVersion(v => v + 1)} /><PasswordChange /></div>}
      </main>
    </div>
  );
}

function SignIn({ onDone }: { onDone: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="mx-auto mt-10 max-w-sm space-y-3 rounded-xl border border-border bg-card p-6"
      onSubmit={async (e) => {
        e.preventDefault(); setBusy(true); setErr("");
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        setBusy(false);
        if (error) setErr(error.message === "Invalid login credentials" ? "Galat email ya password." : error.message); else onDone();
      }}
    >
      <h1 className="font-display text-2xl">Admin sign in</h1>
      <Input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      <Input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
      {err && <p className="text-sm text-destructive">{err}</p>}
      <Button type="submit" className="w-full" disabled={busy}>{busy ? "Please wait…" : "Sign in"}</Button>
    </form>
  );
}

const blank = (kind: Tab): MemoryInput => ({ kind: kind === 'pdf' ? 'file' : kind, title: "", category: kind === "tracker" ? "Mistake" : kind === "wisdom" ? "Revision" : STUDY_KINDS.find(k => k.id === kind)?.label ?? "General", subject: "", chapter: "", content: STUDY_KINDS.find(k => k.id === kind)?.template ?? "", tracker_type: kind === "tracker" ? "mistake" : null, frequency: 1, active: true });

function Library() {
  const navigate = useNavigate();
  const list = useServerFn(listMemory);
  const save = useServerFn(saveMemory);
  const del = useServerFn(deleteMemory);
  const readLink = useServerFn(readLinkForMemory);
  const extract = useServerFn(extractWithAi);
  const [items, setItems] = useState<Item[]>([]);
  const [tab, setTab] = useState<Tab>("note");
  const [form, setForm] = useState<MemoryInput>(blank("note"));
  const [file, setFile] = useState<File | null>(null);
  const [keepOriginal, setKeepOriginal] = useState(false);
  const [pdfSource, setPdfSource] = useState<'file' | 'link'>('file');
  const [wisdomSource, setWisdomSource] = useState<'write' | 'file' | 'link'>('write');
  const [fileInputVersion, setFileInputVersion] = useState(0);
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState("");

  const load = async () => setItems((await list()) as Item[]);
  useEffect(() => { load(); }, []);
  const matches = (i: Item, t: Tab) => t === 'pdf' ? i.mime === 'application/pdf' : i.kind === t;
  const [query, setQuery] = useState("");
  const [topic, setTopic] = useState("");
  const inTab = useMemo(() => items.filter((i) => matches(i, tab)), [items, tab]);
  const topics = useMemo(() => [...new Set(inTab.map((i) => i.category).filter(Boolean))].sort(), [inTab]);
  const shown = useMemo(() => {
    const words = query.toLowerCase().split(/\s+/).filter(Boolean);
    return inTab.filter((i) => (!topic || i.category === topic) && words.every((w) => `${i.title} ${i.category} ${i.subject} ${i.chapter} ${i.content}`.toLowerCase().includes(w)));
  }, [inTab, query, topic]);
  const set = (p: Partial<MemoryInput>) => setForm((f) => ({ ...f, ...p }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setMsg("");
    let temporaryPath: string | null = null;
    let originalCommitted = false;
    const removeTemporary = async () => {
      if (!temporaryPath) return;
      const { error } = await supabase.storage.from('agent-memory').remove([temporaryPath]);
      if (error) throw new Error('Original cleanup nahi hua — Files mein check karein. ' + error.message);
      temporaryPath = null;
    };
    try {
      let data = { ...form, kind: tab === 'pdf' ? 'file' as const : tab };
      if ((tab === "link" || (tab === 'pdf' && pdfSource === 'link') || (tab === 'wisdom' && wisdomSource === 'link')) && !form.id) {
        const url = canonicalMemoryUrl(form.source_url ?? '');
        if (items.some(i => i.source_url && canonicalMemoryUrl(i.source_url) === url)) { setMsg('Ye link pehle se saved hai — dobara read/save nahi kiya ✓'); return; }
        setBusy("Reading link…");
        const r = await readLink({ data: { url: form.source_url ?? "" } });
        if (tab === 'pdf' && r.mime !== 'application/pdf') throw new Error('Link did not return a readable PDF. Use Links for other documents; upload scanned PDFs as files.');
        data = { ...data, kind: tab === 'wisdom' ? 'wisdom' : 'link', source_url: url, mime: r.mime ?? null, file_path: null, title: data.title || r.title, content: r.markdown };
        setMsg(`${r.chars.toLocaleString()} characters read${r.pages ? ` from ${r.pages} pages` : ''} in ${(r.ms / 1000).toFixed(1)}s via ${r.method}${r.truncated ? ` — capped at 400,000 of ${r.totalChars.toLocaleString()}` : ''}. `);
      }
      if ((tab === "file" || (tab === 'pdf' && pdfSource === 'file') || (tab === 'wisdom' && wisdomSource === 'file')) && file) {
        validateImportSize(file.size);
        if (tab === 'pdf' && !/\.pdf$/i.test(file.name)) throw new Error('Choose a PDF file.');
        setBusy("Uploading…");
        const digest = await crypto.subtle.digest('SHA-256', await file.arrayBuffer());
        const hash = Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('');
        const path = `content-${hash}`;
        if (items.some(i => i.file_path === path)) { setMsg('Ye file pehle se saved hai — dobara upload/read nahi kiya ✓'); return; }
        setBusy("Reading file…");
        let text = await extractLocally(file);
        if (text === null && file.type === 'application/pdf') {
          const { extractText, getDocumentProxy } = await import('unpdf');
          try {
            const pdf = await getDocumentProxy(new Uint8Array(await file.arrayBuffer()));
            const result = await extractText(pdf, { mergePages: true });
            if (result.text.trim()) text = result.text.slice(0, 400000);
          } catch { /* Scanned PDF uses the existing authenticated reader. */ }
        }
        if (keepOriginal || (text === null && needsAi(file))) {
          setBusy('Uploading…');
          const up = await supabase.storage.from('agent-memory').upload(path, file, file.type ? { contentType: file.type } : {});
          if (up.error) throw up.error;
          temporaryPath = path;
        }
        if (text === null && needsAi(file)) {
          text = (await extract({ data: { path, mime: file.type, name: file.name } })).text;
        }
        data = { ...data, title: data.title || file.name, file_path: retainedFilePath(path, keepOriginal), mime: file.type || 'application/octet-stream', content: [data.content, readableMemoryText(text)].filter(Boolean).join('\n\n') };
        if (!keepOriginal) await removeTemporary();
        if (text) setMsg(`${Math.min(text.length, 400000).toLocaleString()} characters read${text.length >= 400000 ? ' — capped at 400,000' : ''}. `);
      }
      if (!data.title.trim()) throw new Error("Title daalo");
      setBusy("Saving…");
      const res = await save({ data });
      originalCommitted = !res.duplicate && !!data.file_path;
      if (res.duplicate) await removeTemporary();
      setForm(blank(tab)); setFile(null); setFileInputVersion(v => v + 1); await load();
      setMsg((m) => m + (res.duplicate ? "Ye pehle se saved hai — dobara save nahi kiya ✓" : "Saved ✓"));
    } catch (x) { setMsg((x as Error).message); }
    finally {
      if (!originalCommitted) {
        try { await removeTemporary(); } catch (x) { setMsg((x as Error).message); }
      }
      setBusy("");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl">Agent memory</h1>
        <p className="text-muted-foreground">Active memory mein se relevant notes tutor ke jawab mein use hote hain. Links readable hone chahiye; private documents upload karein.</p>
      </div>
      <div className="flex gap-1 overflow-x-auto border-b border-border">
        {TABS.map((t) => (
          <button key={t.id} onClick={() => { setTab(t.id); setForm(blank(t.id)); setMsg(""); setQuery(""); setTopic(""); }}
            className={`shrink-0 whitespace-nowrap px-3 py-2 text-sm ${tab === t.id ? "border-b-2 border-primary font-medium" : "text-muted-foreground"}`}>
            {t.label} <span className="text-xs text-muted-foreground">({items.filter((i) => matches(i, t.id)).length})</span>
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {PRESETS.map((p) => (
          <button key={p.label} type="button"
            onClick={() => { setTab(p.tab); setForm({ ...blank(p.tab), ...p.fill }); setMsg(""); }}
            className="rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground">
            + {p.label}
          </button>
        ))}
      </div>

      <form onSubmit={submit} className="space-y-3 rounded-xl border border-border bg-card p-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <Input placeholder={tab === "link" || tab === "file" || tab === 'pdf' || (tab === 'wisdom' && wisdomSource !== 'write') ? "Title (optional)" : "Title"} value={form.title} onChange={(e) => set({ title: e.target.value })} />
          {tab === "tracker" ? (
            <select className="h-9 rounded-md border border-input bg-background px-3 text-sm" value={form.tracker_type ?? "mistake"} onChange={(e) => set({ tracker_type: e.target.value as "mistake" })}>
              {TRACK.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
            </select>
          ) : (
            <select className="h-9 rounded-md border border-input bg-background px-3 text-sm" value={form.category} onChange={(e) => set({ category: e.target.value })}>
              {[...new Set([form.category, ...(tab === "wisdom" ? WISDOM_TOPICS : CATEGORIES)])].map((c) => <option key={c}>{c}</option>)}
            </select>
          )}
          <select className="h-9 rounded-md border border-input bg-background px-3 text-sm" value={form.subject} onChange={(e) => set({ subject: e.target.value })}>
            {SUBJECTS.map((s) => <option key={s} value={s}>{s || "All subjects"}</option>)}
          </select>
          <Input placeholder="Chapter (optional)" value={form.chapter} onChange={(e) => set({ chapter: e.target.value })} />
        </div>
        {tab === 'pdf' && !form.id && <select aria-label="PDF source" className="h-9 rounded-md border border-input bg-background px-3 text-sm" value={pdfSource} onChange={e => { setPdfSource(e.target.value === 'link' ? 'link' : 'file'); setFile(null); }}><option value="file">Upload PDF</option><option value="link">PDF link</option></select>}
        {tab === 'wisdom' && !form.id && <select aria-label="Library source" className="h-9 rounded-md border border-input bg-background px-3 text-sm" value={wisdomSource} onChange={e => { setWisdomSource(e.target.value as 'write' | 'file' | 'link'); setFile(null); }}><option value="write">Likho (Markdown)</option><option value="file">File upload (.md, PDF, Word, PPT, image…)</option><option value="link">Link paste karo — agent padhega</option></select>}
        {(tab === "link" || (tab === 'pdf' && pdfSource === 'link') || (tab === 'wisdom' && wisdomSource === 'link')) && !form.id && <Input type="url" required placeholder="https://… (e.g. NTA syllabus page)" value={form.source_url ?? ""} onChange={(e) => set({ source_url: e.target.value })} />}
        {(tab === "file" || (tab === 'pdf' && pdfSource === 'file') || (tab === 'wisdom' && wisdomSource === 'file')) && !form.id && (
          <div className="space-y-3"><input key={fileInputVersion} type="file" required onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            accept={tab === 'pdf' ? '.pdf,application/pdf' : '.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.md,.markdown,.csv,.tsv,.json,.html,image/*'} className="block text-sm" />
          <label className="flex items-center gap-2 text-sm"><Switch checked={keepOriginal} onCheckedChange={setKeepOriginal} aria-label="Keep original file" />Keep original file in Cloud</label>
          <p className="text-xs text-muted-foreground">Off: sirf readable text save hoga. Scanned files temporarily upload hoke reading ke baad remove hongi.</p></div>
        )}
        {tab === "tracker" && (
          <label className="flex items-center gap-2 text-sm">Kitni baar hua
            <Input type="number" min={1} className="w-24" value={form.frequency ?? 1} onChange={(e) => set({ frequency: Math.max(1, Number(e.target.value) || 1) })} />
          </label>
        )}
        {(tab === "note" || tab === "tracker" || (isStudyKind(tab) && (tab !== 'wisdom' || wisdomSource === 'write')) || form.id) && (
          <textarea className="min-h-40 w-full rounded-md border border-input bg-background p-3 font-mono text-sm"
            placeholder={tab === "tracker" ? "Pattern detail: kya galti hoti hai, kyon, kaise sudhare…" : "Markdown ya plain text…"}
            value={form.content} onChange={(e) => set({ content: e.target.value })} />
        )}
        <div className="flex items-center gap-3">
          <Button type="submit" disabled={!!busy}>{busy || (form.id ? "Update" : "Save")}</Button>
          {form.id && <Button type="button" variant="ghost" onClick={() => setForm(blank(tab))}>Cancel</Button>}
          {msg && <span className="text-sm text-muted-foreground">{msg}</span>}
        </div>
      </form>

      {isStudyKind(tab) && <StudyImport kind={tab} onDone={load} />}

      {inTab.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <Input type="search" aria-label="Search saved items" placeholder="Search… (e.g. revision, test, galti)" value={query} onChange={(e) => setQuery(e.target.value)} className="max-w-xs" />
          <button type="button" onClick={() => setTopic("")} className={`rounded-full border px-3 py-1 text-xs ${!topic ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"}`}>All</button>
          {topics.map((t) => (
            <button key={t} type="button" onClick={() => setTopic(topic === t ? "" : t)} className={`rounded-full border px-3 py-1 text-xs ${topic === t ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"}`}>{t} ({inTab.filter((i) => i.category === t).length})</button>
          ))}
          {(query || topic) && <span className="text-xs text-muted-foreground">{shown.length} / {inTab.length}</span>}
        </div>
      )}
      <ul className="space-y-3">
        {shown.length === 0 && <li className="text-sm text-muted-foreground">{inTab.length ? "Kuch match nahi hua." : "Abhi kuch save nahi hai."}</li>}
        {shown.map((i) => (
          <li key={i.id} className="rounded-xl border border-border bg-card p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-medium">{i.title}</p>
                <p className="text-xs text-muted-foreground">
                  {i.kind === "tracker" ? TRACK.find((t) => t.id === i.tracker_type)?.label + ` · ${i.frequency}×` : i.category}
                  {i.subject && ` · ${i.subject}`}{i.chapter && ` · ${i.chapter}`}
                  {i.source_url && <> · <a className="underline" href={i.source_url} target="_blank" rel="noreferrer">link</a></>}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-1 text-xs">
                  <input type="checkbox" checked={i.active !== false} onChange={async (e) => { await save({ data: { ...i, active: e.target.checked } }); load(); }} />
                  Use in answers
                </label>
                {i.kind === "tracker" && <Button size="sm" variant="outline" onClick={async () => { await save({ data: { ...i, frequency: (i.frequency ?? 1) + 1 } }); load(); }}>+1</Button>}
                <Button size="sm" variant="outline" onClick={() => { setForm(i); window.scrollTo({ top: 0, behavior: "smooth" }); }}>Edit</Button>
                {i.content && <Button size="sm" variant="outline" onClick={() => {
                  const id = crypto.randomUUID();
                  pendingFirstMessage.set(id, { text: `Deeply analyse the saved document below. Explain concepts, solve its questions, check any answer key, and identify common NEET traps. Use only the supplied text for claims about the document; acknowledge truncation.${i.content.length >= 400000 ? ' This saved text reached the 400,000-character cap; the original may contain additional pages you have not read.' : ''}\n<doc name=${JSON.stringify(i.title)}>\n${i.content.slice(0, 400000)}\n</doc>`, files: [], mode: 'solve' });
                  navigate({ to: '/doubt/$threadId', params: { threadId: id } });
                }}>Deep analysis</Button>}
                <Button size="sm" variant="ghost" onClick={async () => { if (confirm("Delete?")) { await del({ data: { id: i.id, file_path: i.file_path ?? null } }); load(); } }}>Delete</Button>
              </div>
            </div>
            {i.content && <p className="mt-2 line-clamp-3 whitespace-pre-wrap text-sm text-muted-foreground">{i.content}</p>}
          </li>
        ))}
      </ul>
    </div>
  );
}

function StorageLimitToggle() {
  const get = useServerFn(getStorageLimit);
  const set = useServerFn(setStorageLimit);
  const [on, setOn] = useState<boolean | null>(null);
  const [err, setErr] = useState("");
  useEffect(() => { get().then((r) => setOn(r.limited)).catch((e) => setErr((e as Error).message)); }, []);
  return (
    <label className="flex items-center gap-2 text-sm">
      <Switch checked={!!on} disabled={on === null} aria-label="25 MB upload limit"
        onCheckedChange={async (v) => { setErr(""); try { const r = await set({ data: { limited: v } }); setOn(r.limited); } catch (e) { setErr((e as Error).message); } }} />
      Upload limit 25 MB {on === false ? "· off (project max)" : ""}
      {err && <span className="text-destructive">{err}</span>}
    </label>
  );
}

function BrainSettings() {
  const [numericLabels, setNumericLabels] = useNumericAnswerLabels();
  const get = useServerFn(getAgentSettings);
  const save = useServerFn(saveAgentSettings);
  const [brain, setBrain] = useState("");
  const [timer, setTimer] = useState(0);
  const [mode, setMode] = useState<"solve" | "quiz">("solve");
  const [msg, setMsg] = useState("");
  useEffect(() => { get().then((r) => { setBrain(r.brain); setTimer(r.quiz_timer_seconds); setMode(r.default_mode); }); }, []);
  return (
    <section className="space-y-3 rounded-xl border border-border bg-card p-5" aria-label="Agent brain">
      <h2 className="font-display text-2xl">Agent brain & role</h2>
      <p className="text-sm text-muted-foreground">Tutor ka role, teaching style, rules aur focus — har jawab aur quiz mein sabse upar lagta hai.</p>
      <textarea className="min-h-40 w-full rounded-md border border-input bg-background p-3 font-mono text-sm" value={brain} onChange={(e) => setBrain(e.target.value)}
        placeholder={"Example:\nTum NEET 2027 ke senior faculty ho. Hinglish mein samjhao.\nHar jawab mein student ki weak spot pin-point karo aur NCERT line batao.\nNTA syllabus ke bahar ka topic ho to saaf batao."} />
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <label className="flex items-center gap-2 text-sm"><Switch checked={numericLabels} onCheckedChange={setNumericLabels} aria-label="Numeric quiz answers on this device" />{numericLabels ? '1 / 2 / 3 / 4' : 'A / B / C / D'} · this device</label>
        <label className="flex flex-wrap items-center gap-2 text-sm">
          Quiz timer per question (seconds, 0 = off)
          <Input type="number" min={0} max={600} className="w-28" value={timer} onChange={(e) => setTimer(Number(e.target.value) || 0)} aria-label="Quiz timer seconds" />
          <span className="text-muted-foreground">Time khatam → question auto-skip.</span>
        </label>
        <label className="flex items-center gap-2 text-sm">
          Default mode
          <select className="h-9 rounded-md border border-input bg-background px-3 text-sm" value={mode} onChange={(e) => setMode(e.target.value as "solve" | "quiz")} aria-label="Default mode">
            <option value="solve">Solve (doubt solving)</option>
            <option value="quiz">Quiz (practice)</option>
          </select>
        </label>
        <StorageLimitToggle />
      </div>
      <div className="flex items-center gap-3">
        <Button onClick={async () => { setMsg(""); try { await save({ data: { brain, quiz_timer_seconds: timer, default_mode: mode } }); setMsg("Saved ✓"); } catch (x) { setMsg((x as Error).message); } }}>Save brain & settings</Button>
        {msg && <span className="text-sm text-muted-foreground">{msg}</span>}
      </div>
    </section>
  );
}

function PasswordChange() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [msg, setMsg] = useState("");
  return (
    <form className="max-w-sm space-y-3 rounded-xl border border-border bg-card p-5" onSubmit={async (e) => {
      e.preventDefault(); setMsg("");
      if (next.length < 10) return setMsg("Naya password kam se kam 10 characters ka ho.");
      const { error } = await supabase.auth.updateUser({ password: next, current_password: current } as never);
      if (error) setMsg(error.message); else { setMsg("Password badal gaya ✓"); setCurrent(""); setNext(""); }
    }}>
      <h2 className="font-display text-xl">Change password</h2>
      <Input type="password" placeholder="Current password" value={current} onChange={(e) => setCurrent(e.target.value)} required />
      <Input type="password" placeholder="New password (10+ characters)" value={next} onChange={(e) => setNext(e.target.value)} required />
      <Button type="submit">Update password</Button>
      {msg && <p className="text-sm text-muted-foreground">{msg}</p>}
    </form>
  );
}

/** Bulk import questions from a CSV file, public Google Sheet, or CSV link. */
function StudyImport({ kind, onDone }: { kind: StudyKind; onDone: () => void }) {
  const save = useServerFn(saveMemory);
  const readLink = useServerFn(readLinkForMemory);
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [raw, setRaw] = useState('');
  const [format, setFormat] = useState<'csv' | 'anki'>('csv');
  const run = async (csv: string) => {
    validateImportSize(new TextEncoder().encode(csv).byteLength);
    const rows = format === 'anki' ? ankiToStudyItems(csv) : csvToStudyItems(csv, kind);
    if (!rows.length) throw new Error("CSV mein koi question row nahi mili (pehli row headers honi chahiye: question, options, answer, explanation, subject, chapter, year).");
    let saved = 0, dup = 0;
    for (const [i, r] of rows.entries()) {
      setMsg(`Saving ${i + 1}/${rows.length}…`);
      const res = await save({ data: { ...r, category: STUDY_KINDS.find(k => k.id === r.kind)?.label ?? 'General', active: true, frequency: 1, tracker_type: null } });
      if (res.duplicate) dup++; else saved++;
    }
    setMsg(`Imported ${saved} new, skipped ${dup} duplicates ✓`);
    onDone();
  };
  const wrap = (f: () => Promise<void>) => async () => { setBusy(true); setMsg(""); try { await f(); } catch (x) { setMsg((x as Error).message); } finally { setBusy(false); } };
  return (
    <div className="space-y-3 rounded-xl border border-dashed border-border bg-card p-5">
      <p className="text-sm font-medium">Bulk import</p>
      <select aria-label="Import format" value={format} onChange={e => setFormat(e.target.value === 'anki' ? 'anki' : 'csv')} className="h-9 rounded-md border border-input bg-background px-3 text-sm"><option value="csv">CSV / Google Sheet</option><option value="anki">Anki raw text / JSON</option></select>
      <p className="text-xs text-muted-foreground">Headers: question, options, answer, explanation, subject, chapter, year (optional "type" column se alag tab). Google Sheet "Anyone with the link" par share honi chahiye.</p>
      <input type="file" accept={format === 'anki' ? '.txt,.tsv,.json' : '.csv,text/csv'} aria-label="Study import file" disabled={busy} className="block text-sm"
        onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) wrap(async () => { validateImportSize(f.size); await run(await f.text()); })(); }} />
      {format === 'anki' && <><textarea aria-label="Anki raw data" value={raw} onChange={e => setRaw(e.target.value)} placeholder={'Front\tBack\tTags'} className="min-h-28 w-full rounded-md border border-input bg-background p-3 text-sm" /><Button disabled={busy || !raw.trim()} onClick={wrap(async () => { await run(raw); setRaw(''); })}>Import Anki notes</Button><p className="text-xs text-muted-foreground">Anki exported text/JSON only; .apkg packages and media are not imported. Cloze notation is preserved.</p></>}
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input type="url" placeholder="https://docs.google.com/spreadsheets/d/… ya .csv link" value={url} onChange={(e) => setUrl(e.target.value)} />
        <Button type="button" variant="outline" disabled={busy || !url} onClick={wrap(async () => { setMsg("Reading link…"); const r = await readLink({ data: { url } }); if (r.truncated) throw new Error('Bulk import text was truncated. Split the source to avoid incomplete questions.'); await run(r.markdown); setUrl(""); })}>Import link</Button>
      </div>
      {msg && <p className="text-sm text-muted-foreground">{msg}</p>}
    </div>
  );
}
