"use client";

import { useState, useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { CostEntry } from "@/lib/types";

type SortKey = "timestamp" | "agent" | "model" | "cost";

export function CostTable({ entries }: { entries: CostEntry[] }) {
  const [sortKey, setSortKey] = useState<SortKey>("timestamp");
  const [sortAsc, setSortAsc] = useState(false);

  const sorted = useMemo(() => {
    return [...entries].sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortAsc ? aVal - bVal : bVal - aVal;
      }
      return sortAsc
        ? String(aVal).localeCompare(String(bVal))
        : String(bVal).localeCompare(String(aVal));
    });
  }, [entries, sortKey, sortAsc]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else {
      setSortKey(key);
      setSortAsc(false);
    }
  };

  const arrow = (key: SortKey) =>
    sortKey === key ? (sortAsc ? " ↑" : " ↓") : "";

  return (
    <div className="rounded-md border border-border overflow-auto max-h-96">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="cursor-pointer select-none text-xs" onClick={() => toggleSort("timestamp")}>
              Time{arrow("timestamp")}
            </TableHead>
            <TableHead className="cursor-pointer select-none text-xs" onClick={() => toggleSort("agent")}>
              Agent{arrow("agent")}
            </TableHead>
            <TableHead className="cursor-pointer select-none text-xs" onClick={() => toggleSort("model")}>
              Model{arrow("model")}
            </TableHead>
            <TableHead className="cursor-pointer select-none text-xs text-right" onClick={() => toggleSort("cost")}>
              Cost{arrow("cost")}
            </TableHead>
            <TableHead className="text-xs text-right">Tokens</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.slice(0, 100).map((entry, i) => (
            <TableRow key={i}>
              <TableCell className="text-xs font-mono text-muted-foreground whitespace-nowrap">
                {new Date(entry.timestamp).toLocaleString("en-US", {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: false,
                })}
              </TableCell>
              <TableCell className="text-xs">@{entry.agent}</TableCell>
              <TableCell>
                <Badge variant="outline" className="text-[10px] h-4 px-1.5 py-0">
                  {entry.model}
                </Badge>
              </TableCell>
              <TableCell className="text-xs font-mono text-right tabular-nums">
                ${entry.cost.toFixed(4)}
              </TableCell>
              <TableCell className="text-xs font-mono text-right text-muted-foreground tabular-nums">
                {(entry.inputTokens + entry.outputTokens).toLocaleString()}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
