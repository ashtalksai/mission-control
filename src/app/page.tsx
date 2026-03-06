"use client";

import { Header } from "@/components/layout/header";
import { AgentGrid } from "@/components/dashboard/agent-grid";
import { CostTicker } from "@/components/dashboard/cost-ticker";
import { CronStrip } from "@/components/dashboard/cron-strip";
import { Card, CardContent } from "@/components/ui/card";
import { usePolling } from "@/hooks/use-polling";
import { POLLING_INTERVALS } from "@/lib/constants-client";
import type { AgentStatusResponse, CostSummary, CronStatusResponse } from "@/lib/types";

export default function DashboardPage() {
  const { data: agentData } = usePolling<AgentStatusResponse>(
    "/api/agents/status",
    POLLING_INTERVALS.agents
  );
  const { data: costData } = usePolling<CostSummary>(
    "/api/costs/summary",
    POLLING_INTERVALS.costs
  );
  const { data: cronData } = usePolling<CronStatusResponse>(
    "/api/cron/status",
    POLLING_INTERVALS.cron
  );

  return (
    <div className="flex flex-col h-full">
      <Header todaySpend={costData?.totalToday ?? 0} />
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {/* Active Agent Banner */}
        {agentData?.activeAgent && (
          <div className="rounded-lg bg-emerald-500/5 border border-emerald-500/20 px-4 py-2.5 flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <div className="flex-1 min-w-0">
              <span className="text-sm font-medium text-emerald-400">
                @{agentData.activeAgent}
              </span>
              <span className="text-xs text-muted-foreground ml-2">
                {agentData.todayPipelineCount} tasks today
              </span>
            </div>
            {agentData.activeNote && (
              <span className="text-xs text-emerald-400/70 truncate max-w-md">
                {agentData.activeNote}
              </span>
            )}
          </div>
        )}

        {/* Cost Overview */}
        <CostTicker
          today={costData?.totalToday ?? 0}
          week={costData?.totalWeek ?? 0}
          month={costData?.totalMonth ?? 0}
        />

        {/* Agent Grid */}
        <div>
          <h2 className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2 font-medium">
            Agents
          </h2>
          <AgentGrid agents={agentData?.agents ?? []} />
        </div>

        {/* Cron Strip */}
        <Card>
          <CardContent className="p-4">
            <h2 className="text-[10px] uppercase tracking-wider text-muted-foreground mb-3 font-medium">
              Cron Jobs
            </h2>
            <CronStrip
              upcoming={cronData?.upcoming ?? []}
              recent={cronData?.recent ?? []}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
