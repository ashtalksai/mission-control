"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { usePolling } from "@/hooks/use-polling";
import { POLLING_INTERVALS } from "@/lib/constants-client";
import { cn } from "@/lib/utils";
import type { ProjectsResponse } from "@/lib/types";

const FRAMEWORK_COLORS: Record<string, string> = {
  nextjs: "bg-white/10 text-white border-white/20",
  react: "bg-cyan-500/15 text-cyan-400 border-cyan-500/20",
  node: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
  unknown: "bg-zinc-500/15 text-zinc-400 border-zinc-500/20",
};

function timeAgo(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

export default function ProjectsPage() {
  const { data } = usePolling<ProjectsResponse>(
    "/api/projects",
    POLLING_INTERVALS.projects
  );

  return (
    <div className="flex flex-col h-full">
      <div className="h-12 border-b border-border bg-card flex items-center px-4 gap-4">
        <h1 className="text-sm font-semibold text-foreground">Projects</h1>
        <span className="text-xs text-muted-foreground">
          {data?.totalCount ?? 0} projects
        </span>
        {data?.frameworkBreakdown && (
          <div className="flex items-center gap-2 ml-auto">
            {Object.entries(data.frameworkBreakdown)
              .sort(([, a], [, b]) => b - a)
              .map(([fw, count]) => (
                <Badge
                  key={fw}
                  variant="outline"
                  className={cn(
                    "text-[10px] px-1.5 py-0 h-4 border",
                    FRAMEWORK_COLORS[fw] ?? FRAMEWORK_COLORS.unknown
                  )}
                >
                  {fw} ({count})
                </Badge>
              ))}
          </div>
        )}
      </div>
      <div className="flex-1 overflow-auto p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {data?.projects.map((project) => (
            <Link key={project.name} href={`/projects/${project.name}`}>
            <Card className="hover:border-foreground/20 transition-colors cursor-pointer h-full">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="text-sm font-semibold text-foreground truncate">
                    {project.name}
                  </h3>
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-[10px] px-1.5 py-0 h-4 border shrink-0 ml-2",
                      FRAMEWORK_COLORS[project.framework] ?? FRAMEWORK_COLORS.unknown
                    )}
                  >
                    {project.framework}
                  </Badge>
                </div>

                {project.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
                    {project.description}
                  </p>
                )}

                <div className="flex items-center gap-2 flex-wrap mb-3">
                  {project.hasGit && (
                    <Badge variant="secondary" className="text-[9px] px-1 py-0 h-3.5">
                      git
                    </Badge>
                  )}
                  {project.hasPackageJson && (
                    <Badge variant="secondary" className="text-[9px] px-1 py-0 h-3.5">
                      pkg
                    </Badge>
                  )}
                  <span className="text-[10px] text-muted-foreground">{project.size}</span>
                </div>

                <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                  <span>{timeAgo(project.lastModified)}</span>
                  {project.deployUrl && (
                    <a
                      href={project.deployUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-emerald-400 hover:text-emerald-300 truncate max-w-[140px]"
                    >
                      {project.deployUrl.replace("https://", "")}
                    </a>
                  )}
                </div>
              </CardContent>
            </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
