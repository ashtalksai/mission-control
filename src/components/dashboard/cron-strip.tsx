"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { CronJob } from "@/lib/types";
import cronstrue from "cronstrue";

function formatCountdown(ms: number): string {
  if (ms < 0) return "overdue";
  const mins = Math.floor(ms / 60000);
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  const remMins = mins % 60;
  if (hours < 24) return `${hours}h ${remMins}m`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

function formatDuration(ms: number): string {
  const secs = Math.round(ms / 1000);
  if (secs < 60) return `${secs}s`;
  const mins = Math.floor(secs / 60);
  const remSecs = secs % 60;
  return `${mins}m ${remSecs}s`;
}

function cronDescription(expr: string): string {
  try {
    return cronstrue.toString(expr, { use24HourTimeFormat: true });
  } catch {
    return expr;
  }
}

export function CronStrip({ upcoming, recent }: { upcoming: CronJob[]; recent: CronJob[] }) {
  const now = Date.now();

  return (
    <div className="flex flex-col lg:flex-row gap-4">
      <div className="flex-1 min-w-0">
        <h3 className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2 font-medium">
          Upcoming
        </h3>
        <div className="space-y-1.5">
          {upcoming.map((job) => (
            <div key={job.id} className="flex items-center gap-2 text-sm">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
              <span className="text-foreground font-medium truncate flex-1">{job.name}</span>
              <span className="text-[11px] text-muted-foreground shrink-0" title={cronDescription(job.schedule.expr)}>
                in {formatCountdown(job.state.nextRunAtMs - now)}
              </span>
            </div>
          ))}
          {upcoming.length === 0 && (
            <p className="text-xs text-muted-foreground">No upcoming jobs</p>
          )}
        </div>
      </div>

      <div className="w-px bg-border hidden lg:block" />

      <div className="flex-1 min-w-0">
        <h3 className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2 font-medium">
          Recent
        </h3>
        <div className="space-y-1.5">
          {recent.map((job) => (
            <div key={job.id} className="flex items-center gap-2 text-sm">
              <div
                className={cn(
                  "w-1.5 h-1.5 rounded-full shrink-0",
                  job.state.lastStatus === "ok" ? "bg-emerald-500" : "bg-red-500"
                )}
              />
              <span className="text-foreground font-medium truncate flex-1">{job.name}</span>
              <Badge variant="outline" className="text-[10px] h-4 px-1.5 py-0 text-muted-foreground">
                {formatDuration(job.state.lastDurationMs)}
              </Badge>
            </div>
          ))}
          {recent.length === 0 && (
            <p className="text-xs text-muted-foreground">No recent runs</p>
          )}
        </div>
      </div>
    </div>
  );
}
