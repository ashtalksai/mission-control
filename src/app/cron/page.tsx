"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { usePolling } from "@/hooks/use-polling";
import { POLLING_INTERVALS } from "@/lib/constants-client";
import { cn } from "@/lib/utils";
import type { CronJob, CronRun } from "@/lib/types";
import cronstrue from "cronstrue";

type CronJobsResponse = { jobs: CronJob[]; runHistory: CronRun[] };

function humanSchedule(expr: string): string {
  try { return cronstrue.toString(expr, { use24HourTimeFormat: true }); } catch { return expr; }
}

function timeUntil(ms: number): string {
  const diff = ms - Date.now();
  if (diff < 0) return "due";
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

function timeAgo(ms: number): string {
  if (!ms) return "never";
  const diff = Date.now() - ms;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins / 60)}h ago`;
}

export default function CronPage() {
  const [expandedJob, setExpandedJob] = useState<string | null>(null);
  const { data } = usePolling<CronJobsResponse>("/api/cron/jobs", POLLING_INTERVALS.cron);

  const jobs = data?.jobs ?? [];
  const runHistory = data?.runHistory ?? [];
  const runsByJob = new Map<string, CronRun[]>();
  for (const run of runHistory) {
    const arr = runsByJob.get(run.jobId) ?? [];
    arr.push(run);
    runsByJob.set(run.jobId, arr);
  }

  const enabledJobs = jobs.filter((j) => j.enabled);
  const disabledJobs = jobs.filter((j) => !j.enabled);

  return (
    <div className="p-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 lg:grid-rows-[auto_1fr] gap-3 lg:h-full">
      {/* Header */}
      <Card className="col-span-1 md:col-span-2 gap-0 rounded-lg py-0">
        <CardContent className="px-4 py-2.5 flex items-center gap-4">
          <span className="text-sm font-medium text-foreground">Cron Jobs</span>
          <Badge variant="outline" className="text-xs">{enabledJobs.length} active</Badge>
          <Badge variant="outline" className="text-xs">{disabledJobs.length} disabled</Badge>
          <span className="text-xs text-muted-foreground">{runHistory.length} recent runs</span>
        </CardContent>
      </Card>

      {/* Active jobs -- scrollable on desktop */}
      <Card className="gap-0 rounded-lg py-0 overflow-hidden lg:h-full">
        <CardHeader className="px-3 py-2 border-b border-border/60 gap-0 flex-row items-center justify-between">
          <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
            Active ({enabledJobs.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 min-h-0 overflow-y-auto scrollbar-thin p-0">
          {enabledJobs.map((job) => {
            const lastOk = job.state.lastRunStatus === "ok" || job.state.lastStatus === "ok";
            const hasErr = job.state.consecutiveErrors > 0;
            const isExpanded = expandedJob === job.id;
            const runs = runsByJob.get(job.id) ?? [];
            return (
              <div key={job.id} className="border-b border-border/30">
                <button
                  onClick={() => setExpandedJob(isExpanded ? null : job.id)}
                  className="w-full text-left px-3 py-2.5 flex items-center gap-2.5 hover:bg-muted/10 transition-colors"
                >
                  <div className={cn("w-1.5 h-1.5 rounded-full shrink-0", hasErr ? "bg-red-600 dark:bg-red-500" : lastOk ? "bg-emerald-600 dark:bg-emerald-500" : "bg-muted")} />
                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-medium text-foreground truncate block">{job.name}</span>
                    <span className="text-xs text-muted-foreground">{humanSchedule(job.schedule.expr)}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground shrink-0">
                    {job.state.lastRunAtMs > 0 && <span>{timeAgo(job.state.lastRunAtMs)}</span>}
                    {job.state.nextRunAtMs > 0 && <span className="text-blue-600 dark:text-blue-400">in {timeUntil(job.state.nextRunAtMs)}</span>}
                  </div>
                  <svg className={cn("w-3 h-3 text-muted-foreground transition-transform shrink-0", isExpanded && "rotate-180")} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {isExpanded && (
                  <div className="px-3 pb-2.5 space-y-2">
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div><span className="text-muted-foreground">Target: </span><span className="font-mono text-foreground">{job.sessionTarget}</span></div>
                      <div><span className="text-muted-foreground">Duration: </span><span className="font-mono text-foreground">{job.state.lastDurationMs > 0 ? `${(job.state.lastDurationMs / 1000).toFixed(1)}s` : "-"}</span></div>
                    </div>
                    {job.payload?.text && (
                      <pre className="text-xs text-muted-foreground bg-muted rounded p-2 overflow-x-auto max-h-16 scrollbar-thin">{job.payload.text}</pre>
                    )}
                    {runs.length > 0 && (
                      <div className="space-y-0.5 max-h-24 overflow-y-auto scrollbar-thin">
                        {runs.slice(0, 8).map((run, i) => (
                          <div key={i} className="flex items-center gap-2 text-xs py-0.5">
                            <div className={cn("w-1 h-1 rounded-full", run.status === "ok" ? "bg-emerald-600 dark:bg-emerald-500" : "bg-red-600 dark:bg-red-500")} />
                            <span className="font-mono text-muted-foreground">{new Date(run.ts).toLocaleTimeString()}</span>
                            <span className="text-foreground truncate flex-1">{run.summary}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Disabled jobs -- scrollable on desktop */}
      <Card className="gap-0 rounded-lg py-0 overflow-hidden lg:h-full">
        <CardHeader className="px-3 py-2 border-b border-border/60 gap-0">
          <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
            Disabled ({disabledJobs.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 min-h-0 overflow-y-auto scrollbar-thin p-0">
          {disabledJobs.map((job) => (
            <div key={job.id} className="border-b border-border/30 px-3 py-2.5 flex items-center gap-2.5 opacity-50">
              <div className="w-1.5 h-1.5 rounded-full bg-muted shrink-0" />
              <div className="flex-1 min-w-0">
                <span className="text-xs text-foreground truncate block">{job.name}</span>
                <span className="text-xs text-muted-foreground">{humanSchedule(job.schedule.expr)}</span>
              </div>
              <span className="text-xs text-muted-foreground font-mono shrink-0">{job.sessionTarget}</span>
            </div>
          ))}
          {disabledJobs.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-6">None disabled</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
