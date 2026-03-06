"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { usePolling } from "@/hooks/use-polling";
import { POLLING_INTERVALS } from "@/lib/constants-client";
import { cn } from "@/lib/utils";
import type { PipelineResponse, PipelineCard } from "@/lib/types";

const LIST_META: Record<string, { label: string; color: string; dot: string }> = {
  doing: { label: "In Progress", color: "border-emerald-500/30", dot: "bg-emerald-500" },
  backlog: { label: "Backlog", color: "border-zinc-500/30", dot: "bg-zinc-500" },
  review: { label: "Review", color: "border-amber-500/30", dot: "bg-amber-500" },
  done: { label: "Done", color: "border-blue-500/30", dot: "bg-blue-500" },
};

const AGENT_COLORS: Record<string, string> = {
  "@planner": "bg-orange-500/15 text-orange-400 border-orange-500/20",
  "@strategist": "bg-cyan-500/15 text-cyan-400 border-cyan-500/20",
  "@designer": "bg-pink-500/15 text-pink-400 border-pink-500/20",
  "@coder": "bg-violet-500/15 text-violet-400 border-violet-500/20",
  "@tester": "bg-amber-500/15 text-amber-400 border-amber-500/20",
  "@artist": "bg-rose-500/15 text-rose-400 border-rose-500/20",
  "@marketer": "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
  "@ops": "bg-blue-500/15 text-blue-400 border-blue-500/20",
};

function PipelineCardItem({ card }: { card: PipelineCard }) {
  const progress = card.pipelineTotal > 0
    ? Math.round((card.pipelineDone / card.pipelineTotal) * 100)
    : 0;

  return (
    <a href={card.url} target="_blank" rel="noopener noreferrer">
      <Card className="hover:border-foreground/20 transition-colors cursor-pointer">
        <CardContent className="p-3">
          <div className="flex items-start justify-between gap-2 mb-2">
            <h3 className="text-sm font-medium text-foreground leading-tight line-clamp-2">
              {card.name}
            </h3>
            {card.agentLabel && (
              <Badge
                variant="outline"
                className={cn(
                  "text-[10px] px-1.5 py-0 h-4 border shrink-0",
                  AGENT_COLORS[card.agentLabel] ?? "bg-zinc-500/15 text-zinc-400 border-zinc-500/20"
                )}
              >
                {card.agentLabel}
              </Badge>
            )}
          </div>

          {card.currentStage && (
            <p className="text-[10px] text-muted-foreground mb-2 truncate">
              {card.currentStage}
            </p>
          )}

          {card.pipelineTotal > 0 && (
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>{card.pipelineDone}/{card.pipelineTotal} stages</span>
                <span>{progress}%</span>
              </div>
              <div className="h-1 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          <div className="flex items-center gap-2 mt-2">
            {card.labels.filter(l => !l.startsWith("@")).map((label) => (
              <Badge
                key={label}
                variant="secondary"
                className="text-[9px] px-1 py-0 h-3.5"
              >
                {label}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>
    </a>
  );
}

export default function PipelinePage() {
  const { data } = usePolling<PipelineResponse>(
    "/api/pipeline",
    POLLING_INTERVALS.pipeline
  );

  const lists = ["doing", "backlog", "review", "done"] as const;

  return (
    <div className="flex flex-col h-full">
      <div className="h-12 border-b border-border bg-card flex items-center px-4">
        <h1 className="text-sm font-semibold text-foreground">Pipeline</h1>
        <span className="text-xs text-muted-foreground ml-2">
          {data?.totalCards ?? 0} cards
        </span>
      </div>
      <div className="flex-1 overflow-auto p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 h-full">
          {lists.map((listKey) => {
            const meta = LIST_META[listKey];
            const cards = data?.[listKey] ?? [];
            return (
              <div key={listKey} className="flex flex-col min-h-0">
                <div className="flex items-center gap-2 mb-3">
                  <div className={cn("w-2 h-2 rounded-full", meta.dot)} />
                  <h2 className="text-xs font-semibold text-foreground uppercase tracking-wider">
                    {meta.label}
                  </h2>
                  <span className="text-[10px] text-muted-foreground">
                    {cards.length}
                  </span>
                </div>
                <div className={cn("flex-1 space-y-2 rounded-lg border p-2 bg-card/50", meta.color)}>
                  {cards.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-4">
                      No cards
                    </p>
                  )}
                  {cards.map((card) => (
                    <PipelineCardItem key={card.id} card={card} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
