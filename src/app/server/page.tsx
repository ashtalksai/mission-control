"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { usePolling } from "@/hooks/use-polling";
import { POLLING_INTERVALS } from "@/lib/constants-client";
import { cn } from "@/lib/utils";
import type { ServerHealth, RateLimitResponse } from "@/lib/types";

function UsageRing({ percent, label, detail, size = 80 }: { percent: number; label: string; detail: string; size?: number }) {
  const color = percent > 80 ? "text-red-500" : percent > 60 ? "text-amber-500" : "text-emerald-500";
  const stroke = percent > 80 ? "stroke-red-500" : percent > 60 ? "stroke-amber-500" : "stroke-emerald-500";
  const r = (size - 8) / 2;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (percent / 100) * circumference;

  return (
    <div className="flex items-center gap-3">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeWidth={4} className="text-muted/40" />
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={4} strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset} className={cn("transition-all duration-500", stroke)} />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={cn("text-sm font-bold", color)}>{percent}%</span>
        </div>
      </div>
      <div>
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="text-[10px] text-muted-foreground">{detail}</p>
      </div>
    </div>
  );
}

export default function ServerPage() {
  const { data: server } = usePolling<ServerHealth>("/api/server", POLLING_INTERVALS.server);
  const { data: rateData } = usePolling<RateLimitResponse>("/api/ratelimits", POLLING_INTERVALS.ratelimits);

  const hasError = server && "error" in server;
  const maxCount = Math.max(...(rateData?.hourlyTrend.map((h) => h.count) ?? []), 1);
  const last24 = rateData?.hourlyTrend.slice(-24) ?? [];

  return (
    <div className="flex flex-col h-full">
      <div className="h-12 border-b border-border bg-card flex items-center px-4 gap-3">
        <h1 className="text-sm font-semibold text-foreground">Server</h1>
        {server?.uptime && <span className="text-xs text-muted-foreground">{server.uptime}</span>}
        {server?.containers && (
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 border bg-emerald-500/15 text-emerald-400 border-emerald-500/20 ml-auto">
            {server.containers.running} containers running
          </Badge>
        )}
      </div>
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {hasError && (
          <div className="rounded-lg bg-red-500/5 border border-red-500/20 px-4 py-2">
            <span className="text-xs text-red-400">SSH connection failed — data may be stale</span>
          </div>
        )}

        {/* Top row: Resources + Rate Limits */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Disk & Memory side by side in one card */}
          <Card>
            <CardContent className="p-4 space-y-4">
              <UsageRing
                percent={server?.disk.usagePercent ?? 0}
                label="Disk"
                detail={server ? `${server.disk.used} / ${server.disk.total}` : "..."}
              />
              <UsageRing
                percent={server?.memory.usagePercent ?? 0}
                label="Memory"
                detail={server ? `${server.memory.used}MB / ${server.memory.total}MB` : "..."}
              />
            </CardContent>
          </Card>

          {/* Rate Limit Sparkline */}
          <Card className="md:col-span-2">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-foreground">Rate Limits (24h)</span>
                <div className="flex gap-3 text-xs text-muted-foreground">
                  <span>Today: <span className="text-amber-400 font-medium">{rateData?.todayRateLimits ?? 0}</span></span>
                  <span>48h: <span className="text-foreground font-medium">{rateData?.totalRateLimits ?? 0}</span></span>
                </div>
              </div>
              <div className="flex items-end gap-px h-16">
                {last24.map((h) => {
                  const height = (h.count / maxCount) * 100;
                  return (
                    <div key={h.hour} className="flex-1 group relative" title={`${h.hour.slice(-5).replace("T", " ")}:00 — ${h.count}`}>
                      <div
                        className={cn("rounded-t-sm w-full transition-all", h.count > 0 ? "bg-amber-500/50 group-hover:bg-amber-400" : "bg-muted/20")}
                        style={{ height: `${Math.max(height, 2)}%` }}
                      />
                    </div>
                  );
                })}
              </div>
              {last24.length > 0 && (
                <div className="flex justify-between mt-1 text-[9px] text-muted-foreground">
                  <span>{last24[0].hour.slice(-5).replace("T", " ")}:00</span>
                  <span>{last24[last24.length - 1].hour.slice(-5).replace("T", " ")}:00</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Error breakdown + containers in compact rows */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Error Breakdown */}
          {rateData && rateData.errorBreakdown.length > 0 && (
            <Card>
              <CardContent className="p-4">
                <h3 className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2 font-medium">
                  Error Breakdown (48h)
                </h3>
                <div className="space-y-1.5">
                  {rateData.errorBreakdown.map((err) => {
                    const total = rateData.errorBreakdown.reduce((s, e) => s + e.count, 0);
                    const pct = total > 0 ? (err.count / total) * 100 : 0;
                    return (
                      <div key={err.type} className="flex items-center gap-2">
                        <span className="text-[10px] text-muted-foreground w-20 shrink-0 truncate">{err.type.replace("_", " ")}</span>
                        <div className="flex-1 h-1.5 bg-muted/30 rounded-full overflow-hidden">
                          <div className="h-full bg-amber-500/60 rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-[10px] font-mono text-muted-foreground w-8 text-right">{err.count}</span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Containers — compact table */}
          {server?.containers.list && server.containers.list.length > 0 && (
            <Card>
              <CardContent className="p-4">
                <h3 className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2 font-medium">
                  Containers ({server.containers.running})
                </h3>
                <div className="space-y-1">
                  {server.containers.list.map((c) => {
                    const isUp = c.status.toLowerCase().includes("up");
                    return (
                      <div key={c.name} className="flex items-center gap-2 py-1 text-xs">
                        <div className={cn("w-1.5 h-1.5 rounded-full shrink-0", isUp ? "bg-emerald-500" : "bg-red-500")} />
                        <span className="text-foreground truncate flex-1 font-medium">{c.name}</span>
                        <span className="text-muted-foreground text-[10px] shrink-0">{c.uptime}</span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Recent errors — compact */}
        {rateData && rateData.recentErrors.length > 0 && (
          <Card>
            <CardContent className="p-4">
              <h3 className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2 font-medium">
                Recent Errors
              </h3>
              <div className="space-y-1">
                {rateData.recentErrors.slice(-8).reverse().map((err, i) => (
                  <div key={i} className="flex items-center gap-2 py-1">
                    <Badge variant="outline" className="text-[9px] px-1 py-0 h-3.5 border shrink-0 bg-red-500/10 text-red-400 border-red-500/20">
                      {err.type}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground truncate">{err.message}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
