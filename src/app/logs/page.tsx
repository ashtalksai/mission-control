"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { usePolling } from "@/hooks/use-polling";
import { POLLING_INTERVALS } from "@/lib/constants-client";
import { cn } from "@/lib/utils";
import type { LogEntry, CronRun } from "@/lib/types";

type LogsResponse = {
  gatewayLogs: LogEntry[];
  cronRuns: CronRun[];
};

type UnifiedEntry =
  | { type: "cron"; data: CronRun; sortKey: number }
  | { type: "gateway"; data: LogEntry; sortKey: number };

function formatTimestamp(ts: string | number): string {
  if (!ts) return "";
  const d = typeof ts === "number" ? new Date(ts) : new Date(ts);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleString("en-GB", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

function timeAgo(ts: string | number): string {
  if (!ts) return "";
  const d = typeof ts === "number" ? new Date(ts) : new Date(ts);
  if (isNaN(d.getTime())) return "";
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function LogsPage() {
  const [source, setSource] = useState<"all" | "cron" | "gateway">("all");
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  const { data } = usePolling<LogsResponse>(
    `/api/logs?source=${source === "all" ? "" : source}`,
    POLLING_INTERVALS.logs
  );

  const entries: UnifiedEntry[] = [];
  if (data) {
    if (source !== "gateway") {
      for (const run of data.cronRuns) {
        entries.push({ type: "cron", data: run, sortKey: run.ts });
      }
    }
    if (source !== "cron") {
      for (const log of data.gatewayLogs) {
        const ts = log.timestamp ? new Date(log.timestamp).getTime() : 0;
        if (ts > 0) {
          entries.push({ type: "gateway", data: log, sortKey: ts });
        }
      }
    }
  }

  entries.sort((a, b) => b.sortKey - a.sortKey);

  const filtered = search
    ? entries.filter((e) => {
        const text =
          e.type === "cron"
            ? `${e.data.jobName} ${e.data.summary}`
            : e.data.message;
        return text.toLowerCase().includes(search.toLowerCase());
      })
    : entries;

  return (
    <div className="flex flex-col h-full">
      <div className="h-12 border-b border-border bg-card flex items-center px-4 justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-sm font-semibold text-foreground">Activity Log</h1>
          <span className="text-xs text-muted-foreground">{filtered.length} entries</span>
          <div className="flex gap-1 ml-2">
            {(["all", "cron", "gateway"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setSource(s)}
                className={cn(
                  "text-[10px] px-2 py-1 rounded-md transition-colors",
                  source === s
                    ? "bg-accent text-accent-foreground font-medium"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {s === "all" ? "All" : s === "cron" ? "Cron" : "Gateway"}
              </button>
            ))}
          </div>
        </div>
        <input
          type="text"
          placeholder="Search logs..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-7 w-48 rounded-md border border-border bg-muted/50 px-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        />
      </div>
      <div className="flex-1 overflow-auto">
        {/* Table header */}
        <div className="sticky top-0 bg-card border-b border-border px-4 py-1.5 flex items-center gap-3 text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
          <span className="w-28 shrink-0">Time</span>
          <span className="w-16 shrink-0">Source</span>
          <span className="w-14 shrink-0">Status</span>
          <span className="flex-1">Message</span>
          <span className="w-16 shrink-0 text-right">Duration</span>
        </div>

        <div className="divide-y divide-border/50">
          {filtered.slice(0, 300).map((entry, i) => {
            const key = `${entry.type}-${i}`;
            const isExpanded = expanded === key;

            if (entry.type === "cron") {
              const run = entry.data;
              const isOk = run.status === "ok";
              return (
                <button
                  key={key}
                  onClick={() => setExpanded(isExpanded ? null : key)}
                  className="w-full text-left px-4 py-2 hover:bg-muted/30 transition-colors flex items-start gap-3"
                >
                  <span className="w-28 shrink-0 text-[11px] text-muted-foreground font-mono tabular-nums">
                    {formatTimestamp(run.ts)}
                  </span>
                  <span className="w-16 shrink-0">
                    <Badge variant="outline" className="text-[9px] px-1 py-0 h-3.5 border-blue-500/30 text-blue-400">
                      cron
                    </Badge>
                  </span>
                  <span className="w-14 shrink-0">
                    <div className="flex items-center gap-1.5">
                      <div className={cn("w-1.5 h-1.5 rounded-full", isOk ? "bg-emerald-500" : "bg-red-500")} />
                      <span className={cn("text-[10px]", isOk ? "text-emerald-400" : "text-red-400")}>
                        {run.status}
                      </span>
                    </div>
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="text-xs font-medium text-foreground">{run.jobName}</span>
                    {isExpanded && run.summary && (
                      <p className="text-[11px] text-muted-foreground mt-1 whitespace-pre-wrap leading-relaxed">
                        {run.summary}
                      </p>
                    )}
                  </span>
                  <span className="w-16 shrink-0 text-right text-[11px] text-muted-foreground font-mono tabular-nums">
                    {run.durationMs > 0 ? `${(run.durationMs / 1000).toFixed(1)}s` : "-"}
                  </span>
                </button>
              );
            } else {
              const log = entry.data;
              const hasMultiline = log.message.includes("\n");
              return (
                <button
                  key={key}
                  onClick={() => hasMultiline && setExpanded(isExpanded ? null : key)}
                  className={cn(
                    "w-full text-left px-4 py-2 hover:bg-muted/30 transition-colors flex items-start gap-3",
                    !hasMultiline && "cursor-default"
                  )}
                >
                  <span className="w-28 shrink-0 text-[11px] text-muted-foreground font-mono tabular-nums">
                    {formatTimestamp(log.timestamp)}
                  </span>
                  <span className="w-16 shrink-0">
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[9px] px-1 py-0 h-3.5",
                        log.level === "error"
                          ? "border-red-500/30 text-red-400"
                          : log.level === "warn"
                          ? "border-amber-500/30 text-amber-400"
                          : "border-zinc-500/30 text-zinc-400"
                      )}
                    >
                      {log.source}
                    </Badge>
                  </span>
                  <span className="w-14 shrink-0">
                    <div className="flex items-center gap-1.5">
                      <div
                        className={cn(
                          "w-1.5 h-1.5 rounded-full",
                          log.level === "error" ? "bg-red-500" :
                          log.level === "warn" ? "bg-amber-500" : "bg-zinc-500"
                        )}
                      />
                      <span className="text-[10px] text-muted-foreground">{log.level}</span>
                    </div>
                  </span>
                  <span className="flex-1 min-w-0">
                    {isExpanded ? (
                      <p className="text-xs text-foreground whitespace-pre-wrap leading-relaxed">
                        {log.message}
                      </p>
                    ) : (
                      <p className="text-xs text-foreground truncate">{log.message.split("\n")[0]}</p>
                    )}
                  </span>
                  <span className="w-16 shrink-0 text-right text-[11px] text-muted-foreground font-mono">
                    {log.timestamp ? timeAgo(log.timestamp) : ""}
                  </span>
                </button>
              );
            }
          })}
          {filtered.length === 0 && data && (
            <div className="flex items-center justify-center h-32">
              <p className="text-sm text-muted-foreground">No log entries found.</p>
            </div>
          )}
          {!data && (
            <div className="flex items-center justify-center h-32">
              <p className="text-sm text-muted-foreground">Loading logs...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
