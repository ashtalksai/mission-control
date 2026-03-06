"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { usePolling } from "@/hooks/use-polling";
import { POLLING_INTERVALS } from "@/lib/constants-client";
import { cn } from "@/lib/utils";
import type { AgentProfile, AgentStatusResponse } from "@/lib/types";

type ProfileSummary = Omit<AgentProfile, "instructions"> & { instructionsPreview: string };

const MODEL_COLORS: Record<string, string> = {
  "Opus 4.6": "bg-violet-500/15 text-violet-400 border-violet-500/20",
  "Sonnet 4.6": "bg-blue-500/15 text-blue-400 border-blue-500/20",
  "Haiku 4.5": "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
};

export default function AgentsPage() {
  const { data: profiles } = usePolling<ProfileSummary[]>(
    "/api/agents/profiles",
    POLLING_INTERVALS.agentProfiles
  );
  const { data: statusData } = usePolling<AgentStatusResponse>(
    "/api/agents/status",
    POLLING_INTERVALS.agents
  );

  const statusMap = new Map(
    statusData?.agents.map((a) => [a.name, a]) ?? []
  );

  return (
    <div className="flex flex-col h-full">
      <div className="h-12 border-b border-border bg-card flex items-center px-4">
        <h1 className="text-sm font-semibold text-foreground">Agent Team</h1>
        <span className="text-xs text-muted-foreground ml-2">
          {profiles?.length ?? 0} agents
        </span>
      </div>
      <div className="flex-1 overflow-auto p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {profiles?.map((profile) => {
            const status = statusMap.get(profile.name);
            const isActive = status?.isCurrentAgent;
            return (
              <Link key={profile.name} href={`/agents/${profile.name}`}>
                <Card
                  className={cn(
                    "h-full transition-all hover:border-foreground/20 cursor-pointer",
                    isActive && "ring-1 ring-emerald-500/50 shadow-[0_0_15px_-3px_rgba(16,185,129,0.2)]"
                  )}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div
                          className={cn(
                            "w-2.5 h-2.5 rounded-full shrink-0",
                            status?.status === "active"
                              ? "bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]"
                              : "bg-zinc-600"
                          )}
                        />
                        <div>
                          <span className="text-sm font-semibold text-foreground">
                            {profile.label}
                          </span>
                          <p className="text-[10px] text-muted-foreground">
                            @{profile.name}
                          </p>
                        </div>
                      </div>
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[10px] px-1.5 py-0 h-4 border",
                          MODEL_COLORS[profile.model] ?? "bg-zinc-500/15 text-zinc-400 border-zinc-500/20"
                        )}
                      >
                        {profile.model}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed mb-3 line-clamp-2">
                      {profile.role}
                    </p>
                    <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                      <span>Stages: {profile.stages}</span>
                      <span>{profile.lineCount} lines</span>
                    </div>
                    {profile.skills.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {profile.skills.slice(0, 3).map((s) => (
                          <Badge
                            key={s}
                            variant="secondary"
                            className="text-[9px] px-1 py-0 h-3.5"
                          >
                            {s}
                          </Badge>
                        ))}
                        {profile.skills.length > 3 && (
                          <span className="text-[9px] text-muted-foreground">
                            +{profile.skills.length - 3} more
                          </span>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
