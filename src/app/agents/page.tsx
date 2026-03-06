"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { usePolling } from "@/hooks/use-polling";
import { POLLING_INTERVALS } from "@/lib/constants-client";
import { cn } from "@/lib/utils";
import type { AgentProfile, AgentStatusResponse } from "@/lib/types";

type ProfileSummary = Omit<AgentProfile, "instructions"> & { instructionsPreview: string };

const MODEL_COLORS: Record<string, string> = {
  "Opus 4.6": "text-primary border-primary/20",
  "Sonnet 4.6": "text-blue-600 dark:text-blue-400 border-blue-500/20",
  "Haiku 4.5": "text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
};

export default function AgentsPage() {
  const { data: profiles } = usePolling<ProfileSummary[]>("/api/agents/profiles", POLLING_INTERVALS.agentProfiles);
  const { data: statusData } = usePolling<AgentStatusResponse>("/api/agents/status", POLLING_INTERVALS.agents);

  const statusMap = new Map(statusData?.agents.map((a) => [a.name, a]) ?? []);

  return (
    <div className="p-3 grid grid-rows-[auto_1fr] gap-3 lg:h-full">
      {/* Header */}
      <Card className="gap-0 py-0 rounded-lg">
        <CardContent className="px-4 py-2.5 flex items-center gap-4">
          <span className="text-sm font-medium text-foreground">Agent Team</span>
          <span className="text-xs text-muted-foreground">{profiles?.length ?? 0} agents</span>
          {statusData?.activeAgent && (
            <div className="ml-auto flex items-center gap-2 text-xs">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-emerald-600 dark:text-emerald-400">@{statusData.activeAgent} active</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Agent grid -- internal scroll on lg */}
      <Card className="gap-0 py-0 rounded-lg overflow-hidden">
        <CardContent className="px-3 py-3 lg:h-full lg:overflow-y-auto scrollbar-thin">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5">
            {profiles?.map((profile) => {
              const status = statusMap.get(profile.name);
              const isActive = status?.isCurrentAgent;
              return (
                <Link key={profile.name} href={`/agents/${profile.name}`}>
                  <div
                    className={cn(
                      "rounded-md border p-3 transition-all hover:border-foreground/20 cursor-pointer h-full",
                      isActive
                        ? "border-emerald-500/30 bg-emerald-500/10 dark:bg-emerald-500/5 shadow-[0_0_12px_-4px_rgba(16,185,129,0.15)]"
                        : "border-border/50"
                    )}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div
                          className={cn(
                            "w-2 h-2 rounded-full shrink-0",
                            status?.status === "active"
                              ? "bg-emerald-500 shadow-[0_0_4px_rgba(16,185,129,0.5)]"
                              : "bg-muted-foreground/40"
                          )}
                        />
                        <div>
                          <span className="text-xs font-semibold text-foreground">{profile.label}</span>
                          <p className="text-xs text-muted-foreground">@{profile.name}</p>
                        </div>
                      </div>
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-xs px-1 py-0 h-3.5 border",
                          MODEL_COLORS[profile.model] ?? "text-muted-foreground border-border"
                        )}
                      >
                        {profile.model}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2 mb-2">
                      {profile.role}
                    </p>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Stages: {profile.stages}</span>
                      <span>{profile.lineCount} lines</span>
                    </div>
                    {profile.skills.length > 0 && (
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {profile.skills.slice(0, 3).map((s) => (
                          <Badge key={s} variant="secondary" className="text-xs px-1 py-0 h-4 font-normal text-muted-foreground">
                            {s}
                          </Badge>
                        ))}
                        {profile.skills.length > 3 && (
                          <span className="text-xs text-muted-foreground/40">+{profile.skills.length - 3}</span>
                        )}
                      </div>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
