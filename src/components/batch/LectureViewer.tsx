import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MessageResponse } from "@/components/ai-elements/message";
import { getLecture } from "@/lib/vedantu/batch.functions";

type Lecture = Awaited<ReturnType<typeof getLecture>>;

/** In-app lecture view: Vedantu smart notes in their original order with timestamps and slide photos. Fetched live, not stored. */
export function LectureViewer({ sessionId, title, open, onOpenChange }: { sessionId: string; title: string; open: boolean; onOpenChange: (o: boolean) => void }) {
  const load = useServerFn(getLecture);
  const [data, setData] = useState<Lecture | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open || data) return;
    let live = true;
    setError("");
    load({ data: { sessionId } })
      .then((d) => live && setData(d))
      .catch(() => live && setError("Lecture abhi Vedantu se load nahi hua. Thodi der baad try karo."));
    return () => { live = false; };
  }, [open, data, load, sessionId]);

  let lastSection = "";
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title || "Lecture"}</DialogTitle>
          <DialogDescription className="font-mono text-[11px]">Session ID: {sessionId}</DialogDescription>
        </DialogHeader>
        {error && <p className="text-sm text-destructive">{error}</p>}
        {!data && !error && <p className="text-sm text-muted-foreground">Vedantu se lecture khul raha hai…</p>}
        {data && (
          <div className="space-y-5">
            <div className="flex flex-wrap gap-2">
              <Button asChild size="sm" variant="outline"><a href={data.smartNotesUrl} target="_blank" rel="noreferrer">Vedantu par kholo</a></Button>
              <Button asChild size="sm" variant="outline"><a href={data.pdfUrl} target="_blank" rel="noreferrer">PDF notes</a></Button>
            </div>
            {data.topics.length > 0 && (
              <section className="rounded-md border p-3">
                <h3 className="mb-2 text-sm font-semibold">Lecture timeline</h3>
                <ul className="space-y-1 text-sm">
                  {data.topics.map((t) => (
                    <li key={`${t.at}-${t.title}`}><span className="font-mono text-xs text-muted-foreground">{t.at}</span> · {t.title}</li>
                  ))}
                </ul>
              </section>
            )}
            {data.summary && <MessageResponse className="text-sm text-muted-foreground">{data.summary}</MessageResponse>}
            {data.notes.map((n, i) => {
              const head = n.section && n.section !== lastSection ? (lastSection = n.section) : "";
              return (
                <article key={i} className="space-y-2">
                  {head && <h3 className="border-b pb-1 font-display text-lg">{head}</h3>}
                  <div className="flex flex-wrap items-center gap-2">
                    {n.title && <span className="font-medium">{n.title}</span>}
                    {n.start && <Badge variant="outline" className="font-mono text-[11px]">{n.start}{n.end ? `–${n.end}` : ""}</Badge>}
                  </div>
                  {n.images.map((src) => (
                    <a key={src} href={src} target="_blank" rel="noreferrer">
                      <img src={src} alt={n.title || "Lecture slide"} loading="lazy" className="w-full rounded-md border" />
                    </a>
                  ))}
                  {n.markdown && <MessageResponse className="text-sm">{n.markdown}</MessageResponse>}
                </article>
              );
            })}
            {!data.notes.length && <p className="text-sm text-muted-foreground">Is class ke smart notes khaali aaye.</p>}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
