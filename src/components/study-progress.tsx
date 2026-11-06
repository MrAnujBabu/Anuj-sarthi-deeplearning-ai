import { Link } from "@tanstack/react-router";
import { Brain, Flame, Target } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { loadPractice } from "@/lib/practice";
import { dueCards, type Card } from "@/lib/srs";
import { GOAL_CHOICES, answeredOn, lastDays, loadDailyGoal, loadSeededActivity, saveDailyGoal, studyStreak, type ActivityLog } from "@/lib/study-stats";
import { loadThreads } from "@/lib/threads";
import { cn } from "@/lib/utils";

type Snapshot = { log: ActivityLog; cards: Card[]; goal: number; now: number };

/** Today's study at a glance: questions answered vs goal, streak, due revision and the last week. */
export function StudyProgress({ className }: { className?: string }) {
  const [snap, setSnap] = useState<Snapshot | null>(null);
  useEffect(() => {
    const load = () => setSnap({ log: loadSeededActivity(loadThreads()), cards: loadPractice(), goal: loadDailyGoal(), now: Date.now() });
    load();
    const events = ["snapsolve:activity", "snapsolve:cards", "snapsolve:threads", "storage"];
    for (const e of events) window.addEventListener(e, load);
    const onVisible = () => document.visibilityState === "visible" && load();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      for (const e of events) window.removeEventListener(e, load);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  if (!snap) return <div className={cn("h-[188px] rounded-2xl border bg-card/60", className)} aria-hidden />;

  const { log, cards, goal, now } = snap;
  const today = answeredOn(log, now);
  const streak = studyStreak(log, now);
  const week = lastDays(log, now, 7);
  const due = dueCards(cards, now).length;
  const mastered = cards.filter((c) => c.box >= 4).length;
  const pct = Math.min(1, today / goal);
  const peak = Math.max(1, ...week.map((d) => d.answered + d.reviews));
  const R = 26;
  const C = 2 * Math.PI * R;

  return (
    <section aria-label="Aaj ki padhai" className={cn("rounded-2xl border bg-card p-4 shadow-sm md:p-5", className)}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-base font-semibold md:text-lg">Aaj ki padhai</h2>
        <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Target className="size-3.5" />
          Lakshya
          <Select value={String(goal)} onValueChange={(v) => saveDailyGoal(Number(v))}>
            <SelectTrigger className="h-7 w-[5.5rem] px-2 text-xs" aria-label="Daily goal">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {GOAL_CHOICES.map((g) => (
                <SelectItem key={g} value={String(g)}>{g} / din</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>
      </div>

      <div className="mt-3 grid grid-cols-[auto_minmax(0,1fr)] items-center gap-4">
        <div className="relative size-[68px]" role="img" aria-label={`${today} of ${goal} questions answered today`}>
          <svg viewBox="0 0 64 64" className="size-full -rotate-90">
            <circle cx="32" cy="32" r={R} fill="none" strokeWidth="6" className="stroke-muted" />
            <circle cx="32" cy="32" r={R} fill="none" strokeWidth="6" strokeLinecap="round" className="stroke-primary transition-[stroke-dashoffset] duration-700" strokeDasharray={C} strokeDashoffset={C * (1 - pct)} />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center leading-none">
            <span className="font-display text-lg font-semibold tabular-nums">{today}</span>
            <span className="text-[10px] text-muted-foreground">/ {goal}</span>
          </div>
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium">
            {today >= goal ? "Aaj ka lakshya poora! Shabash." : today === 0 ? "Aaj ka pehla doubt poochho." : `${goal - today} aur sawaal — lakshya poora.`}
          </p>
          <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Flame className={cn("size-3.5", streak.days > 0 ? "text-highlight" : "")} />
              <span className="tabular-nums">{streak.days}</span> din ki streak{streak.days > 0 && !streak.activeToday ? " · aaj bachao" : ""}
            </span>
            <span className="flex items-center gap-1">
              <Brain className="size-3.5" />
              <span className="tabular-nums">{cards.length}</span> cards · <span className="tabular-nums">{mastered}</span> pakke
            </span>
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-end gap-3">
        <div className="flex h-12 flex-1 items-end gap-1.5" role="img" aria-label="Last 7 days of study">
          {week.map((d) => {
            const total = d.answered + d.reviews;
            return (
              <div key={d.key} className="flex flex-1 flex-col items-center gap-1" title={`${d.key}: ${d.answered} answered, ${d.reviews} revised`}>
                <div className="flex h-9 w-full items-end overflow-hidden rounded-sm bg-muted">
                  <div className={cn("w-full rounded-sm transition-[height] duration-500", d.today ? "bg-primary" : "bg-primary/45")} style={{ height: `${total ? Math.max(12, (total / peak) * 100) : 0}%` }} />
                </div>
                <span className={cn("text-[10px] leading-none", d.today ? "font-semibold text-foreground" : "text-muted-foreground")}>{d.label}</span>
              </div>
            );
          })}
        </div>
        {due > 0 ? (
          <Button asChild size="sm" className="touch-btn shrink-0 rounded-full">
            <Link to="/practice">{due} revise karo</Link>
          </Button>
        ) : cards.length > 0 ? (
          <span className="shrink-0 pb-1 text-xs text-muted-foreground">Revision up to date</span>
        ) : null}
      </div>
    </section>
  );
}
