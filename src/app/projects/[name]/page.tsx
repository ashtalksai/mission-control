"use client";

import { use } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { usePolling } from "@/hooks/use-polling";
import { POLLING_INTERVALS } from "@/lib/constants-client";
import { cn } from "@/lib/utils";

interface ProjectDetail {
  name: string;
  path: string;
  hasPackageJson: boolean;
  description: string;
  hasGit: boolean;
  lastModified: string;
  deployUrl: string | null;
  healthStatus: string;
  framework: string;
  size: string;
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
  scripts: Record<string, string>;
  topLevelFiles: string[];
  topLevelDirs: string[];
  pages: string[];
  readme: string | null;
  envExample: string | null;
  gitRemote: string | null;
  gitBranch: string | null;
}

const FRAMEWORK_COLORS: Record<string, string> = {
  nextjs: "bg-foreground/10 text-foreground border-foreground/20",
  react: "bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border-cyan-500/20",
  node: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  unknown: "bg-muted text-muted-foreground border-border",
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

function Section({ title, children, count }: { title: string; children: React.ReactNode; count?: number }) {
  return (
    <Card>
      <CardContent className="p-4">
        <h3 className="text-xs uppercase tracking-wider text-muted-foreground mb-3 font-medium">
          {title} {count !== undefined && <span className="text-muted-foreground/60">({count})</span>}
        </h3>
        {children}
      </CardContent>
    </Card>
  );
}

export default function ProjectDetailPage({
  params,
}: {
  params: Promise<{ name: string }>;
}) {
  const { name } = use(params);
  const { data: project } = usePolling<ProjectDetail>(
    `/api/projects/${name}`,
    POLLING_INTERVALS.projects
  );

  if (!project) {
    return (
      <div className="flex items-center justify-center lg:h-full py-20">
        <p className="text-sm text-muted-foreground">Loading project...</p>
      </div>
    );
  }

  const depCount = Object.keys(project.dependencies).length;
  const devDepCount = Object.keys(project.devDependencies).length;

  return (
    <div className="flex flex-col lg:h-full">
      <div className="h-12 border-b border-border bg-card flex items-center px-4 gap-3">
        <Link
          href="/projects"
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          Projects
        </Link>
        <span className="text-xs text-muted-foreground">/</span>
        <span className="text-sm font-semibold text-foreground">{name}</span>
      </div>
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {/* Header */}
        <Card>
          <CardContent className="p-5">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h2 className="text-lg font-bold text-foreground">{project.name}</h2>
                {project.description && (
                  <p className="text-sm text-muted-foreground mt-1">{project.description}</p>
                )}
              </div>
              <Badge
                variant="outline"
                className={cn(
                  "text-xs px-2 py-0.5 border",
                  FRAMEWORK_COLORS[project.framework] ?? FRAMEWORK_COLORS.unknown
                )}
              >
                {project.framework}
              </Badge>
            </div>
            <div className="flex items-center flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span className="font-mono text-xs">{project.path}</span>
              <span>Modified {timeAgo(project.lastModified)}</span>
              <span>{project.size}</span>
              {project.hasGit && project.gitBranch && (
                <span className="flex items-center gap-1">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  {project.gitBranch}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-3">
              {project.deployUrl && (
                <a
                  href={project.deployUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-emerald-600 dark:text-emerald-400 hover:text-emerald-500 dark:hover:text-emerald-300 underline underline-offset-2"
                >
                  {project.deployUrl}
                </a>
              )}
              {project.gitRemote && (
                <a
                  href={project.gitRemote.replace("git@github.com:", "https://github.com/").replace(/\.git$/, "")}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300 underline underline-offset-2"
                >
                  GitHub
                </a>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Pages / Routes */}
          <Section title="Pages" count={project.pages.length}>
            {project.pages.length > 0 ? (
              <div className="space-y-1">
                {project.pages.map((page) => (
                  <div
                    key={page}
                    className="flex items-center gap-2 px-2 py-1.5 rounded bg-muted/30 text-xs font-mono text-foreground"
                  >
                    <span className="text-muted-foreground">/</span>
                    {page || "(index)"}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">No pages detected</p>
            )}
          </Section>

          {/* Scripts */}
          <Section title="Scripts" count={Object.keys(project.scripts).length}>
            {Object.keys(project.scripts).length > 0 ? (
              <div className="space-y-1">
                {Object.entries(project.scripts).map(([key, val]) => (
                  <div
                    key={key}
                    className="flex items-start gap-2 px-2 py-1.5 rounded bg-muted/30 text-xs"
                  >
                    <span className="font-mono text-emerald-600 dark:text-emerald-400 shrink-0">{key}</span>
                    <span className="text-muted-foreground font-mono truncate">{val}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">No scripts</p>
            )}
          </Section>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Dependencies */}
          <Section title="Dependencies" count={depCount}>
            {depCount > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(project.dependencies).map(([pkg, ver]) => (
                  <Badge
                    key={pkg}
                    variant="outline"
                    className="text-xs px-1.5 py-0 h-5 border font-mono"
                    title={`${pkg}@${ver}`}
                  >
                    {pkg} <span className="text-muted-foreground ml-0.5">{ver}</span>
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">No dependencies</p>
            )}
          </Section>

          {/* Dev Dependencies */}
          <Section title="Dev Dependencies" count={devDepCount}>
            {devDepCount > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(project.devDependencies).map(([pkg, ver]) => (
                  <Badge
                    key={pkg}
                    variant="secondary"
                    className="text-xs px-1.5 py-0 h-5 font-mono"
                    title={`${pkg}@${ver}`}
                  >
                    {pkg} <span className="opacity-60 ml-0.5">{ver}</span>
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">No dev dependencies</p>
            )}
          </Section>
        </div>

        {/* File Structure */}
        <Section title="Project Structure">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="text-xs text-muted-foreground mb-2 uppercase tracking-wider">Directories</h4>
              <div className="space-y-0.5">
                {project.topLevelDirs.map((dir) => (
                  <div key={dir} className="flex items-center gap-1.5 text-xs text-foreground">
                    <svg className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                    </svg>
                    {dir}
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h4 className="text-xs text-muted-foreground mb-2 uppercase tracking-wider">Files</h4>
              <div className="space-y-0.5">
                {project.topLevelFiles.map((file) => (
                  <div key={file} className="flex items-center gap-1.5 text-xs text-muted-foreground font-mono">
                    <svg className="w-3.5 h-3.5 text-muted-foreground shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    {file}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Section>

        {/* Env Example */}
        {project.envExample && (
          <Section title="Environment Variables (.env.example)">
            <pre className="text-xs font-mono text-muted-foreground bg-muted/30 rounded p-3 overflow-auto max-h-48 whitespace-pre-wrap">
              {project.envExample}
            </pre>
          </Section>
        )}
      </div>
    </div>
  );
}
