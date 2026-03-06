"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { usePolling } from "@/hooks/use-polling";
import { POLLING_INTERVALS } from "@/lib/constants-client";
import { cn } from "@/lib/utils";
import type { ProjectsResponse } from "@/lib/types";

const FRAMEWORK_COLORS: Record<string, string> = {
  nextjs: "text-foreground border-foreground/20",
  react: "text-cyan-600 dark:text-cyan-400 border-cyan-500/20",
  node: "text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  unknown: "text-muted-foreground border-border",
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d`;
  return `${Math.floor(days / 30)}mo`;
}

export default function ProjectsPage() {
  const [search, setSearch] = useState("");
  const [framework, setFramework] = useState<string | null>(null);
  const { data } = usePolling<ProjectsResponse>("/api/projects", POLLING_INTERVALS.projects);

  const projects = data?.projects ?? [];
  const filtered = projects.filter((p) => {
    if (framework && p.framework !== framework) return false;
    if (search && !p.name.toLowerCase().includes(search.toLowerCase()) && !p.description.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const frameworks = Object.entries(data?.frameworkBreakdown ?? {}).sort(([, a], [, b]) => b - a);

  return (
    <div className="p-3 lg:h-full lg:grid lg:grid-rows-[auto_1fr] gap-3 space-y-3 lg:space-y-0">
      {/* Filter bar */}
      <Card className="py-0">
        <CardContent className="px-4 py-2.5 flex items-center gap-4 flex-wrap">
          <span className="text-sm font-medium text-foreground">Projects</span>
          <span className="text-xs text-muted-foreground">{filtered.length}/{projects.length}</span>
          <div className="flex items-center gap-1.5 ml-2 flex-wrap">
            <button
              onClick={() => setFramework(null)}
              className={cn(
                "text-xs px-2 py-1 rounded-md transition-colors",
                framework === null ? "bg-accent text-accent-foreground font-medium" : "text-muted-foreground hover:text-foreground"
              )}
            >
              All
            </button>
            {frameworks.map(([fw, count]) => (
              <button
                key={fw}
                onClick={() => setFramework(framework === fw ? null : fw)}
                className={cn(
                  "text-xs px-2 py-1 rounded-md transition-colors flex items-center gap-1",
                  framework === fw ? "bg-accent text-accent-foreground font-medium" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {fw} <span className="opacity-50">{count}</span>
              </button>
            ))}
          </div>
          <input
            type="text"
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="ml-auto h-7 w-44 rounded-md border border-border bg-muted/50 px-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </CardContent>
      </Card>

      {/* Scrollable project grid */}
      <Card className="overflow-hidden py-0">
        <div className="lg:h-full overflow-y-auto scrollbar-thin p-3">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-2.5">
            {filtered.map((project) => (
              <Link key={project.name} href={`/projects/${project.name}`}>
                <div className="rounded-md border border-border/50 p-3 hover:border-foreground/20 transition-colors cursor-pointer h-full">
                  <div className="flex items-start justify-between gap-1 mb-1.5">
                    <h3 className="text-xs font-semibold text-foreground truncate">{project.name}</h3>
                    <Badge variant="outline" className={cn("text-xs px-1 py-0 h-4 shrink-0 font-mono", FRAMEWORK_COLORS[project.framework] ?? FRAMEWORK_COLORS.unknown)}>
                      {project.framework}
                    </Badge>
                  </div>
                  {project.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2 mb-2 leading-relaxed">{project.description}</p>
                  )}
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {project.hasGit && <span className="text-emerald-600 dark:text-emerald-500 opacity-60">git</span>}
                    <span>{project.size}</span>
                    <span className="ml-auto">{timeAgo(project.lastModified)}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
          {filtered.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-8">No projects match filters</p>
          )}
        </div>
      </Card>
    </div>
  );
}
