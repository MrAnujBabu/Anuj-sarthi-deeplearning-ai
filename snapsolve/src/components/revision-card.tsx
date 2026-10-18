import { useNavigate } from "@tanstack/react-router";
import { Brain } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { dueCards, loadCards, type Card } from "@/lib/srs";
import { loadPractice } from "@/lib/practice";

/** Shows today's spaced-repetition revision and starts a quiz session for it. */
export function RevisionCard() {
  const navigate = useNavigate();
  const [cards, setCards] = useState<Card[]>([]);
  useEffect(() => {
    const load = () => setCards(loadPractice());
    load();
    window.addEventListener("snapsolve:cards", load);
    return () => window.removeEventListener("snapsolve:cards", load);
  }, []);
  if (!cards.length) return null;
  const due = dueCards(cards, Date.now());
  const mastered = cards.filter((c) => c.box >= 4).length;

  return (
    <div className="mt-6 flex flex-wrap items-center gap-4 border-t border-border py-5">
      <Brain className="size-6 text-primary" />
      <div className="min-w-0 flex-1">
        <div className="font-display text-lg font-semibold">
          {due.length ? `${due.length} question${due.length > 1 ? "s" : ""} due for revision` : "All caught up for today"}
        </div>
        <div className="text-sm text-muted-foreground">
          {cards.length} in your deck · {mastered} mastered · spaced repetition
        </div>
      </div>
      <Button
        disabled={!cards.length}
        onClick={() => {
          navigate({ to: "/practice" });
        }}
      >
        Practice saved
      </Button>
    </div>
  );
}
