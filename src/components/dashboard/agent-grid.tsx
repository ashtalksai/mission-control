"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { AgentStatus } from "@/lib/types";

const MODEL_COLORS: Record<string, string> = {
  opus: "bg-violet-500/15 text-violet-400 border-violet-500/20",
  sonnet: "bg-blue-500/15 text-blue-400 border-blue-500/20",
  haiku: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
  codex: "bg-amber-500/15 text-amber-400 border-amber-500/20",
  unknown: "bg-zinc-500/15 text-zinc-400 border-zinc-500/20",
};

function timeAgo(iso: string | null): string {
  if (!iso) return "never";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function AgentGrid({ agents }: { agents: AgentStatus[] }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
      {agents.map((agent) => (
        <Card
          key={agent.name}
          className={cn(
            "relative overflow-hidden transition-all duration-300",
            agent.isCurrentAgent && "ring-1 ring-emerald-500/50 shadow-[0_0_15px_-3px_rgba(16,185,129,0.2)]"
          )}
        >
          <CardContent className="p-3">
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <div
                  className={cn(
                    "w-2 h-2 rounded-full shrink-0",
                    agent.status === "active" ? "bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]" : "bg-zinc-600"
                  )}
                />
                <span className="text-sm font-medium text-foreground truncate">
                  @{agent.name}
                </span>
              </div>
              <Badge
                variant="outline"
                className={cn("text-[10px] px-1.5 py-0 h-4 border", MODEL_COLORS[agent.model] ?? MODEL_COLORS.unknown)}
              >
                {agent.model}
              </Badge>
            </div>
            <div className="space-y-1">
              <p className="text-[11px] text-muted-foreground">
                {timeAgo(agent.lastActivity)}
              </p>
              {agent.isCurrentAgent && agent.currentNote && (
                <p className="text-[11px] text-emerald-400 leading-tight line-clamp-2 mt-1">
                  {agent.currentNote}
                </p>
              )}
            </div>
            <div className="mt-2 text-[10px] text-muted-foreground">
              {agent.sessionCount} session{agent.sessionCount !== 1 ? "s" : ""}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
