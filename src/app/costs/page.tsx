"use client";

import { Header } from "@/components/layout/header";
import { DailyChart, DonutChart } from "@/components/costs/cost-charts";
import { CostTable } from "@/components/costs/cost-table";
import { Card, CardContent } from "@/components/ui/card";
import { usePolling } from "@/hooks/use-polling";
import { POLLING_INTERVALS } from "@/lib/constants-client";
import type { CostSummary } from "@/lib/types";

export default function CostsPage() {
  const { data, isLoading } = usePolling<CostSummary>(
    "/api/costs/summary",
    POLLING_INTERVALS.costs
  );

  return (
    <div className="flex flex-col h-full">
      <Header todaySpend={data?.totalToday ?? 0} />
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {isLoading && !data ? (
          <div className="flex items-center justify-center h-64">
            <p className="text-sm text-muted-foreground">Loading cost data...</p>
          </div>
        ) : (
          <>
            {/* Daily Chart */}
            <Card>
              <CardContent className="p-4">
                <h2 className="text-[10px] uppercase tracking-wider text-muted-foreground mb-3 font-medium">
                  Daily Spend (Last 30 Days)
                </h2>
                <DailyChart data={data?.byDay ?? []} />
              </CardContent>
            </Card>

            {/* Breakdown Charts */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardContent className="p-4">
                  <DonutChart
                    title="By Agent"
                    data={(data?.byAgent ?? []).map((a) => ({
                      name: `@${a.agent}`,
                      value: a.cost,
                    }))}
                  />
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <DonutChart
                    title="By Model"
                    data={(data?.byModel ?? []).map((m) => ({
                      name: m.model,
                      value: m.cost,
                    }))}
                  />
                </CardContent>
              </Card>
            </div>

            {/* Cost Table */}
            <Card>
              <CardContent className="p-4">
                <h2 className="text-[10px] uppercase tracking-wider text-muted-foreground mb-3 font-medium">
                  Cost Log
                </h2>
                <CostTable entries={data?.entries ?? []} />
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
