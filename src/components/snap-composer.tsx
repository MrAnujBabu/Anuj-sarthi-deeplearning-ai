import { Camera, FileText, X } from "lucide-react";
import type { ChatStatus } from "ai";
import type { ReactNode } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DictateButton } from "@/components/dictate-button";
import {
  PromptInput,
  PromptInputButton,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
  usePromptInputAttachments,
  type PromptInputMessage,
} from "@/components/ai-elements/prompt-input";

function AttachmentPreviews() {
  const { files, remove } = usePromptInputAttachments();
  if (!files.length) return null;
  return (
    <div className="flex w-full flex-wrap gap-2 px-3 pt-3">
      {files.map((f) => (
        <div key={f.id} className="relative">
          {f.mediaType === "application/pdf" ? (
            <div className="flex h-20 w-32 flex-col items-center justify-center gap-1 rounded-lg border bg-muted px-2 text-center text-xs">
              <FileText className="size-5 text-primary" />
              <span className="line-clamp-2 break-all">{f.filename ?? "PDF"}</span>
            </div>
          ) : (
            <img src={f.url} alt={f.filename ?? "Snapped question"} className="h-20 w-20 rounded-lg border object-cover" />
          )}
          <Button
            type="button"
            size="icon"
            variant="secondary"
            onClick={() => remove(f.id)}
            aria-label="Remove file"
            className="absolute -right-2 -top-2 size-6 rounded-full shadow-sm"
          >
            <X className="size-3" />
          </Button>
        </div>
      ))}
    </div>
  );
}

function SnapButton({ big }: { big?: boolean }) {
  const { openFileDialog } = usePromptInputAttachments();
  return (
    <PromptInputButton onClick={openFileDialog} variant="ghost" className="gap-2 px-2" title="Snap or upload a photo or PDF">
      <Camera className="size-4" />
      <span>{big ? "Snap / upload" : "Photo / PDF"}</span>
    </PromptInputButton>
  );
}

export function SnapComposer({
  onSubmit,
  status,
  onStop,
  placeholder,
  big,
  controls,
  actions,
}: {
  onSubmit: (m: PromptInputMessage) => void | Promise<void>;
  status?: ChatStatus;
  onStop?: () => void;
  placeholder?: string;
  big?: boolean;
  controls?: ReactNode;
  actions?: ReactNode;
}) {
  const busy = status === "submitted" || status === "streaming";
  return (
    <div className="overflow-hidden rounded-lg border border-input bg-card shadow-sm focus-within:border-ring" aria-label="Chat composer">
    <PromptInput
      onSubmit={(m) => {
        if (!m.text.trim() && m.files.length === 0) return;
        return onSubmit(m);
      }}
      accept="image/*,application/pdf"
      multiple
      maxFiles={4}
      maxFileSize={15 * 1024 * 1024}
      onError={(e) => toast.error(e.code === "max_file_size" ? "File too big — keep it under 15 MB." : e.message)}
      globalDrop
      className="bg-card [&_[data-slot=input-group]]:rounded-none [&_[data-slot=input-group]]:border-0 [&_[data-slot=input-group]]:bg-card [&_[data-slot=input-group]]:shadow-none [&_[data-slot=input-group]]:ring-0"
    >
      <AttachmentPreviews />
      <PromptInputTextarea className="min-h-20 text-sm md:min-h-24" onKeyDown={(event) => { if (busy && event.key === "Enter" && !event.shiftKey) event.preventDefault(); }} autoFocus placeholder={placeholder ?? "Ask a follow-up…"} />
      <PromptInputFooter>
        <PromptInputTools>
          <SnapButton big={!!big} />
          {actions}
        </PromptInputTools>
        <PromptInputTools className="ml-auto">
          <DictateButton disabled={busy} />
        <PromptInputSubmit {...(status ? { status } : {})} {...(onStop ? { onStop } : {})} disabled={busy && !onStop} />
        </PromptInputTools>
      </PromptInputFooter>
    </PromptInput>
    {controls}
    </div>
  );
}
