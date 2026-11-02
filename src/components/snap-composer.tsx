import { ArrowUp, Camera, FileText, X } from "lucide-react";
import type { ChatStatus } from "ai";
import type { ReactNode } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DictateButton } from "@/components/dictate-button";
import { TooltipProvider } from "@/components/ui/tooltip";
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
          {!f.mediaType.startsWith('image/') ? (
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
    <PromptInputButton onClick={openFileDialog} variant="outline" className="h-9 shrink-0 gap-2 rounded-full px-3" tooltip="Upload photo, PDF or PowerPoint (.pptx)">
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
    <TooltipProvider>
    <div className="overflow-hidden rounded-2xl border border-input bg-card shadow-lg shadow-background/40 transition-[border-color,box-shadow] focus-within:border-primary/50 focus-within:ring-4 focus-within:ring-primary/10" aria-label="Chat composer">
    <PromptInput
      onSubmit={async (m) => {
        if (!m.text.trim() && m.files.length === 0) return;
        try { await onSubmit(m); } catch (error) { toast.error(error instanceof Error ? error.message : 'Could not read attachment.'); throw error; }
      }}
      accept="image/*,application/pdf,.pptx,application/vnd.openxmlformats-officedocument.presentationml.presentation"
      multiple
      maxFiles={4}
      maxFileSize={15 * 1024 * 1024}
      onError={(e) => toast.error(e.code === "max_file_size" ? "File too big — keep it under 15 MB." : e.message)}
      globalDrop
      className="bg-card [&_[data-slot=input-group]]:rounded-none [&_[data-slot=input-group]]:border-0 [&_[data-slot=input-group]]:bg-card [&_[data-slot=input-group]]:shadow-none [&_[data-slot=input-group]]:ring-0"
    >
      <AttachmentPreviews />
      <PromptInputTextarea className="min-h-20 text-sm md:min-h-24" onKeyDown={(event) => { if (busy && event.key === "Enter" && !event.shiftKey) event.preventDefault(); }} autoFocus placeholder={placeholder ?? "Ask a follow-up…"} />
      <PromptInputFooter className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 pt-2">
        <PromptInputTools className="flex-wrap gap-2 [&>button]:shrink-0">
          <SnapButton big={!!big} />
          {actions}
        </PromptInputTools>
        <PromptInputTools className="ml-auto shrink-0 gap-2">
          <DictateButton disabled={busy} />
        <PromptInputSubmit className="size-9 shrink-0 rounded-full" title={busy ? "Stop response" : "Send message"} {...(status ? { status } : {})} {...(onStop ? { onStop } : {})} {...(!busy ? { children: <ArrowUp className="size-4" /> } : {})} disabled={busy && !onStop} />
        </PromptInputTools>
      </PromptInputFooter>
    </PromptInput>
    {controls}
    </div>
    </TooltipProvider>
  );
}
