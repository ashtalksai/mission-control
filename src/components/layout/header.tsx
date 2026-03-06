"use client";

import { useEffect, useState } from "react";

export function Header({ todaySpend }: { todaySpend: number }) {
  const [time, setTime] = useState("");

  useEffect(() => {
    const tick = () => {
      setTime(
        new Date().toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
        })
      );
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <header className="h-12 border-b border-border bg-card flex items-center justify-between px-4">
      <div className="flex items-center gap-3">
        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        <span className="text-sm font-medium text-foreground">Mission Control</span>
      </div>
      <div className="flex items-center gap-6">
        <div className="text-right">
          <span className="text-[10px] uppercase text-muted-foreground block leading-none">Today</span>
          <span className="text-sm font-mono font-semibold text-foreground">
            ${todaySpend.toFixed(2)}
          </span>
        </div>
        <span className="text-sm font-mono text-muted-foreground tabular-nums">{time}</span>
      </div>
    </header>
  );
}
