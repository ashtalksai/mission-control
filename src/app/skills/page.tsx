"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { usePolling } from "@/hooks/use-polling";
import { POLLING_INTERVALS } from "@/lib/constants-client";
import type { Skill } from "@/lib/types";

type SkillSummary = Omit<Skill, "content"> & { contentPreview: string };

export default function SkillsPage() {
  const [search, setSearch] = useState("");
  const { data: skills } = usePolling<SkillSummary[]>(
    "/api/skills",
    POLLING_INTERVALS.skills
  );

  const filtered = skills?.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.description.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full">
      <div className="h-12 border-b border-border bg-card flex items-center px-4 justify-between">
        <div className="flex items-center gap-2">
          <h1 className="text-sm font-semibold text-foreground">Skills Library</h1>
          <span className="text-xs text-muted-foreground">
            {skills?.length ?? 0} skills
          </span>
        </div>
        <input
          type="text"
          placeholder="Search skills..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-7 w-48 rounded-md border border-border bg-muted/50 px-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        />
      </div>
      <div className="flex-1 overflow-auto p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {filtered?.map((skill) => (
            <Link key={skill.name} href={`/skills/${encodeURIComponent(skill.name)}`}>
              <Card className="h-full transition-all hover:border-foreground/20 cursor-pointer">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-sm font-medium text-foreground truncate">
                      {skill.name}
                    </h3>
                    <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4 shrink-0 ml-2">
                      {skill.lineCount} lines
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
                    {skill.description || skill.contentPreview}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
        {filtered?.length === 0 && (
          <div className="flex items-center justify-center h-32">
            <p className="text-sm text-muted-foreground">No skills match your search.</p>
          </div>
        )}
      </div>
    </div>
  );
}
