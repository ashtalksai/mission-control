"use client";

import { Card, CardContent } from "@/components/ui/card";

interface CostTickerProps {
  today: number;
  week: number;
  month: number;
}

export function CostTicker({ today, week, month }: CostTickerProps) {
  return (
    <div className="grid grid-cols-3 gap-3">
      <CostCard label="Today" value={today} />
      <CostCard label="This Week" value={week} />
      <CostCard label="This Month" value={month} />
    </div>
  );
}

function CostCard({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardContent className="p-3">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">{label}</p>
        <p className="text-xl font-mono font-bold text-foreground tabular-nums">
          ${value.toFixed(2)}
        </p>
      </CardContent>
    </Card>
  );
}
