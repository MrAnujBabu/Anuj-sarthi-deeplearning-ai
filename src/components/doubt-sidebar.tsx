import { Link, useNavigate } from "@tanstack/react-router";
import { Plus, Trash2, BookOpen, AudioLines, Menu, FileDown, PanelLeftClose, PanelLeftOpen, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import logo from "@/assets/logo.png";
import { deleteThread, loadThreads, type Thread } from "@/lib/threads";
import { exportAllMarkdown } from "@/lib/export-chat";
import { groupThreads, threadMeta } from "@/lib/thread-groups";
import { Button } from './ui/button';
import { Input } from './ui/input';
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from './ui/sheet';
import { StudySettings } from './study-settings';

export function DoubtSidebar({ activeId, mobileContent = false }: { activeId?: string | undefined; mobileContent?: boolean }) {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [collapsed, setCollapsed] = useState(false);
  const [query, setQuery] = useState("");
  const groups = useMemo(() => groupThreads(threads, query), [threads, query]);
  useEffect(() => { setCollapsed(localStorage.getItem('snapsolve.sidebar.hidden') === '1'); }, []);
  const navigate = useNavigate();

  useEffect(() => {
    const refresh = () => setThreads(loadThreads());
    refresh();
    window.addEventListener("snapsolve:threads", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("snapsolve:threads", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  return (
    <aside className={cn('relative shrink-0 flex-col border-sidebar-border bg-sidebar',mobileContent ? 'flex h-full w-full border-r-0' : collapsed ? 'hidden w-0 md:flex' : 'hidden w-64 border-r md:flex')}>
      {!mobileContent && <Button variant="ghost" size="icon" className={cn('absolute top-4 z-30 size-8 rounded-md bg-background text-muted-foreground', collapsed ? 'left-3' : 'right-2')} aria-label={collapsed ? 'Show sidebar' : 'Hide sidebar'} title={collapsed ? 'Show sidebar' : 'Hide sidebar'} aria-expanded={!collapsed} onClick={() => { const next = !collapsed; setCollapsed(next); localStorage.setItem('snapsolve.sidebar.hidden', next ? '1' : '0'); }}>{collapsed ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}</Button>}
      <div className={cn('flex min-h-0 flex-1 flex-col', !mobileContent && collapsed && 'hidden')}>
      <Link to="/" className="flex min-w-0 items-center gap-2 py-5 pl-4 pr-10">
        <img src={logo} alt="SnapSolve logo" width={36} height={36} className="size-9" />
        <div>
          <div className="font-display text-xl font-semibold leading-none">SnapSolve</div>
          <div className="text-xs text-muted-foreground">NEET 2027 doubt desk</div>
        </div>
      </Link>
      <div className="px-3">
        <Link
          to="/"
          className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium hover:bg-sidebar-accent"
        >
          <Plus className="size-4" /> New doubt
        </Link>
      </div>
      <Link to="/practice" className="mx-3 mt-1 flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-sidebar-accent"><BookOpen className="size-4"/>Saved practice</Link>
      <Link to="/youtube" className="mx-3 mt-1 flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-sidebar-accent"><BookOpen className="size-4"/>YouTube → Hindi</Link>
      <Link to="/voice" className="mx-3 mt-1 flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-sidebar-accent"><AudioLines className="size-4"/>Voice mode</Link>
      <Button variant="ghost"
        type="button"
        onClick={() => {
          if (threads.length === 0) {
            toast.error("No doubts to export yet.");
            return;
          }
          void exportAllMarkdown(threads).then(
            () => toast.success("Obsidian vault zip downloaded — notes + photos/PDFs in the attachments folder."),
            () => toast.error("Export failed — please try again."),
          );
        }}
        className="mx-3 mt-1 h-auto justify-start gap-2 whitespace-normal rounded-md px-3 py-2 text-left text-sm hover:bg-sidebar-accent"
      >
        <FileDown className="size-4" /> Export all (.md / Obsidian)
      </Button>
      <div className="mt-4 flex items-center justify-between px-5 text-xs font-medium uppercase tracking-wide text-muted-foreground"><span>Past doubts</span><span className="tabular-nums normal-case">{threads.length}</span></div>
      {threads.length > 4 && (
        <div className="relative mx-3 mt-2">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search doubts…" aria-label="Search past doubts" className="h-9 pl-8 text-sm" />
        </div>
      )}
      <nav className="mt-2 flex-1 overflow-y-auto px-3 pb-4" aria-label="Past doubts">
        {threads.length === 0 && <p className="px-2 py-2 text-sm text-muted-foreground">No doubts yet.</p>}
        {threads.length > 0 && groups.length === 0 && <p className="px-2 py-2 text-sm text-muted-foreground">No match.</p>}
        {groups.map(([label, items]) => (
          <section key={label} className="mb-3">
            <h3 className="sticky top-0 z-10 bg-sidebar px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/80">{label}</h3>
            <div className="space-y-0.5">
              {items.map((t) => (
                <div key={t.id} className={cn("group relative flex items-center rounded-lg text-sm transition-colors hover:bg-sidebar-accent active:bg-sidebar-accent/80", t.id === activeId && "bg-sidebar-accent")}>
                  {t.id === activeId && <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-sidebar-primary" aria-hidden />}
                  <Link to="/doubt/$threadId" params={{ threadId: t.id }} className="min-w-0 flex-1 px-2 py-2">
                    <span className={cn("block truncate", t.id === activeId && "font-medium")}>{t.title}</span>
                    <span className="block truncate text-[11px] text-muted-foreground">{threadMeta(t)}</span>
                  </Link>
                  <Button
                    variant="ghost" size="icon"
                    aria-label={`Delete ${t.title}`}
                    onClick={() => {
                      if (!window.confirm(`Delete "${t.title}"?`)) return;
                      deleteThread(t.id);
                      if (t.id === activeId) navigate({ to: "/" });
                    }}
                    className="touch-btn mr-1 size-9 shrink-0 rounded-md text-muted-foreground hover:text-destructive md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              ))}
            </div>
          </section>
        ))}
      </nav>
      <div className="border-t p-3"><StudySettings /></div>
      </div>
    </aside>
  );
}

export function MobileStudyMenu({ activeId }: { activeId?: string }) {
  return <Sheet><SheetTrigger asChild><Button variant="ghost" size="icon" aria-label="Study menu" className="md:hidden"><Menu className="size-5"/></Button></SheetTrigger><SheetContent side="left" className="flex flex-col p-0" aria-describedby={undefined}><SheetTitle className="sr-only">Study menu</SheetTitle><DoubtSidebar activeId={activeId} mobileContent/></SheetContent></Sheet>;
}
