import { BookOpen, Check, Loader2, Search, AlertCircle } from "lucide-react";

type Part = {
  type: string;
  state?: string;
  input?: { query?: string; classNum?: number; subject?: string; url?: string; topic?: string };
  output?: { results?: unknown[]; error?: string };
};

function label(p: Part) {
  const i = p.input ?? {};
  if (p.type === "tool-ncert_search")
    return `Checking NCERT Class ${i.classNum ?? ""} ${i.subject ?? ""}${i.query ? ` — ${i.query}` : ""}`;
  if (p.type === "tool-ncert_read") return "Reading the NCERT chapter";
  if (p.type === "tool-read_link") return `Reading your link${i.url ? ` — ${i.url}` : ""}`;
  if (p.type === "tool-neet_pyq_search") return `Checking NEET past questions${i.topic ? ` — ${i.topic}` : ""}`;
  return "Researching";
}

/** One compact row per research step the tutor took. */
export function ToolStep({ part }: { part: Part }) {
  const done = part.state === "output-available";
  const failed = part.state === "output-error" || (done && !!part.output?.error);
  const Icon = part.type === "tool-ncert_read" || part.type === "tool-read_link" ? BookOpen : Search;
  return (
    <div className="flex items-center gap-2 rounded-md border border-border bg-muted/50 px-3 py-1.5 text-xs text-muted-foreground">
      <Icon className="size-3.5 shrink-0 text-primary" />
      <span className="min-w-0 flex-1 truncate capitalize-first">{label(part)}</span>
      {failed ? (
        <AlertCircle className="size-3.5 text-accent-foreground" />
      ) : done ? (
        <Check className="size-3.5 text-primary" />
      ) : (
        <Loader2 className="size-3.5 animate-spin" />
      )}
    </div>
  );
}
