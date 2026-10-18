import { useEffect, useState } from "react";
import { Check, Copy, MoreHorizontal, Share2, ThumbsDown, ThumbsUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

type Vote = "up" | "down" | null;
const KEY = "snapsolve.votes.v1";

function readVotes(): Record<string, Vote> {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || "{}");
    return v && typeof v === "object" ? v : {};
  } catch {
    return {};
  }
}

export function setVote(id: string, vote: Vote) {
  const votes = readVotes();
  if (vote) votes[id] = vote;
  else delete votes[id];
  localStorage.setItem(KEY, JSON.stringify(votes));
}

export function getVote(id: string): Vote {
  return readVotes()[id] ?? null;
}

/** Like / unlike / copy / share actions under an agent reply. Stored locally per message id. */
export function MessageActions({ messageId, text }: { messageId: string; text: string }) {
  const [vote, setVoteState] = useState<Vote>(null);
  const [copied, setCopied] = useState(false);
  useEffect(() => setVoteState(getVote(messageId)), [messageId]);

  const cast = (v: Exclude<Vote, null>) => {
    const next = vote === v ? null : v;
    setVoteState(next);
    setVote(messageId, next);
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked */
    }
  };

  const share = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: "SnapSolve answer", text });
        return;
      } catch {
        /* user cancelled */
      }
    } else {
      await copy();
    }
  };

  const btn = "size-7 text-muted-foreground hover:text-foreground";
  return (
    <div className="mt-1 flex items-center gap-0.5" aria-label="Answer actions">
      <Button variant="ghost" size="icon" className={btn} aria-label="Like answer" aria-pressed={vote === "up"} onClick={() => cast("up")}>
        <ThumbsUp className={`size-3.5 ${vote === "up" ? "fill-primary text-primary" : ""}`} />
      </Button>
      <Button variant="ghost" size="icon" className={btn} aria-label="Unlike answer" aria-pressed={vote === "down"} onClick={() => cast("down")}>
        <ThumbsDown className={`size-3.5 ${vote === "down" ? "fill-primary text-primary" : ""}`} />
      </Button>
      <Button variant="ghost" size="icon" className={btn} aria-label="Copy answer" onClick={copy}>
        {copied ? <Check className="size-3.5 text-primary" /> : <Copy className="size-3.5" />}
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className={btn} aria-label="More actions">
            <MoreHorizontal className="size-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem onClick={share}>
            <Share2 className="mr-2 size-4" /> Share answer
          </DropdownMenuItem>
          <DropdownMenuItem onClick={copy}>
            <Copy className="mr-2 size-4" /> Copy text
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
