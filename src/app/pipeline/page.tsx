"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { usePolling } from "@/hooks/use-polling";
import { POLLING_INTERVALS } from "@/lib/constants-client";
import { cn } from "@/lib/utils";
import type { PipelineResponse, PipelineCard } from "@/lib/types";

const AGENT_COLORS: Record<string, string> = {
  "@planner": "text-orange-600 dark:text-orange-400 border-orange-500/20",
  "@strategist": "text-cyan-600 dark:text-cyan-400 border-cyan-500/20",
  "@designer": "text-pink-600 dark:text-pink-400 border-pink-500/20",
  "@coder": "text-primary border-primary/20",
  "@tester": "text-amber-600 dark:text-amber-400 border-amber-500/20",
  "@artist": "text-rose-600 dark:text-rose-400 border-rose-500/20",
  "@marketer": "text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  "@ops": "text-blue-600 dark:text-blue-400 border-blue-500/20",
};

const LIST_META: Record<string, { label: string; dot: string }> = {
  doing: { label: "In Progress", dot: "bg-emerald-600 dark:bg-emerald-500" },
  backlog: { label: "Backlog", dot: "bg-muted" },
  review: { label: "Review", dot: "bg-amber-600 dark:bg-amber-500" },
  done: { label: "Done", dot: "bg-blue-600 dark:bg-blue-500" },
};

function PipelineCardItem({ card }: { card: PipelineCard }) {
  const pct = card.pipelineTotal > 0 ? Math.round((card.pipelineDone / card.pipelineTotal) * 100) : 0;
  return (
    <a href={card.url} target="_blank" rel="noopener noreferrer" className="block">
      <div className="rounded-md border border-border/50 p-2.5 hover:border-foreground/20 transition-colors">
        <div className="flex items-start justify-between gap-1.5 mb-1">
          <span className="text-sm font-medium text-foreground leading-tight line-clamp-2">
            {card.name}
          </span>
          {card.agentLabel && (
            <Badge
              variant="outline"
              className={cn(
                "text-xs px-1 py-0 h-3 shrink-0",
                AGENT_COLORS[card.agentLabel] ?? "text-muted-foreground border-muted"
              )}
            >
              {card.agentLabel}
            </Badge>
          )}
        </div>
        {card.currentStage && (
          <p className="text-xs text-muted-foreground mb-1.5 truncate">{card.currentStage}</p>
        )}
        {card.pipelineTotal > 0 && (
          <div className="flex items-center gap-2">
            <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-emerald-600/60 dark:bg-emerald-500/60 rounded-full" style={{ width: `${pct}%` }} />
            </div>
            <span className="text-xs text-muted-foreground font-mono">{card.pipelineDone}/{card.pipelineTotal}</span>
          </div>
        )}
      </div>
    </a>
  );
}

export default function PipelinePage() {
  const { data } = usePolling<PipelineResponse>("/api/pipeline", POLLING_INTERVALS.pipeline);
  const lists = ["doing", "backlog", "review", "done"] as const;

  return (
    <div className="p-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 lg:grid-rows-[auto_1fr] gap-3 lg:h-full">
      {/* Header */}
      <Card className="col-span-1 md:col-span-2 lg:col-span-4 gap-0 rounded-lg py-0">
        <CardContent className="px-4 py-2.5 flex items-center gap-4">
          <span className="text-sm font-medium text-foreground">Pipeline</span>
          <span className="text-xs text-muted-foreground">{data?.totalCards ?? 0} cards</span>
          <div className="ml-auto flex items-center gap-3">
            {lists.map((key) => {
              const count = data?.[key]?.length ?? 0;
              const meta = LIST_META[key];
              return (
                <div key={key} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <div className={cn("w-1.5 h-1.5 rounded-full", meta.dot)} />
                  {meta.label}: {count}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Kanban columns -- each scrolls internally on desktop */}
      {lists.map((key) => {
        const meta = LIST_META[key];
        const cards = data?.[key] ?? [];
        return (
          <Card key={key} className="gap-0 rounded-lg py-0 overflow-hidden lg:h-full">
            <CardHeader className="px-3 py-2 border-b border-border/60 gap-0 flex-row items-center">
              <div className={cn("w-1.5 h-1.5 rounded-full mr-2", meta.dot)} />
              <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
                {meta.label}
              </CardTitle>
              <span className="text-xs text-muted-foreground/50 ml-auto">{cards.length}</span>
            </CardHeader>
            <CardContent className="flex-1 min-h-0 overflow-y-auto scrollbar-thin p-2 space-y-1.5">
              {cards.map((card) => (
                <PipelineCardItem key={card.id} card={card} />
              ))}
              {cards.length === 0 && (
                <p className="text-xs text-muted-foreground/40 text-center py-6">Empty</p>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
