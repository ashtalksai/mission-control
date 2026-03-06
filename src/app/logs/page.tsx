"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { usePolling } from "@/hooks/use-polling";
import { POLLING_INTERVALS } from "@/lib/constants-client";
import { cn } from "@/lib/utils";
import type { LogEntry, CronRun } from "@/lib/types";

type LogsResponse = { gatewayLogs: LogEntry[]; cronRuns: CronRun[] };
type UnifiedEntry =
  | { type: "cron"; data: CronRun; sortKey: number }
  | { type: "gateway"; data: LogEntry; sortKey: number };

function formatTs(ts: string | number): string {
  const d = typeof ts === "number" ? new Date(ts) : new Date(ts);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleString("en-GB", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
}

export default function LogsPage() {
  const [source, setSource] = useState<"all" | "cron" | "gateway">("all");
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  const { data } = usePolling<LogsResponse>(`/api/logs?source=${source === "all" ? "" : source}`, POLLING_INTERVALS.logs);

  const entries: UnifiedEntry[] = [];
  if (data) {
    if (source !== "gateway") {
      for (const run of data.cronRuns) entries.push({ type: "cron", data: run, sortKey: run.ts });
    }
    if (source !== "cron") {
      for (const log of data.gatewayLogs) {
        const ts = log.timestamp ? new Date(log.timestamp).getTime() : 0;
        if (ts > 0) entries.push({ type: "gateway", data: log, sortKey: ts });
      }
    }
  }
  entries.sort((a, b) => b.sortKey - a.sortKey);

  const filtered = search
    ? entries.filter((e) => {
        const text = e.type === "cron" ? `${e.data.jobName} ${e.data.summary}` : e.data.message;
        return text.toLowerCase().includes(search.toLowerCase());
      })
    : entries;

  return (
    <div className="p-3 lg:h-full lg:grid lg:grid-rows-[auto_1fr] gap-3 space-y-3 lg:space-y-0">
      {/* Filter bar */}
      <Card className="py-0">
        <CardContent className="px-4 py-2.5 flex items-center gap-4 flex-wrap">
          <span className="text-sm font-medium text-foreground">Logs</span>
          <span className="text-xs text-muted-foreground">{filtered.length} entries</span>
          <div className="flex gap-1 ml-2">
            {(["all", "cron", "gateway"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setSource(s)}
                className={cn(
                  "text-xs px-2 py-1 rounded-md transition-colors",
                  source === s ? "bg-accent text-accent-foreground font-medium" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {s === "all" ? "All" : s === "cron" ? "Cron" : "Gateway"}
              </button>
            ))}
          </div>
          <input
            type="text"
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="ml-auto h-7 w-48 rounded-md border border-border bg-muted/50 px-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </CardContent>
      </Card>

      {/* Log list */}
      <Card className="overflow-hidden flex flex-col py-0">
        {/* Sticky column headers — hidden on mobile */}
        <div className="hidden md:flex bg-card border-b border-border/60 px-3 py-1.5 items-center gap-3 text-xs uppercase tracking-wider text-muted-foreground font-medium shrink-0">
          <span className="w-28 shrink-0">Time</span>
          <span className="w-14 shrink-0">Source</span>
          <span className="w-12 shrink-0">Status</span>
          <span className="flex-1">Message</span>
          <span className="w-14 shrink-0 text-right">Dur.</span>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin divide-y divide-border/20">
          {filtered.slice(0, 300).map((entry, i) => {
            const key = `${entry.type}-${i}`;
            const isExp = expanded === key;

            if (entry.type === "cron") {
              const run = entry.data;
              const isOk = run.status === "ok";
              return (
                <button key={key} onClick={() => setExpanded(isExp ? null : key)} className="w-full text-left px-3 py-1.5 hover:bg-muted/50 flex flex-col md:flex-row md:items-start gap-1 md:gap-3">
                  <span className="w-28 shrink-0 text-xs text-muted-foreground font-mono tabular-nums">{formatTs(run.ts)}</span>
                  <span className="w-14 shrink-0"><Badge variant="outline" className="text-xs px-1 py-0 h-3 border-blue-500/20 text-blue-600 dark:text-blue-400">cron</Badge></span>
                  <span className="w-12 shrink-0 flex items-center gap-1">
                    <div className={cn("w-1.5 h-1.5 rounded-full", isOk ? "bg-emerald-500" : "bg-red-500")} />
                    <span className={cn("text-xs", isOk ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400")}>{run.status}</span>
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="text-sm text-foreground">{run.jobName}</span>
                    {isExp && run.summary && <p className="text-xs text-muted-foreground mt-0.5 whitespace-pre-wrap">{run.summary}</p>}
                  </span>
                  <span className="w-14 shrink-0 text-right text-xs text-muted-foreground font-mono">{run.durationMs > 0 ? `${(run.durationMs / 1000).toFixed(1)}s` : "-"}</span>
                </button>
              );
            } else {
              const log = entry.data;
              return (
                <button key={key} onClick={() => setExpanded(isExp ? null : key)} className="w-full text-left px-3 py-1.5 hover:bg-muted/50 flex flex-col md:flex-row md:items-start gap-1 md:gap-3">
                  <span className="w-28 shrink-0 text-xs text-muted-foreground font-mono tabular-nums">{formatTs(log.timestamp)}</span>
                  <span className="w-14 shrink-0">
                    <Badge variant="outline" className={cn("text-xs px-1 py-0 h-3", log.level === "error" ? "border-red-500/20 text-red-600 dark:text-red-400" : log.level === "warn" ? "border-amber-500/20 text-amber-600 dark:text-amber-400" : "border-border text-muted-foreground")}>
                      {log.source}
                    </Badge>
                  </span>
                  <span className="w-12 shrink-0 flex items-center gap-1">
                    <div className={cn("w-1.5 h-1.5 rounded-full", log.level === "error" ? "bg-red-500" : log.level === "warn" ? "bg-amber-500" : "bg-muted-foreground/50")} />
                    <span className="text-xs text-muted-foreground">{log.level}</span>
                  </span>
                  <span className="flex-1 min-w-0">
                    {isExp ? (
                      <p className="text-sm text-foreground whitespace-pre-wrap">{log.message}</p>
                    ) : (
                      <p className="text-sm text-foreground truncate">{log.message.split("\n")[0]}</p>
                    )}
                  </span>
                  <span className="w-14 shrink-0" />
                </button>
              );
            }
          })}
          {filtered.length === 0 && data && (
            <p className="text-xs text-muted-foreground text-center py-8">No entries</p>
          )}
          {!data && (
            <p className="text-xs text-muted-foreground text-center py-8">Loading...</p>
          )}
        </div>
      </Card>
    </div>
  );
}
