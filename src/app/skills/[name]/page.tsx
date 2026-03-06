"use client";

import { use } from "react";
import Link from "next/link";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { usePolling } from "@/hooks/use-polling";
import { POLLING_INTERVALS } from "@/lib/constants-client";
import type { Skill } from "@/lib/types";

export default function SkillDetailPage({
  params,
}: {
  params: Promise<{ name: string }>;
}) {
  const { name } = use(params);
  const decodedName = decodeURIComponent(name);

  const { data: skill } = usePolling<Skill>(
    `/api/skills/${encodeURIComponent(decodedName)}`,
    POLLING_INTERVALS.skills
  );

  if (!skill) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-sm text-muted-foreground">Loading skill...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="h-12 border-b border-border bg-card flex items-center px-4 gap-3">
        <Link
          href="/skills"
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          Skills
        </Link>
        <span className="text-xs text-muted-foreground">/</span>
        <span className="text-sm font-semibold text-foreground">{skill.name}</span>
      </div>
      <div className="flex-1 overflow-auto p-4 space-y-4">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h2 className="text-lg font-bold text-foreground">{skill.name}</h2>
                {skill.description && (
                  <p className="text-sm text-muted-foreground mt-1">{skill.description}</p>
                )}
              </div>
              <Badge variant="secondary" className="text-xs shrink-0">
                {skill.lineCount} lines
              </Badge>
            </div>
            <p className="text-[10px] text-muted-foreground font-mono">{skill.path}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <h3 className="text-[10px] uppercase tracking-wider text-muted-foreground mb-3 font-medium">
              Skill Content
            </h3>
            <div className="prose prose-invert prose-sm max-w-none max-h-[700px] overflow-auto rounded-md bg-muted/30 p-4 border border-border">
              <Markdown remarkPlugins={[remarkGfm]}>{skill.content}</Markdown>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
