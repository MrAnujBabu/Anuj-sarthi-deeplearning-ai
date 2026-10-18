import { Camera, FileText, X } from "lucide-react";
import type { ChatStatus } from "ai";
import { toast } from "sonner";
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
          <button
            type="button"
            onClick={() => remove(f.id)}
            aria-label="Remove file"
            className="absolute -right-2 -top-2 rounded-full bg-foreground p-1 text-background"
          >
            <X className="size-3" />
          </button>
        </div>
      ))}
    </div>
  );
}

function SnapButton({ big }: { big?: boolean }) {
  const { openFileDialog } = usePromptInputAttachments();
  return (
    <PromptInputButton onClick={openFileDialog} variant={big ? "default" : "ghost"} className={big ? "gap-2 px-3" : ""}>
      <Camera className="size-4" />
      <span>{big ? "Snap / upload question or PDF" : "Photo / PDF"}</span>
    </PromptInputButton>
  );
}

export function SnapComposer({
  onSubmit,
  status,
  onStop,
  placeholder,
  big,
}: {
  onSubmit: (m: PromptInputMessage) => void;
  status?: ChatStatus;
  onStop?: () => void;
  placeholder?: string;
  big?: boolean;
}) {
  const busy = status === "submitted" || status === "streaming";
  return (
    <PromptInput
      onSubmit={(m) => {
        if (!m.text.trim() && m.files.length === 0) return;
        onSubmit(m);
      }}
      accept="image/*,application/pdf"
      multiple
      maxFiles={4}
      maxFileSize={15 * 1024 * 1024}
      onError={(e) => toast.error(e.code === "max_file_size" ? "File too big — keep it under 15 MB." : e.message)}
      globalDrop
      className="bg-card shadow-sm"
    >
      <AttachmentPreviews />
      <PromptInputTextarea autoFocus placeholder={placeholder ?? "Ask a follow-up…"} />
      <PromptInputFooter>
        <PromptInputTools>
          <SnapButton big={!!big} />
        </PromptInputTools>
        <PromptInputSubmit {...(status ? { status } : {})} {...(onStop ? { onStop } : {})} disabled={busy && !onStop} />
      </PromptInputFooter>
    </PromptInput>
  );
}
