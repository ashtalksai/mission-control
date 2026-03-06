"use client";

import { useState } from "react";
import cronstrue from "cronstrue";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { usePolling } from "@/hooks/use-polling";
import { POLLING_INTERVALS } from "@/lib/constants-client";
import { cn } from "@/lib/utils";
import type { CronJob, CronRun } from "@/lib/types";

type CronJobsResponse = {
  jobs: CronJob[];
  runHistory: CronRun[];
};

function humanSchedule(expr: string): string {
  try {
    return cronstrue.toString(expr, { use24HourTimeFormat: true });
  } catch {
    return expr;
  }
}

function timeUntil(ms: number): string {
  const diff = ms - Date.now();
  if (diff < 0) return "overdue";
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ${mins % 60}m`;
  return `${Math.floor(hours / 24)}d`;
}

function timeAgo(ms: number): string {
  if (!ms) return "never";
  const diff = Date.now() - ms;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function CronPage() {
  const [expandedJob, setExpandedJob] = useState<string | null>(null);

  const { data } = usePolling<CronJobsResponse>(
    "/api/cron/jobs",
    POLLING_INTERVALS.cron
  );

  const jobs = data?.jobs ?? [];
  const runHistory = data?.runHistory ?? [];

  // Group run history by jobId
  const runsByJob = new Map<string, CronRun[]>();
  for (const run of runHistory) {
    const existing = runsByJob.get(run.jobId) ?? [];
    existing.push(run);
    runsByJob.set(run.jobId, existing);
  }

  const enabledJobs = jobs.filter((j) => j.enabled);
  const disabledJobs = jobs.filter((j) => !j.enabled);

  return (
    <div className="flex flex-col h-full">
      <div className="h-12 border-b border-border bg-card flex items-center px-4 justify-between">
        <div className="flex items-center gap-2">
          <h1 className="text-sm font-semibold text-foreground">Cron Jobs</h1>
          <span className="text-xs text-muted-foreground">
            {enabledJobs.length} active / {disabledJobs.length} disabled
          </span>
        </div>
      </div>
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {/* Active Jobs */}
        <div>
          <h2 className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2 font-medium">
            Active Jobs ({enabledJobs.length})
          </h2>
          <div className="space-y-2">
            {enabledJobs.map((job) => (
              <CronJobRow
                key={job.id}
                job={job}
                runs={runsByJob.get(job.id) ?? []}
                expanded={expandedJob === job.id}
                onToggle={() =>
                  setExpandedJob(expandedJob === job.id ? null : job.id)
                }
              />
            ))}
          </div>
        </div>

        {/* Disabled Jobs */}
        {disabledJobs.length > 0 && (
          <div>
            <h2 className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2 font-medium">
              Disabled Jobs ({disabledJobs.length})
            </h2>
            <div className="space-y-2">
              {disabledJobs.map((job) => (
                <CronJobRow
                  key={job.id}
                  job={job}
                  runs={runsByJob.get(job.id) ?? []}
                  expanded={expandedJob === job.id}
                  onToggle={() =>
                    setExpandedJob(expandedJob === job.id ? null : job.id)
                  }
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function CronJobRow({
  job,
  runs,
  expanded,
  onToggle,
}: {
  job: CronJob;
  runs: CronRun[];
  expanded: boolean;
  onToggle: () => void;
}) {
  const lastOk =
    job.state.lastRunStatus === "ok" || job.state.lastStatus === "ok";
  const hasErrors = job.state.consecutiveErrors > 0;

  return (
    <Card className={cn(!job.enabled && "opacity-60")}>
      <CardContent className="p-0">
        <button
          onClick={onToggle}
          className="w-full text-left px-4 py-3 flex items-center gap-3"
        >
          <div
            className={cn(
              "w-2 h-2 rounded-full shrink-0",
              !job.enabled
                ? "bg-zinc-600"
                : hasErrors
                ? "bg-red-500"
                : lastOk
                ? "bg-emerald-500"
                : "bg-zinc-500"
            )}
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-foreground truncate">
                {job.name}
              </span>
              <Badge
                variant="outline"
                className={cn(
                  "text-[9px] px-1 py-0 h-3.5",
                  job.enabled
                    ? "border-emerald-500/30 text-emerald-400"
                    : "border-zinc-500/30 text-zinc-400"
                )}
              >
                {job.enabled ? "enabled" : "disabled"}
              </Badge>
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {humanSchedule(job.schedule.expr)}
            </p>
          </div>
          <div className="flex items-center gap-4 text-[10px] text-muted-foreground shrink-0">
            {job.state.lastRunAtMs > 0 && (
              <span>Last: {timeAgo(job.state.lastRunAtMs)}</span>
            )}
            {job.state.lastDurationMs > 0 && (
              <span>{(job.state.lastDurationMs / 1000).toFixed(1)}s</span>
            )}
            {job.enabled && job.state.nextRunAtMs > 0 && (
              <span className="text-blue-400">
                Next: {timeUntil(job.state.nextRunAtMs)}
              </span>
            )}
          </div>
          <svg
            className={cn(
              "w-4 h-4 text-muted-foreground transition-transform shrink-0",
              expanded && "rotate-180"
            )}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {expanded && (
          <div className="px-4 pb-3 border-t border-border pt-3 space-y-3">
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-muted-foreground">Session Target: </span>
                <span className="text-foreground font-mono">{job.sessionTarget}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Wake Mode: </span>
                <span className="text-foreground">{job.wakeMode}</span>
              </div>
            </div>

            {job.payload?.text && (
              <div>
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                  Payload
                </span>
                <pre className="mt-1 text-[11px] text-foreground bg-muted/30 rounded-md p-2 border border-border overflow-x-auto max-h-24">
                  {job.payload.text}
                </pre>
              </div>
            )}

            {runs.length > 0 && (
              <div>
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                  Recent Runs ({runs.length})
                </span>
                <div className="mt-1 space-y-1 max-h-40 overflow-auto">
                  {runs.slice(0, 10).map((run, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 text-[11px] py-0.5"
                    >
                      <div
                        className={cn(
                          "w-1.5 h-1.5 rounded-full",
                          run.status === "ok" ? "bg-emerald-500" : "bg-red-500"
                        )}
                      />
                      <span className="text-muted-foreground font-mono">
                        {new Date(run.ts).toLocaleString()}
                      </span>
                      <span className="text-muted-foreground">
                        {run.durationMs > 0
                          ? `${(run.durationMs / 1000).toFixed(1)}s`
                          : ""}
                      </span>
                      <span className="text-foreground truncate flex-1">
                        {run.summary}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
