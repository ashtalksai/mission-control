"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { usePolling } from "@/hooks/use-polling";
import { POLLING_INTERVALS } from "@/lib/constants-client";
import { cn } from "@/lib/utils";
import type { HealthCheck } from "@/lib/types";

const STATUS_STYLES: Record<string, { dot: string; badge: string }> = {
  healthy: {
    dot: "bg-emerald-500",
    badge: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
  },
  warning: {
    dot: "bg-amber-500",
    badge: "bg-amber-500/15 text-amber-400 border-amber-500/20",
  },
  critical: {
    dot: "bg-red-500",
    badge: "bg-red-500/15 text-red-400 border-red-500/20",
  },
  unknown: {
    dot: "bg-zinc-500",
    badge: "bg-zinc-500/15 text-zinc-400 border-zinc-500/20",
  },
};

const CATEGORY_LABELS: Record<string, string> = {
  agent: "Agent",
  cron: "Cron",
  infrastructure: "Infrastructure",
  data: "Data",
};

export default function HealthPage() {
  const { data: checks } = usePolling<HealthCheck[]>(
    "/api/health",
    POLLING_INTERVALS.health
  );

  const allHealthy = checks?.every((c) => c.status === "healthy");
  const criticalCount = checks?.filter((c) => c.status === "critical").length ?? 0;
  const warningCount = checks?.filter((c) => c.status === "warning").length ?? 0;

  // Group by category
  const grouped = new Map<string, HealthCheck[]>();
  for (const check of checks ?? []) {
    const existing = grouped.get(check.category) ?? [];
    existing.push(check);
    grouped.set(check.category, existing);
  }

  return (
    <div className="flex flex-col h-full">
      <div className="h-12 border-b border-border bg-card flex items-center px-4">
        <h1 className="text-sm font-semibold text-foreground">System Health</h1>
      </div>
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {/* Overall Status Banner */}
        {checks && (
          <div
            className={cn(
              "rounded-lg px-4 py-3 flex items-center gap-3 border",
              allHealthy
                ? "bg-emerald-500/5 border-emerald-500/20"
                : criticalCount > 0
                ? "bg-red-500/5 border-red-500/20"
                : "bg-amber-500/5 border-amber-500/20"
            )}
          >
            <div
              className={cn(
                "w-3 h-3 rounded-full",
                allHealthy
                  ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"
                  : criticalCount > 0
                  ? "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]"
                  : "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]"
              )}
            />
            <div>
              <span
                className={cn(
                  "text-sm font-semibold",
                  allHealthy
                    ? "text-emerald-400"
                    : criticalCount > 0
                    ? "text-red-400"
                    : "text-amber-400"
                )}
              >
                {allHealthy
                  ? "All Systems Operational"
                  : criticalCount > 0
                  ? `${criticalCount} Critical Issue${criticalCount > 1 ? "s" : ""}`
                  : `${warningCount} Warning${warningCount > 1 ? "s" : ""}`}
              </span>
              <p className="text-xs text-muted-foreground">
                {checks.length} checks performed
              </p>
            </div>
          </div>
        )}

        {/* Grouped Health Checks */}
        {Array.from(grouped.entries()).map(([category, categoryChecks]) => (
          <div key={category}>
            <h2 className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2 font-medium">
              {CATEGORY_LABELS[category] ?? category}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {categoryChecks.map((check) => {
                const style = STATUS_STYLES[check.status] ?? STATUS_STYLES.unknown;
                return (
                  <Card key={check.name}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className={cn("w-2 h-2 rounded-full", style.dot)} />
                          <span className="text-sm font-medium text-foreground">
                            {check.name}
                          </span>
                        </div>
                        <Badge
                          variant="outline"
                          className={cn("text-[10px] px-1.5 py-0 h-4 border", style.badge)}
                        >
                          {check.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{check.message}</p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
