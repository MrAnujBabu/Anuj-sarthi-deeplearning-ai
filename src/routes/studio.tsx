import { createFileRoute, Link } from '@tanstack/react-router';
import { ArrowLeft, Clapperboard, ImageIcon, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { ImageTool } from '@/components/studio/image-tool';
import { AnimationTool } from '@/components/studio/animation-tool';
import { EnhanceTool } from '@/components/studio/enhance-tool';
import { StudioGallery } from '@/components/studio/studio-gallery';
import { STUDIO_TOOLS, TOPIC_MAX, useStudioToolSwitches, type StudioToolId } from '@/lib/studio-tools';
import { cn } from '@/lib/utils';

type Search = { tool?: StudioToolId | undefined; topic?: string | undefined };

export const Route = createFileRoute('/studio')({
  validateSearch: (s: Record<string, unknown>): Search => ({
    tool: s['tool'] === 'diagram' || s['tool'] === 'animation' || s['tool'] === 'enhance' ? s['tool'] : undefined,
    topic: typeof s['topic'] === 'string' ? s['topic'].slice(0, TOPIC_MAX) : undefined,
  }),
  head: () => ({
    meta: [
      { title: 'AI Studio — SnapSolve' },
      { name: 'description', content: 'NEET diagrams, revision posters and concept animations with ByteDance, plus blurry class videos made sharp with Topaz Labs.' },
      { property: 'og:title', content: 'AI Studio — SnapSolve' },
      { property: 'og:description', content: 'Labelled NCERT diagrams, revision posters, concept animations and sharper class recordings.' },
      { property: 'og:type', content: 'website' },
      { name: 'twitter:card', content: 'summary' },
    ],
  }),
  component: Studio,
});

const TABS: { id: StudioToolId; icon: typeof ImageIcon }[] = [
  { id: 'diagram', icon: ImageIcon },
  { id: 'animation', icon: Clapperboard },
  { id: 'enhance', icon: Sparkles },
];

function Studio() {
  const search = Route.useSearch();
  const [tab, setTab] = useState<StudioToolId>(search.tool ?? 'diagram');
  const switches = useStudioToolSwitches();
  return (
    <main className="mx-auto min-h-screen max-w-3xl px-5 py-6 md:py-8">
      <Link to="/" className="inline-flex items-center gap-1 text-sm text-primary"><ArrowLeft className="size-4" /> SnapSolve</Link>
      <div className="mt-6">
        <h1 className="font-display text-3xl font-semibold">AI Studio</h1>
        <p className="mt-1 text-sm text-muted-foreground">Padhai ke liye diagram, poster, animation aur saaf video. Har tool ka apna on/off switch hai.</p>
      </div>
      <div role="tablist" aria-label="Studio tools" className="mt-5 grid grid-cols-3 gap-1.5 rounded-2xl bg-muted p-1.5">
        {TABS.map(({ id, icon: Icon }) => {
          const on = switches[id][0];
          return (
            <button key={id} type="button" role="tab" aria-selected={tab === id} aria-controls={`studio-panel-${id}`} id={`studio-tab-${id}`}
              onClick={() => setTab(id)}
              className={cn('touch-btn flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-xl px-2 py-2 text-xs font-medium transition-colors sm:flex-row sm:gap-2 sm:text-sm',
                tab === id ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}>
              <Icon className="size-4" />
              <span className="text-center leading-tight">{STUDIO_TOOLS[id].label}</span>
              {!on && <span className="rounded-full bg-background px-1.5 text-[10px] text-muted-foreground">Off</span>}
            </button>
          );
        })}
      </div>
      <div className="mt-4" role="tabpanel" id={`studio-panel-${tab}`} aria-labelledby={`studio-tab-${tab}`}>
        {tab === 'diagram' && <ImageTool initialTopic={search.tool === 'diagram' ? search.topic ?? '' : ''} />}
        {tab === 'animation' && <AnimationTool initialTopic={search.tool === 'animation' ? search.topic ?? '' : ''} />}
        {tab === 'enhance' && <EnhanceTool />}
      </div>
      <StudioGallery />
    </main>
  );
}
