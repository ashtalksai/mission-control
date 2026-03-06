"use client";

import { Badge } from "@/components/ui/badge";
import { usePolling } from "@/hooks/use-polling";
import { POLLING_INTERVALS } from "@/lib/constants-client";
import { cn } from "@/lib/utils";
import type { PipelineResponse, PipelineCard } from "@/lib/types";

const AGENT_COLORS: Record<string, string> = {
  "@planner": "text-orange-400 border-orange-500/20",
  "@strategist": "text-cyan-400 border-cyan-500/20",
  "@designer": "text-pink-400 border-pink-500/20",
  "@coder": "text-violet-400 border-violet-500/20",
  "@tester": "text-amber-400 border-amber-500/20",
  "@artist": "text-rose-400 border-rose-500/20",
  "@marketer": "text-emerald-400 border-emerald-500/20",
  "@ops": "text-blue-400 border-blue-500/20",
};

const LIST_META: Record<string, { label: string; dot: string }> = {
  doing: { label: "In Progress", dot: "bg-emerald-500" },
  backlog: { label: "Backlog", dot: "bg-zinc-500" },
  review: { label: "Review", dot: "bg-amber-500" },
  done: { label: "Done", dot: "bg-blue-500" },
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
                AGENT_COLORS[card.agentLabel] ?? "text-zinc-400 border-zinc-500/20"
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
            <div className="flex-1 h-1 bg-muted/30 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500/50 rounded-full" style={{ width: `${pct}%` }} />
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
    <div className="h-full p-3 grid grid-cols-4 grid-rows-[auto_1fr] gap-3">
      {/* Header */}
      <div className="col-span-4 rounded-lg border border-border bg-card px-4 py-2.5 flex items-center gap-4">
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
      </div>

      {/* Kanban columns — each scrolls internally */}
      {lists.map((key) => {
        const meta = LIST_META[key];
        const cards = data?.[key] ?? [];
        return (
          <div key={key} className="rounded-lg border border-border bg-card overflow-hidden flex flex-col">
            <div className="px-3 py-2 border-b border-border/60 shrink-0 flex items-center gap-2">
              <div className={cn("w-1.5 h-1.5 rounded-full", meta.dot)} />
              <span className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
                {meta.label}
              </span>
              <span className="text-xs text-muted-foreground/50 ml-auto">{cards.length}</span>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin p-2 space-y-1.5">
              {cards.map((card) => (
                <PipelineCardItem key={card.id} card={card} />
              ))}
              {cards.length === 0 && (
                <p className="text-xs text-muted-foreground/40 text-center py-6">Empty</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
