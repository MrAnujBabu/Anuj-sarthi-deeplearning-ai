import { Link, useNavigate } from "@tanstack/react-router";
import { Plus, Trash2, BookOpen, Menu, FileDown } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import logo from "@/assets/logo.png";
import { deleteThread, loadThreads, type Thread } from "@/lib/threads";
import { exportAllMarkdown } from "@/lib/export-chat";
import { BackupControls } from './backup-controls';
import { Button } from './ui/button';
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from './ui/sheet';

export function DoubtSidebar({ activeId, mobileContent = false }: { activeId?: string | undefined; mobileContent?: boolean }) {
  const [threads, setThreads] = useState<Thread[]>([]);
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
    <aside className={cn('w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar',mobileContent ? 'flex h-full w-full border-r-0' : 'hidden md:flex')}>
      <Link to="/" className="flex items-center gap-2 px-5 py-5">
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
      <button
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
        className="mx-3 mt-1 flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-sidebar-accent"
      >
        <FileDown className="size-4" /> Export all (.md / Obsidian)
      </button>
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
      <div className="border-t p-3"><BackupControls /></div>
    </aside>
  );
}

export function MobileStudyMenu({ activeId }: { activeId?: string }) {
  return <Sheet><SheetTrigger asChild><Button variant="ghost" size="icon" aria-label="Study menu" className="md:hidden"><Menu className="size-5"/></Button></SheetTrigger><SheetContent side="left" className="flex flex-col p-0" aria-describedby={undefined}><SheetTitle className="sr-only">Study menu</SheetTitle><DoubtSidebar activeId={activeId} mobileContent/></SheetContent></Sheet>;
}
