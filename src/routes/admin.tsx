import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { amIAdmin, getAgentSettings, saveAgentSettings, listMemory, saveMemory, deleteMemory, readLinkForMemory, extractWithAi, type MemoryInput } from "@/lib/memory.functions";
import { extractLocally, needsAi } from "@/lib/file-extract";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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
type Tab = "note" | "link" | "file" | "tracker";
const TABS: { id: Tab; label: string }[] = [
  { id: "note", label: "Notes" },
  { id: "link", label: "Links" },
  { id: "file", label: "Files" },
  { id: "tracker", label: "Tracker" },
];
const CATEGORIES = ["General", "Syllabus", "Mistake", "Weak topic", "Habit", "Strategy"];
const SUBJECTS = ["", "Physics", "Chemistry", "Biology"];
const TRACK = [
  { id: "mistake", label: "Mistake pattern" },
  { id: "good_habit", label: "Good habit" },
  { id: "bad_habit", label: "Bad habit" },
] as const;
/** One-tap presets so the admin can add common study intel fast. */
const PRESETS: { label: string; tab: Tab; fill: Partial<MemoryInput> }[] = [
  { label: "Mistake question", tab: "tracker", fill: { tracker_type: "mistake", category: "Mistake", title: "", content: "Question: \nMeri galti: \nSahi approach: " } },
  { label: "Weak topic", tab: "note", fill: { category: "Weak topic", content: "Topic: \nKahan atakta hoon: \nRevision plan: " } },
  { label: "NTA syllabus", tab: "link", fill: { category: "Syllabus", title: "NTA NEET syllabus" } },
];

function AdminPage() {
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
        {state === "in" && <div className="space-y-10"><BrainSettings /><Library /><PasswordChange /></div>}
      </main>
    </div>
  );
}

function SignIn({ onDone }: { onDone: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<"in" | "up">("in");
  const [info, setInfo] = useState("");
  return (
    <form
      className="mx-auto mt-10 max-w-sm space-y-3 rounded-xl border border-border bg-card p-6"
      onSubmit={async (e) => {
        e.preventDefault(); setBusy(true); setErr(""); setInfo("");
        if (mode === "up") {
          const { data, error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${window.location.origin}/admin` } });
          setBusy(false);
          if (error) return setErr(error.message);
          if (data.session) return onDone();
          setInfo("Account ban gaya. Email mein confirmation link par click karo, phir yahan sign in karo.");
          setMode("in");
          return;
        }
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        setBusy(false);
        if (error) setErr(error.message === "Invalid login credentials" ? "Galat email/password — ya account abhi bana nahi. Pehli baar ho to 'Create account' dabao." : error.message); else onDone();
      }}
    >
      <h1 className="font-display text-2xl">{mode === "in" ? "Admin sign in" : "Create admin account"}</h1>
      <Input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      <Input type="password" placeholder="Password (min 6)" minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} required />
      {err && <p className="text-sm text-destructive">{err}</p>}
      {info && <p className="text-sm text-muted-foreground">{info}</p>}
      <Button type="submit" className="w-full" disabled={busy}>{busy ? "Please wait…" : mode === "in" ? "Sign in" : "Create account"}</Button>
      <button type="button" className="w-full text-sm text-muted-foreground underline" onClick={() => { setMode(mode === "in" ? "up" : "in"); setErr(""); }}>
        {mode === "in" ? "Pehli baar? Create account" : "Account hai? Sign in"}
      </button>
    </form>
  );
}

const blank = (kind: Tab): MemoryInput => ({ kind, title: "", category: kind === "tracker" ? "Mistake" : "General", subject: "", chapter: "", content: "", tracker_type: kind === "tracker" ? "mistake" : null, frequency: 1, active: true });

function Library() {
  const list = useServerFn(listMemory);
  const save = useServerFn(saveMemory);
  const del = useServerFn(deleteMemory);
  const readLink = useServerFn(readLinkForMemory);
  const extract = useServerFn(extractWithAi);
  const [items, setItems] = useState<Item[]>([]);
  const [tab, setTab] = useState<Tab>("note");
  const [form, setForm] = useState<MemoryInput>(blank("note"));
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState("");

  const load = async () => setItems((await list()) as Item[]);
  useEffect(() => { load(); }, []);
  const shown = useMemo(() => items.filter((i) => i.kind === tab), [items, tab]);
  const set = (p: Partial<MemoryInput>) => setForm((f) => ({ ...f, ...p }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setMsg("");
    try {
      let data = { ...form, kind: tab };
      if (tab === "link" && !form.id) {
        setBusy("Reading link…");
        const r = await readLink({ data: { url: form.source_url ?? "" } });
        data = { ...data, title: data.title || r.title, content: r.markdown };
      }
      if (tab === "file" && file) {
        setBusy("Uploading…");
        const path = `${crypto.randomUUID()}-${file.name.replace(/[^\w.\-]/g, "_")}`;
        const up = await supabase.storage.from("agent-memory").upload(path, file, file.type ? { contentType: file.type } : {});
        if (up.error) throw up.error;
        data = { ...data, title: data.title || file.name, file_path: path, mime: file.type || "application/octet-stream" };
        setBusy("Reading file…");
        let text = await extractLocally(file);
        if (text === null && needsAi(file)) {
          try { text = (await extract({ data: { path, mime: file.type, name: file.name } })).text; }
          catch (x) { setMsg((x as Error).message); text = ""; }
        }
        data.content = [data.content, text ?? `(${file.name} saved; text could not be read from this format)`].filter(Boolean).join("\n\n");
      }
      if (!data.title.trim()) throw new Error("Title daalo");
      setBusy("Saving…");
      const res = await save({ data });
      if (res.duplicate && data.file_path) await supabase.storage.from("agent-memory").remove([data.file_path]);
      setForm(blank(tab)); setFile(null); await load();
      setMsg((m) => m || (res.duplicate ? "Ye pehle se saved hai — dobara save nahi kiya ✓" : "Saved ✓"));
    } catch (x) { setMsg((x as Error).message); }
    finally { setBusy(""); }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl">Agent memory</h1>
        <p className="text-muted-foreground">Jo yahan save hoga, tutor har jawab mein use karega (jo "Use in answers" on hai).</p>
      </div>
      <div className="flex gap-2 border-b border-border">
        {TABS.map((t) => (
          <button key={t.id} onClick={() => { setTab(t.id); setForm(blank(t.id)); setMsg(""); }}
            className={`px-4 py-2 text-sm ${tab === t.id ? "border-b-2 border-primary font-medium" : "text-muted-foreground"}`}>
            {t.label} <span className="text-xs text-muted-foreground">({items.filter((i) => i.kind === t.id).length})</span>
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
          <Input placeholder={tab === "link" || tab === "file" ? "Title (optional)" : "Title"} value={form.title} onChange={(e) => set({ title: e.target.value })} />
          {tab === "tracker" ? (
            <select className="h-9 rounded-md border border-input bg-background px-3 text-sm" value={form.tracker_type ?? "mistake"} onChange={(e) => set({ tracker_type: e.target.value as "mistake" })}>
              {TRACK.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
            </select>
          ) : (
            <select className="h-9 rounded-md border border-input bg-background px-3 text-sm" value={form.category} onChange={(e) => set({ category: e.target.value })}>
              {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          )}
          <select className="h-9 rounded-md border border-input bg-background px-3 text-sm" value={form.subject} onChange={(e) => set({ subject: e.target.value })}>
            {SUBJECTS.map((s) => <option key={s} value={s}>{s || "All subjects"}</option>)}
          </select>
          <Input placeholder="Chapter (optional)" value={form.chapter} onChange={(e) => set({ chapter: e.target.value })} />
        </div>
        {tab === "link" && !form.id && <Input type="url" required placeholder="https://… (e.g. NTA syllabus page)" value={form.source_url ?? ""} onChange={(e) => set({ source_url: e.target.value })} />}
        {tab === "file" && !form.id && (
          <input type="file" required onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.md,.csv,.json,.html,image/*" className="block text-sm" />
        )}
        {tab === "tracker" && (
          <label className="flex items-center gap-2 text-sm">Kitni baar hua
            <Input type="number" min={1} className="w-24" value={form.frequency ?? 1} onChange={(e) => set({ frequency: Math.max(1, Number(e.target.value) || 1) })} />
          </label>
        )}
        {(tab === "note" || tab === "tracker" || form.id) && (
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

      <ul className="space-y-3">
        {shown.length === 0 && <li className="text-sm text-muted-foreground">Abhi kuch save nahi hai.</li>}
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

function BrainSettings() {
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
