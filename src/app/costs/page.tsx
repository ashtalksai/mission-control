"use client";

import { DailyChart, DonutChart } from "@/components/costs/cost-charts";
import { Badge } from "@/components/ui/badge";
import { usePolling } from "@/hooks/use-polling";
import { POLLING_INTERVALS } from "@/lib/constants-client";
import { cn } from "@/lib/utils";
import type { CostSummary } from "@/lib/types";
import { useState, useMemo } from "react";

type SortKey = "timestamp" | "agent" | "model" | "cost";

export default function CostsPage() {
  const { data } = usePolling<CostSummary>("/api/costs/summary", POLLING_INTERVALS.costs);
  const [sortKey, setSortKey] = useState<SortKey>("timestamp");
  const [sortAsc, setSortAsc] = useState(false);

  const sorted = useMemo(() => {
    if (!data?.entries) return [];
    return [...data.entries].sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      if (typeof aVal === "number" && typeof bVal === "number") return sortAsc ? aVal - bVal : bVal - aVal;
      return sortAsc ? String(aVal).localeCompare(String(bVal)) : String(bVal).localeCompare(String(aVal));
    });
  }, [data?.entries, sortKey, sortAsc]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(false); }
  };
  const arrow = (key: SortKey) => (sortKey === key ? (sortAsc ? " \u2191" : " \u2193") : "");

  return (
    <div className="h-full p-3 grid grid-cols-4 grid-rows-[auto_1fr_1fr] gap-3">
      {/* Row 1: Stat cards */}
      <div className="rounded-lg border border-border bg-card px-4 py-3">
        <span className="text-xs uppercase text-muted-foreground block">Today</span>
        <span className="text-xl font-mono font-bold text-foreground tabular-nums">${(data?.totalToday ?? 0).toFixed(2)}</span>
      </div>
      <div className="rounded-lg border border-border bg-card px-4 py-3">
        <span className="text-xs uppercase text-muted-foreground block">This Week</span>
        <span className="text-xl font-mono font-bold text-foreground tabular-nums">${(data?.totalWeek ?? 0).toFixed(2)}</span>
      </div>
      <div className="rounded-lg border border-border bg-card px-4 py-3">
        <span className="text-xs uppercase text-muted-foreground block">This Month</span>
        <span className="text-xl font-mono font-bold text-foreground tabular-nums">${(data?.totalMonth ?? 0).toFixed(2)}</span>
      </div>
      <div className="rounded-lg border border-border bg-card px-4 py-3">
        <span className="text-xs uppercase text-muted-foreground block">Entries</span>
        <span className="text-xl font-mono font-bold text-foreground tabular-nums">{data?.entries.length ?? 0}</span>
      </div>

      {/* Row 2: Daily chart (3 cols) + By Agent donut (1 col) */}
      <div className="col-span-3 rounded-lg border border-border bg-card overflow-hidden flex flex-col">
        <div className="px-3 py-2 border-b border-border/60 shrink-0">
          <span className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Daily Spend (30d)</span>
        </div>
        <div className="flex-1 min-h-0 p-2">
          <DailyChart data={data?.byDay ?? []} />
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card overflow-hidden flex flex-col">
        <div className="flex-1 min-h-0 p-2">
          <DonutChart title="By Agent" data={(data?.byAgent ?? []).map((a) => ({ name: `@${a.agent}`, value: a.cost }))} />
        </div>
      </div>

      {/* Row 3: Cost log (3 cols) + By Model donut (1 col) */}
      <div className="col-span-3 rounded-lg border border-border bg-card overflow-hidden flex flex-col">
        <div className="px-3 py-2 border-b border-border/60 shrink-0">
          <span className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Cost Log</span>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin">
          {/* Table header */}
          <div className="sticky top-0 bg-card border-b border-border/40 px-3 py-1.5 flex items-center text-xs uppercase tracking-wider text-muted-foreground font-medium">
            <button className="w-28 text-left" onClick={() => toggleSort("timestamp")}>Time{arrow("timestamp")}</button>
            <button className="w-20 text-left" onClick={() => toggleSort("agent")}>Agent{arrow("agent")}</button>
            <button className="w-20 text-left" onClick={() => toggleSort("model")}>Model{arrow("model")}</button>
            <button className="flex-1 text-right" onClick={() => toggleSort("cost")}>Cost{arrow("cost")}</button>
            <span className="w-20 text-right">Tokens</span>
          </div>
          {sorted.slice(0, 200).map((entry, i) => (
            <div key={i} className="px-3 py-1.5 flex items-center text-xs border-b border-border/20 hover:bg-muted/10">
              <span className="w-28 font-mono text-xs text-muted-foreground tabular-nums">
                {new Date(entry.timestamp).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false })}
              </span>
              <span className="w-20 text-foreground">@{entry.agent}</span>
              <span className="w-20">
                <Badge variant="outline" className="text-xs h-3.5 px-1 py-0">{entry.model}</Badge>
              </span>
              <span className="flex-1 text-right font-mono tabular-nums text-foreground">${entry.cost.toFixed(4)}</span>
              <span className="w-20 text-right font-mono text-xs text-muted-foreground tabular-nums">
                {(entry.inputTokens + entry.outputTokens).toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card overflow-hidden flex flex-col">
        <div className="flex-1 min-h-0 p-2">
          <DonutChart title="By Model" data={(data?.byModel ?? []).map((m) => ({ name: m.model, value: m.cost }))} />
        </div>
      </div>
    </div>
  );
}
