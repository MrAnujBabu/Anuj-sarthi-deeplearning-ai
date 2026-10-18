import { MODELS, resolveModel, type Effort } from '@/lib/models';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
export function ModelPicker({ model, effort, onModel, onEffort, disabled }: { model: string; effort: Effort; onModel: (v: string) => void; onEffort: (v: Effort) => void; disabled?: boolean }) {
  return <div className="flex flex-wrap items-center gap-2">
    <Select value={model} onValueChange={onModel} disabled={disabled ?? false}><SelectTrigger aria-label="AI model" className="w-36 border-0 bg-transparent shadow-none"><SelectValue>{resolveModel(model)?.name}</SelectValue></SelectTrigger><SelectContent>{MODELS.map(m => <SelectItem key={m.id} value={m.id}>{m.name} · {m.description}</SelectItem>)}</SelectContent></Select>
    {resolveModel(model)?.effort && <Select value={effort} onValueChange={v => onEffort(v as Effort)} disabled={disabled ?? false}><SelectTrigger aria-label="Reasoning effort" className="w-28 border-0 bg-transparent shadow-none"><SelectValue /></SelectTrigger><SelectContent>{(['low','medium','high'] as const).map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent></Select>}
  </div>;
}