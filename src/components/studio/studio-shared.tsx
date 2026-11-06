import type { ReactNode } from 'react';
import { Coins, PowerOff } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { STUDIO_TOOLS, useStudioTool, type StudioToolId } from '@/lib/studio-tools';
import { cn } from '@/lib/utils';

export async function postJson<T>(url: string, body: unknown, signal?: AbortSignal): Promise<T> {
  const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), ...(signal ? { signal } : {}) });
  const json = await res.json().catch(() => ({})) as { error?: string };
  if (!res.ok) throw new Error(json.error || `Request failed (${res.status})`);
  return json as T;
}

/** Tool title with its own on/off switch; when off, the form is replaced by a short note. */
export function ToolPanel({ id, icon, children }: { id: StudioToolId; icon: ReactNode; children: ReactNode }) {
  const [on, setOn] = useStudioTool(id);
  const tool = STUDIO_TOOLS[id];
  return (
    <section className="rounded-2xl border bg-card p-4 shadow-sm md:p-5" aria-labelledby={`studio-${id}-title`}>
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">{icon}</span>
        <div className="min-w-0 flex-1">
          <h2 id={`studio-${id}-title`} className="font-display text-lg font-semibold leading-tight">{tool.label}</h2>
          <p className="text-xs text-muted-foreground">{tool.vendor} · {tool.hint}</p>
        </div>
        <label className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
          {on ? 'On' : 'Off'}
          <Switch checked={on} onCheckedChange={setOn} aria-label={`${tool.label} on/off`} />
        </label>
      </div>
      {on ? <div className="mt-4">{children}</div> : (
        <p className="mt-4 flex items-center gap-2 rounded-xl border border-dashed bg-muted/40 px-3 py-3 text-sm text-muted-foreground">
          <PowerOff className="size-4 shrink-0" /> Yeh tool band hai. Switch on karke istemaal kariye — band rehne par koi credit kharch nahi hota.
        </p>
      )}
    </section>
  );
}

/** Stays on screen (unlike a toast) so a "vendor switched off" or credits message can be read and acted on. */
export function ToolError({ message }: { message: string | null }) {
  if (!message) return null;
  return <p role="alert" className="mt-3 rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-sm text-destructive">{message}</p>;
}

export function CostNote({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p className={cn('flex items-center gap-1.5 text-xs text-muted-foreground', className)}>
      <Coins className="size-3.5 shrink-0 text-primary" /> {children}
    </p>
  );
}

/** Small segmented choice used for style, duration, quality and size. */
export function Choice<T extends string | number>({ label, value, options, onChange, disabled }: {
  label: string; value: T; options: readonly { value: T; label: string }[]; onChange: (v: T) => void; disabled?: boolean;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-1.5">
      {options.map(o => (
        <button
          key={String(o.value)} type="button" role="radio" aria-checked={o.value === value} disabled={disabled}
          onClick={() => onChange(o.value)}
          className={cn('touch-btn min-h-9 rounded-full border px-3 text-sm transition-colors disabled:opacity-50',
            o.value === value ? 'border-primary bg-primary/10 font-medium text-primary' : 'bg-background hover:bg-muted')}
        >{o.label}</button>
      ))}
    </div>
  );
}

export function FieldLabel({ htmlFor, children, hint }: { htmlFor?: string; children: ReactNode; hint?: string }) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium">
      {children}{hint && <span className="ml-1 font-normal text-muted-foreground">{hint}</span>}
    </label>
  );
}

export function downloadDataUrl(dataUrl: string, name: string) {
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = name;
  a.click();
}

export function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  downloadDataUrl(url, name);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'snapsolve';
