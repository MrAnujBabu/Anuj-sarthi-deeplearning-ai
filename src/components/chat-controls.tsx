import { Globe, GraduationCap } from "lucide-react";
import { ModelPicker } from "@/components/model-picker";
import { Switch } from "@/components/ui/switch";
import type { Effort } from "@/lib/models";

export function ChatControls({ model, effort, onModel, onEffort, quiz, onQuiz, search, onSearch, disabled = false }: {
  model: string; effort: Effort; onModel: (value: string) => void; onEffort: (value: Effort) => void;
  quiz: boolean; onQuiz: (value: boolean) => void; search: boolean; onSearch: (value: boolean) => void; disabled?: boolean;
}) {
  return (
    <div className="grid w-full min-w-0 grid-cols-1 items-center gap-2 border-t border-border/60 px-3 py-2 sm:grid-cols-[minmax(0,1fr)_auto]" aria-label="Chat settings">
      <ModelPicker model={model} effort={effort} onModel={onModel} onEffort={onEffort} disabled={disabled} />
      <div className="flex shrink-0 items-center gap-4">
        <label className="flex cursor-pointer items-center gap-1.5 text-xs" title="Practice one question at a time">
          <GraduationCap className="size-3.5 text-muted-foreground" />
          <span>Quiz</span>
          <Switch checked={quiz} onCheckedChange={onQuiz} aria-label="Quiz mode" />
        </label>
        <label className="flex cursor-pointer items-center gap-1.5 text-xs" title="Search live web sources">
          <Globe className={search ? "size-3.5 text-primary" : "size-3.5 text-muted-foreground"} />
          <span>Search</span>
          <Switch checked={search} onCheckedChange={onSearch} aria-label="Web search" />
        </label>
      </div>
    </div>
  );
}