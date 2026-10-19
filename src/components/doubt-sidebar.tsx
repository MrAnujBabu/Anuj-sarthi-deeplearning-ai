import { Link, useNavigate } from "@tanstack/react-router";
import { Plus, Trash2, BookOpen, AudioLines, Menu, FileDown, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import logo from "@/assets/logo.png";
import { deleteThread, loadThreads, type Thread } from "@/lib/threads";
import { exportAllMarkdown } from "@/lib/export-chat";
import { Button } from './ui/button';
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from './ui/sheet';
import { StudySettings } from './study-settings';

export function DoubtSidebar({ activeId, mobileContent = false }: { activeId?: string | undefined; mobileContent?: boolean }) {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [collapsed, setCollapsed] = useState(false);
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
      <div className="mt-4 px-5 text-xs font-medium uppercase tracking-wide text-muted-foreground">Past doubts</div>
      <nav className="mt-2 flex-1 space-y-0.5 overflow-y-auto px-3 pb-4">
        {threads.length === 0 && <p className="px-2 py-2 text-sm text-muted-foreground">No doubts yet.</p>}
        {threads.map((t) => (
          <div
            key={t.id}
            className={cn(
              "group flex items-center rounded-lg text-sm hover:bg-sidebar-accent",
              t.id === activeId && "bg-sidebar-accent font-medium",
            )}
          >
            <Link to="/doubt/$threadId" params={{ threadId: t.id }} className="min-w-0 flex-1 truncate px-2 py-2">
              {t.title}
            </Link>
            <Button
              variant="ghost" size="icon"
              aria-label="Delete doubt"
              onClick={() => {
                deleteThread(t.id);
                if (t.id === activeId) navigate({ to: "/" });
              }}
              className="mr-1 rounded p-1 text-muted-foreground opacity-0 hover:text-destructive group-hover:opacity-100"
            >
              <Trash2 className="size-3.5" />
            </Button>
          </div>
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
