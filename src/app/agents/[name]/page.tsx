"use client";

import { use, useState } from "react";
import Link from "next/link";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { usePolling } from "@/hooks/use-polling";
import { POLLING_INTERVALS } from "@/lib/constants-client";
import { cn } from "@/lib/utils";
import type { AgentProfile, AgentStatusResponse } from "@/lib/types";

const MODEL_COLORS: Record<string, string> = {
  "Opus 4.6": "bg-violet-500/15 text-violet-400 border-violet-500/20",
  "Sonnet 4.6": "bg-blue-500/15 text-blue-400 border-blue-500/20",
  "Haiku 4.5": "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
};

const PIPELINE_STAGES = [
  { num: "1", name: "Research" },
  { num: "2", name: "Plan" },
  { num: "3", name: "Design" },
  { num: "4", name: "Build" },
  { num: "5", name: "Test" },
  { num: "6", name: "Fix" },
  { num: "7", name: "Deploy" },
  { num: "8", name: "GTM" },
  { num: "9", name: "Assets" },
  { num: "10", name: "Distribute" },
  { num: "11", name: "Report" },
  { num: "12", name: "Growth" },
  { num: "13", name: "Optimize" },
  { num: "14", name: "Scale" },
  { num: "15", name: "Deliver" },
];

function parseStages(stagesStr: string): Set<string> {
  const stages = new Set<string>();
  for (const part of stagesStr.split(",")) {
    const trimmed = part.trim();
    const rangeMatch = trimmed.match(/^(\d+)-(\d+)$/);
    if (rangeMatch) {
      for (let i = parseInt(rangeMatch[1]); i <= parseInt(rangeMatch[2]); i++) {
        stages.add(String(i));
      }
    } else {
      const numMatch = trimmed.match(/^(\d+)/);
      if (numMatch) stages.add(numMatch[1]);
    }
  }
  return stages;
}

// Extract top-level headings from markdown to create a TOC
function extractSections(md: string): { heading: string; level: number; content: string }[] {
  const lines = md.split("\n");
  const sections: { heading: string; level: number; startLine: number }[] = [];

  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(/^(#{1,3})\s+(.+)/);
    if (match) {
      sections.push({ heading: match[2], level: match[1].length, startLine: i });
    }
  }

  return sections.map((sec, idx) => {
    const endLine = idx < sections.length - 1 ? sections[idx + 1].startLine : lines.length;
    return {
      heading: sec.heading,
      level: sec.level,
      content: lines.slice(sec.startLine, endLine).join("\n"),
    };
  });
}

export default function AgentDetailPage({
  params,
}: {
  params: Promise<{ name: string }>;
}) {
  const { name } = use(params);
  const [activeSection, setActiveSection] = useState<number | null>(null);
  const [showFull, setShowFull] = useState(false);

  const { data: profile } = usePolling<AgentProfile>(
    `/api/agents/${name}`,
    POLLING_INTERVALS.agentProfiles
  );
  const { data: statusData } = usePolling<AgentStatusResponse>(
    "/api/agents/status",
    POLLING_INTERVALS.agents
  );

  const agentStatus = statusData?.agents.find((a) => a.name === name);
  const ownedStages = profile ? parseStages(profile.stages) : new Set<string>();
  const sections = profile ? extractSections(profile.instructions) : [];

  if (!profile) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-sm text-muted-foreground">Loading agent profile...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="h-12 border-b border-border bg-card flex items-center px-4 gap-3">
        <Link
          href="/agents"
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          Agents
        </Link>
        <span className="text-xs text-muted-foreground">/</span>
        <span className="text-sm font-semibold text-foreground">@{name}</span>
      </div>
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {/* Header Card */}
        <Card>
          <CardContent className="p-5">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    "w-3 h-3 rounded-full",
                    agentStatus?.status === "active"
                      ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"
                      : "bg-zinc-600"
                  )}
                />
                <div>
                  <h2 className="text-lg font-bold text-foreground">{profile.label}</h2>
                  <p className="text-xs text-muted-foreground">@{profile.name}</p>
                </div>
              </div>
              <Badge
                variant="outline"
                className={cn(
                  "text-xs px-2 py-0.5 border",
                  MODEL_COLORS[profile.model] ?? "bg-zinc-500/15 text-zinc-400 border-zinc-500/20"
                )}
              >
                {profile.model}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">{profile.role}</p>
            <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
              <span>Sessions: {agentStatus?.sessionCount ?? 0}</span>
              <span>Instructions: {profile.lineCount} lines</span>
              <span className="font-mono text-xs">{profile.instructionsPath}</span>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Pipeline Stages */}
          <Card>
            <CardContent className="p-5">
              <h3 className="text-xs uppercase tracking-wider text-muted-foreground mb-3 font-medium">
                Pipeline Stages
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {PIPELINE_STAGES.map((stage) => {
                  const owned = ownedStages.has(stage.num);
                  return (
                    <div
                      key={stage.num}
                      className={cn(
                        "flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs border transition-colors",
                        owned
                          ? "bg-blue-500/10 border-blue-500/30 text-blue-400"
                          : "bg-muted/30 border-border text-muted-foreground/50"
                      )}
                    >
                      <span className="font-mono text-xs opacity-60">{stage.num}</span>
                      <span>{stage.name}</span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Skills */}
          <Card>
            <CardContent className="p-5">
              <h3 className="text-xs uppercase tracking-wider text-muted-foreground mb-3 font-medium">
                Skills ({profile.skills.length})
              </h3>
              {profile.skills.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {profile.skills.map((skill) => (
                    <Link key={skill} href={`/skills/${skill}`}>
                      <Badge
                        variant="outline"
                        className="text-xs px-2 py-0.5 cursor-pointer hover:bg-accent transition-colors"
                      >
                        {skill}
                      </Badge>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">No skills referenced</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Instructions — Section Browser */}
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
                Instructions (AGENTS.md)
              </h3>
              <button
                onClick={() => { setShowFull(!showFull); setActiveSection(null); }}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                {showFull ? "Show sections" : "Show full document"}
              </button>
            </div>

            {showFull ? (
              <div className="prose prose-invert prose-sm max-w-none max-h-[600px] overflow-auto rounded-md bg-muted/30 p-4 border border-border">
                <Markdown remarkPlugins={[remarkGfm]}>{profile.instructions}</Markdown>
              </div>
            ) : (
              <div className="space-y-1">
                {sections.map((sec, i) => (
                  <div key={i}>
                    <button
                      onClick={() => setActiveSection(activeSection === i ? null : i)}
                      className={cn(
                        "w-full text-left px-3 py-2 rounded-md text-sm transition-colors flex items-center gap-2",
                        activeSection === i
                          ? "bg-accent text-accent-foreground"
                          : "hover:bg-muted/50 text-foreground"
                      )}
                      style={{ paddingLeft: `${(sec.level - 1) * 16 + 12}px` }}
                    >
                      <svg
                        className={cn(
                          "w-3 h-3 text-muted-foreground transition-transform shrink-0",
                          activeSection === i && "rotate-90"
                        )}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                      <span className={cn(sec.level === 1 && "font-medium")}>
                        {sec.heading}
                      </span>
                    </button>
                    {activeSection === i && (
                      <div className="prose prose-invert prose-sm max-w-none rounded-md bg-muted/30 p-4 border border-border mx-3 mb-2 mt-1 max-h-[400px] overflow-auto">
                        <Markdown remarkPlugins={[remarkGfm]}>{sec.content}</Markdown>
                      </div>
                    )}
                  </div>
                ))}
                {sections.length === 0 && (
                  <p className="text-xs text-muted-foreground">No sections found in instructions.</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
