"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { usePolling } from "@/hooks/use-polling";
import { POLLING_INTERVALS } from "@/lib/constants-client";
import { cn } from "@/lib/utils";
import type {
  AgentStatusResponse,
  CostSummary,
  CronStatusResponse,
  PipelineResponse,
  HealthCheck,
} from "@/lib/types";

const MODEL_COLORS: Record<string, string> = {
  opus: "text-violet-400",
  sonnet: "text-blue-400",
  haiku: "text-emerald-400",
  codex: "text-amber-400",
};

function timeAgo(iso: string | null): string {
  if (!iso) return "never";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

function formatCountdown(ms: number): string {
  const diff = ms - Date.now();
  if (diff < 0) return "due";
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m`;
  return `${Math.floor(mins / 60)}h`;
}

function Clock() {
  const [time, setTime] = useState("");
  useEffect(() => {
    const tick = () =>
      setTime(
        new Date().toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
        })
      );
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  return <span className="font-mono text-xs text-muted-foreground tabular-nums">{time}</span>;
}

function Cell({
  title,
  className,
  children,
  href,
  headerRight,
}: {
  title?: string;
  className?: string;
  children: React.ReactNode;
  href?: string;
  headerRight?: React.ReactNode;
}) {
  const inner = (
    <div
      className={cn(
        "rounded-lg border border-border bg-card overflow-hidden flex flex-col h-full",
        href && "hover:border-foreground/20 transition-colors cursor-pointer",
        className
      )}
    >
      {title && (
        <div className="px-3 py-2.5 border-b border-border/60 shrink-0 flex items-center justify-between">
          <h3 className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
            {title}
          </h3>
          {headerRight}
        </div>
      )}
      <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin">
        {children}
      </div>
    </div>
  );
  if (href) return <Link href={href} className="contents">{inner}</Link>;
  return inner;
}

export default function DashboardPage() {
  const { data: agentData } = usePolling<AgentStatusResponse>(
    "/api/agents/status",
    POLLING_INTERVALS.agents
  );
  const { data: costData } = usePolling<CostSummary>(
    "/api/costs/summary",
    POLLING_INTERVALS.costs
  );
  const { data: cronData } = usePolling<CronStatusResponse>(
    "/api/cron/status",
    POLLING_INTERVALS.cron
  );
  const { data: pipelineData } = usePolling<PipelineResponse>(
    "/api/pipeline",
    POLLING_INTERVALS.pipeline
  );
  const { data: healthData } = usePolling<HealthCheck[]>(
    "/api/health",
    POLLING_INTERVALS.health
  );

  const doingCards = pipelineData?.doing ?? [];
  const criticalCount = healthData?.filter((c) => c.status === "critical").length ?? 0;
  const warningCount = healthData?.filter((c) => c.status === "warning").length ?? 0;
  const allHealthy = healthData?.every((c) => c.status === "healthy");

  return (
    <div className="h-full p-3 grid grid-cols-4 grid-rows-[auto_1fr_1fr] gap-3">
      {/* Row 1: Status bar */}
      <div className="col-span-4 rounded-lg border border-border bg-card px-4 py-2.5 flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div
            className={cn(
              "w-2 h-2 rounded-full",
              agentData?.activeAgent
                ? "bg-emerald-500 animate-pulse shadow-[0_0_6px_rgba(16,185,129,0.5)]"
                : "bg-zinc-600"
            )}
          />
          <span className="text-sm font-medium text-foreground">
            {agentData?.activeAgent ? `@${agentData.activeAgent}` : "Idle"}
          </span>
          {agentData?.activeNote && (
            <span className="text-xs text-muted-foreground truncate max-w-xs">
              {agentData.activeNote}
            </span>
          )}
        </div>
        <div className="ml-auto flex items-center gap-6">
          {/* Health pill */}
          <Link
            href="/health"
            className={cn(
              "flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-md border transition-colors",
              allHealthy
                ? "border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/5"
                : criticalCount > 0
                ? "border-red-500/20 text-red-400 hover:bg-red-500/5"
                : "border-amber-500/20 text-amber-400 hover:bg-amber-500/5"
            )}
          >
            <div
              className={cn(
                "w-1.5 h-1.5 rounded-full",
                allHealthy ? "bg-emerald-500" : criticalCount > 0 ? "bg-red-500" : "bg-amber-500"
              )}
            />
            {allHealthy ? "Healthy" : criticalCount > 0 ? `${criticalCount} critical` : `${warningCount} warn`}
          </Link>
          {/* Cost tickers */}
          <div className="flex items-center gap-4 text-right">
            <div>
              <span className="text-xs uppercase text-muted-foreground block leading-none">Today</span>
              <span className="text-sm font-mono font-bold text-foreground tabular-nums">
                ${(costData?.totalToday ?? 0).toFixed(2)}
              </span>
            </div>
            <div>
              <span className="text-xs uppercase text-muted-foreground block leading-none">Week</span>
              <span className="text-sm font-mono text-muted-foreground tabular-nums">
                ${(costData?.totalWeek ?? 0).toFixed(2)}
              </span>
            </div>
            <div>
              <span className="text-xs uppercase text-muted-foreground block leading-none">Month</span>
              <span className="text-sm font-mono text-muted-foreground tabular-nums">
                ${(costData?.totalMonth ?? 0).toFixed(2)}
              </span>
            </div>
          </div>
          <Clock />
        </div>
      </div>

      {/* Row 2: Agents (3 cols) + Pipeline doing (1 col) */}
      <Cell title="Agents" className="col-span-3" href="/agents">
        <div className="p-2.5 grid grid-cols-3 gap-2">
          {(agentData?.agents ?? []).map((agent) => (
            <div
              key={agent.name}
              className={cn(
                "rounded-md border border-border/60 p-2.5 transition-all",
                agent.isCurrentAgent &&
                  "border-emerald-500/30 bg-emerald-500/5 shadow-[0_0_12px_-4px_rgba(16,185,129,0.15)]"
              )}
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5">
                  <div
                    className={cn(
                      "w-1.5 h-1.5 rounded-full",
                      agent.status === "active"
                        ? "bg-emerald-500 shadow-[0_0_4px_rgba(16,185,129,0.5)]"
                        : "bg-zinc-600"
                    )}
                  />
                  <span className="text-xs font-medium text-foreground">@{agent.name}</span>
                </div>
                <span
                  className={cn(
                    "text-xs font-mono",
                    MODEL_COLORS[agent.model] ?? "text-zinc-500"
                  )}
                >
                  {agent.model}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{timeAgo(agent.lastActivity)}</span>
                <span>{agent.sessionCount}s</span>
              </div>
              {agent.isCurrentAgent && agent.currentNote && (
                <p className="text-xs text-emerald-400/80 mt-1 leading-tight truncate">
                  {agent.currentNote}
                </p>
              )}
            </div>
          ))}
        </div>
      </Cell>

      <Cell
        title="Pipeline"
        className="row-span-2"
        href="/pipeline"
        headerRight={
          <span className="text-xs text-muted-foreground">
            {pipelineData?.totalCards ?? 0} cards
          </span>
        }
      >
        <div className="p-2 space-y-1.5">
          {doingCards.length > 0 && (
            <>
              <div className="text-xs uppercase text-emerald-400/70 tracking-wider px-1 pt-1">
                In Progress
              </div>
              {doingCards.map((card) => {
                const pct = card.pipelineTotal > 0
                  ? Math.round((card.pipelineDone / card.pipelineTotal) * 100)
                  : 0;
                return (
                  <div key={card.id} className="rounded-md border border-border/40 p-2">
                    <div className="flex items-start justify-between gap-1 mb-1">
                      <span className="text-sm font-medium text-foreground leading-tight line-clamp-2">
                        {card.name}
                      </span>
                      {card.agentLabel && (
                        <Badge variant="outline" className="text-xs px-1 py-0 h-3 shrink-0">
                          {card.agentLabel}
                        </Badge>
                      )}
                    </div>
                    {card.pipelineTotal > 0 && (
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1 bg-muted/30 rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-500/60 rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-xs text-muted-foreground font-mono">{pct}%</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </>
          )}
          {(pipelineData?.backlog ?? []).length > 0 && (
            <>
              <div className="text-xs uppercase text-muted-foreground/50 tracking-wider px-1 pt-2">
                Backlog
              </div>
              {(pipelineData?.backlog ?? []).slice(0, 5).map((card) => (
                <div key={card.id} className="px-2 py-1.5 text-sm text-muted-foreground truncate">
                  {card.name}
                </div>
              ))}
            </>
          )}
        </div>
      </Cell>

      {/* Row 3: Cron upcoming + Cron recent + Cost chart */}
      <Cell
        title="Upcoming"
        href="/cron"
        headerRight={
          <span className="text-xs text-muted-foreground">
            {cronData?.upcoming.length ?? 0} jobs
          </span>
        }
      >
        <div className="p-2 space-y-1">
          {(cronData?.upcoming ?? []).map((job) => (
            <div key={job.id} className="flex items-center gap-2 px-1 py-1 text-xs">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
              <span className="text-foreground truncate flex-1">{job.name}</span>
              <span className="text-xs text-blue-400 font-mono shrink-0">
                {formatCountdown(job.state.nextRunAtMs)}
              </span>
            </div>
          ))}
        </div>
      </Cell>

      <Cell title="Recent Runs" href="/cron">
        <div className="p-2 space-y-1">
          {(cronData?.recent ?? []).map((job) => (
            <div key={job.id} className="flex items-center gap-2 px-1 py-1 text-xs">
              <div
                className={cn(
                  "w-1.5 h-1.5 rounded-full shrink-0",
                  job.state.lastStatus === "ok" ? "bg-emerald-500" : "bg-red-500"
                )}
              />
              <span className="text-foreground truncate flex-1">{job.name}</span>
              <span className="text-xs text-muted-foreground font-mono shrink-0">
                {job.state.lastDurationMs > 0
                  ? `${(job.state.lastDurationMs / 1000).toFixed(1)}s`
                  : "-"}
              </span>
            </div>
          ))}
        </div>
      </Cell>

      <Cell title="Cost Trend">
        <div className="p-2.5 flex items-end gap-px h-full">
          {(costData?.byDay ?? []).slice(-14).map((day) => {
            const max = Math.max(...(costData?.byDay ?? []).slice(-14).map((d) => d.cost), 0.01);
            const pct = (day.cost / max) * 100;
            return (
              <div
                key={day.date}
                className="flex-1 h-full group relative flex items-end"
              >
                <div
                  className="rounded-t-sm bg-violet-500/40 group-hover:bg-violet-500/70 transition-colors w-full"
                  style={{ height: `${Math.max(pct, 3)}%` }}
                />
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 mb-1 px-1.5 py-0.5 rounded bg-popover border border-border text-xs font-mono text-foreground whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                  ${day.cost.toFixed(2)}
                  <span className="text-muted-foreground ml-1">{day.date.slice(5)}</span>
                </div>
              </div>
            );
          })}
        </div>
      </Cell>
    </div>
  );
}
