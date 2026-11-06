import { Link } from '@tanstack/react-router';
import { ArrowRight, Wand2 } from 'lucide-react';
import { STUDIO_TOOLS, enabledStudioTools, useStudioToolSwitches } from '@/lib/studio-tools';

function useEnabledTools() {
  const s = useStudioToolSwitches();
  return enabledStudioTools({ diagram: s.diagram[0], animation: s.animation[0], enhance: s.enhance[0] });
}

/** Home card for AI Studio; hidden when every Studio tool is switched off. */
export function StudioEntryCard() {
  const tools = useEnabledTools();
  if (!tools.length) return null;
  return (
    <Link to="/studio" className="touch-btn group mt-2 flex items-center gap-3 rounded-xl border bg-card p-3 shadow-sm transition-colors hover:border-primary/40 md:mt-3">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground"><Wand2 className="size-4" /></span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium">AI Studio</span>
        <span className="mt-0.5 block truncate text-xs text-muted-foreground">{tools.map(t => STUDIO_TOOLS[t].label).join(' · ')}</span>
      </span>
      <ArrowRight className="size-4 shrink-0 text-muted-foreground" />
    </Link>
  );
}

/** Sidebar link for AI Studio; hidden when every Studio tool is switched off. */
export function StudioNavLink() {
  const tools = useEnabledTools();
  if (!tools.length) return null;
  return <Link to="/studio" className="mx-3 mt-1 flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-sidebar-accent"><Wand2 className="size-4" />AI Studio</Link>;
}
