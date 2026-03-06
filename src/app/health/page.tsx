"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { usePolling } from "@/hooks/use-polling";
import { POLLING_INTERVALS } from "@/lib/constants-client";
import { cn } from "@/lib/utils";
import type { HealthCheck, ServerHealth, RateLimitResponse } from "@/lib/types";

const STATUS_DOT: Record<string, string> = {
  healthy: "bg-emerald-500 shadow-[0_0_4px_rgba(16,185,129,0.5)]",
  warning: "bg-amber-500 shadow-[0_0_4px_rgba(245,158,11,0.5)]",
  critical: "bg-red-500 shadow-[0_0_4px_rgba(239,68,68,0.5)]",
  unknown: "bg-zinc-500",
};

const STATUS_TEXT: Record<string, string> = {
  healthy: "text-emerald-600 dark:text-emerald-400",
  warning: "text-amber-600 dark:text-amber-400",
  critical: "text-red-600 dark:text-red-400",
  unknown: "text-zinc-600 dark:text-zinc-400",
};

const CATEGORY_LABELS: Record<string, string> = {
  agent: "Agent Systems",
  cron: "Scheduled Jobs",
  infrastructure: "Infrastructure",
  data: "Data Integrity",
};

function UsageRing({ percent, label, detail, size = 56 }: { percent: number; label: string; detail: string; size?: number }) {
  const color = percent > 80 ? "stroke-red-600 dark:stroke-red-500" : percent > 60 ? "stroke-amber-600 dark:stroke-amber-500" : "stroke-emerald-600 dark:stroke-emerald-500";
  const textColor = percent > 80 ? "text-red-600 dark:text-red-400" : percent > 60 ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400";
  const r = (size - 6) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (percent / 100) * circ;
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeWidth={3} className="text-muted" />
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={3} strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset} className={cn("transition-all duration-500", color)} />
        </svg>
        <span className={cn("absolute inset-0 flex items-center justify-center text-sm font-mono font-bold", textColor)}>{percent}%</span>
      </div>
      <div className="text-center">
        <p className="text-xs font-medium text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground">{detail}</p>
      </div>
    </div>
  );
}

export default function HealthPage() {
  const { data: server } = usePolling<ServerHealth>("/api/server", POLLING_INTERVALS.serverHealth);
  const { data: rateData } = usePolling<RateLimitResponse>("/api/ratelimits", POLLING_INTERVALS.ratelimits);
  const { data: checks } = usePolling<HealthCheck[]>("/api/health", POLLING_INTERVALS.health);

  const hasError = server && "error" in server;
  const last24 = rateData?.hourlyTrend.slice(-24) ?? [];
  const maxRL = Math.max(...last24.map((h) => h.count), 1);

  const allHealthy = checks?.every((c) => c.status === "healthy");
  const critCount = checks?.filter((c) => c.status === "critical").length ?? 0;
  const warnCount = checks?.filter((c) => c.status === "warning").length ?? 0;

  const grouped = new Map<string, HealthCheck[]>();
  for (const check of checks ?? []) {
    const arr = grouped.get(check.category) ?? [];
    arr.push(check);
    grouped.set(check.category, arr);
  }

  return (
    <div className="p-3 lg:h-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 lg:grid-rows-[auto_auto_1fr_1fr] gap-3">
      {/* Row 1: Status bar */}
      <Card className="col-span-1 md:col-span-2 lg:col-span-4 flex-row items-center gap-4 rounded-lg py-0 px-4 h-auto">
        <CardContent className="flex items-center gap-4 px-0 py-2.5 w-full">
          <div className="flex items-center gap-2">
            <div className={cn("w-2.5 h-2.5 rounded-full", allHealthy ? STATUS_DOT.healthy : critCount > 0 ? STATUS_DOT.critical : STATUS_DOT.warning)} />
            <span className={cn("text-sm font-semibold", allHealthy ? "text-emerald-600 dark:text-emerald-400" : critCount > 0 ? "text-red-600 dark:text-red-400" : "text-amber-600 dark:text-amber-400")}>
              {allHealthy ? "All Systems Operational" : critCount > 0 ? `${critCount} Critical` : `${warnCount} Warning${warnCount !== 1 ? "s" : ""}`}
            </span>
            <span className="text-xs text-muted-foreground">{checks?.length ?? 0} checks</span>
          </div>
          {hasError && <span className="text-xs text-red-600 dark:text-red-400">SSH failed</span>}
          <div className="ml-auto flex items-center gap-4">
            {server?.uptime && <span className="text-xs text-muted-foreground">{server.uptime}</span>}
            <Badge variant="outline" className="text-xs px-1.5 py-0 h-4 border-emerald-500/20 text-emerald-600 dark:text-emerald-400">
              {server?.containers.running ?? 0} containers
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Row 2: Resource rings + Health check groups */}
      <Card className="col-span-1 rounded-lg py-0 overflow-hidden">
        <CardContent className="px-4 py-4 flex items-center justify-around gap-4">
          <UsageRing
            percent={server?.cpu?.usagePercent ?? 0}
            label="CPU"
            detail={server?.cpu ? `${server.cpu.cores} cores` : "..."}
          />
          <UsageRing
            percent={server?.memory.usagePercent ?? 0}
            label="Memory"
            detail={server ? `${server.memory.used}MB / ${server.memory.total}MB` : "..."}
          />
          <UsageRing
            percent={server?.disk.usagePercent ?? 0}
            label="Disk"
            detail={server ? `${server.disk.used} / ${server.disk.total}` : "..."}
          />
        </CardContent>
      </Card>

      {Array.from(grouped.entries()).slice(0, 3).map(([category, categoryChecks]) => (
        <Card key={category} className="col-span-1 rounded-lg py-0 overflow-hidden">
          <CardHeader className="px-3 py-1.5 border-b border-border/60 gap-0">
            <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
              {CATEGORY_LABELS[category] ?? category}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 min-h-0 overflow-y-auto scrollbar-thin p-1.5 space-y-0.5">
            {categoryChecks.map((check) => (
              <div key={check.name} className="flex items-center gap-2 px-2 py-1 rounded-md hover:bg-muted/20 transition-colors">
                <div className={cn("w-1.5 h-1.5 rounded-full shrink-0", STATUS_DOT[check.status])} />
                <div className="flex-1 min-w-0">
                  <span className="text-xs text-foreground">{check.name}</span>
                  <p className="text-xs text-muted-foreground truncate">{check.message}</p>
                </div>
                <span className={cn("text-xs font-mono shrink-0", STATUS_TEXT[check.status])}>
                  {check.status}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}

      {/* Row 3: Rate limits (2 cols) + Error breakdown + Recent errors */}
      <Card className="col-span-1 md:col-span-2 lg:col-span-2 rounded-lg py-0 overflow-hidden">
        <CardHeader className="px-3 py-1.5 border-b border-border/60 gap-0 flex-row items-center justify-between">
          <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Rate Limits (24h)</CardTitle>
          <div className="flex gap-3 text-xs text-muted-foreground">
            <span>Today: <span className="text-amber-600 dark:text-amber-400 font-mono">{rateData?.todayRateLimits ?? 0}</span></span>
            <span>Total: <span className="text-foreground font-mono">{rateData?.totalRateLimits ?? 0}</span></span>
          </div>
        </CardHeader>
        <CardContent className="flex-1 min-h-0 flex items-end gap-px p-3">
          {last24.map((h) => {
            const pct = (h.count / maxRL) * 100;
            return (
              <div key={h.hour} className="flex-1 h-full flex items-end group" title={`${h.hour.slice(-5).replace("T", " ")}:00 — ${h.count}`}>
                <div
                  className={cn("rounded-t-sm w-full transition-colors", h.count > 0 ? "bg-amber-500/50 dark:bg-amber-500/40 group-hover:bg-amber-400" : "bg-muted/15")}
                  style={{ height: `${Math.max(pct, 3)}%` }}
                />
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card className="col-span-1 rounded-lg py-0 overflow-hidden">
        <CardHeader className="px-3 py-1.5 border-b border-border/60 gap-0">
          <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Errors by Type</CardTitle>
        </CardHeader>
        <CardContent className="flex-1 min-h-0 overflow-y-auto scrollbar-thin p-2 space-y-1.5">
          {(rateData?.errorBreakdown ?? []).map((err) => {
            const total = (rateData?.errorBreakdown ?? []).reduce((s, e) => s + e.count, 0);
            const pct = total > 0 ? (err.count / total) * 100 : 0;
            return (
              <div key={err.type} className="flex items-center gap-2 px-1">
                <span className="text-xs text-muted-foreground w-16 shrink-0 truncate">{err.type.replace("_", " ")}</span>
                <div className="flex-1 h-1.5 bg-muted/20 rounded-full overflow-hidden">
                  <div className="h-full bg-amber-500/50 rounded-full" style={{ width: `${pct}%` }} />
                </div>
                <span className="text-xs font-mono text-muted-foreground w-8 text-right">{err.count}</span>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card className="col-span-1 rounded-lg py-0 overflow-hidden">
        <CardHeader className="px-3 py-1.5 border-b border-border/60 gap-0">
          <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Recent Errors</CardTitle>
        </CardHeader>
        <CardContent className="flex-1 min-h-0 overflow-y-auto scrollbar-thin p-2 space-y-1">
          {(rateData?.recentErrors ?? []).slice(-10).reverse().map((err, i) => (
            <div key={i} className="flex items-start gap-1.5 px-1 py-1">
              <Badge variant="outline" className="text-xs px-1 py-0 h-3 shrink-0 mt-0.5 border-red-500/20 text-red-600 dark:text-red-400">
                {err.type}
              </Badge>
              <span className="text-xs text-muted-foreground leading-tight line-clamp-2">{err.message}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Row 4: Containers (3 cols) + remaining health group (1 col) */}
      <Card className="col-span-1 md:col-span-2 lg:col-span-3 rounded-lg py-0 overflow-hidden">
        <CardHeader className="px-3 py-1.5 border-b border-border/60 gap-0 flex-row items-center justify-between">
          <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
            Containers ({server?.containers.running ?? 0})
          </CardTitle>
          {server?.cpu?.loadAvg && (
            <span className="text-xs text-muted-foreground">Load: <span className="font-mono text-foreground">{server.cpu.loadAvg}</span></span>
          )}
        </CardHeader>
        <CardContent className="flex-1 min-h-0 overflow-y-auto scrollbar-thin px-0">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-border/20">
            {(server?.containers.list ?? []).map((c) => {
              const isUp = c.status.toLowerCase().includes("up");
              return (
                <div key={c.name} className="bg-card px-3 py-1.5 flex items-center gap-2">
                  <div className={cn("w-1.5 h-1.5 rounded-full shrink-0", isUp ? "bg-emerald-500" : "bg-red-500")} />
                  <span className="text-xs text-foreground truncate flex-1">{c.name}</span>
                  <span className="text-xs text-muted-foreground font-mono shrink-0">{c.uptime}</span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* 4th health group if exists */}
      {Array.from(grouped.entries()).slice(3).map(([category, categoryChecks]) => (
        <Card key={category} className="col-span-1 rounded-lg py-0 overflow-hidden">
          <CardHeader className="px-3 py-1.5 border-b border-border/60 gap-0">
            <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
              {CATEGORY_LABELS[category] ?? category}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 min-h-0 overflow-y-auto scrollbar-thin p-1.5 space-y-0.5">
            {categoryChecks.map((check) => (
              <div key={check.name} className="flex items-center gap-2 px-2 py-1 rounded-md hover:bg-muted/20 transition-colors">
                <div className={cn("w-1.5 h-1.5 rounded-full shrink-0", STATUS_DOT[check.status])} />
                <div className="flex-1 min-w-0">
                  <span className="text-xs text-foreground">{check.name}</span>
                  <p className="text-xs text-muted-foreground truncate">{check.message}</p>
                </div>
                <span className={cn("text-xs font-mono shrink-0", STATUS_TEXT[check.status])}>
                  {check.status}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
      {/* If no 4th group, fill the space */}
      {Array.from(grouped.entries()).length <= 3 && (
        <Card className="col-span-1 rounded-lg py-0" />
      )}
    </div>
  );
}
