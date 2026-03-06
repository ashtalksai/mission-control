"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { usePolling } from "@/hooks/use-polling";
import { POLLING_INTERVALS } from "@/lib/constants-client";
import { cn } from "@/lib/utils";
import type { Skill } from "@/lib/types";

type SkillSummary = Omit<Skill, "content"> & { contentPreview: string };

// Auto-categorize skills by name patterns
function categorize(name: string): string {
  if (/scaffold|nextjs|react-native|frontend/.test(name)) return "Build";
  if (/marketing|pitch|document|brand|copy/.test(name)) return "Marketing";
  if (/qa|test|playbook/.test(name)) return "QA";
  if (/comment|template/.test(name)) return "Templates";
  if (/gog|cli|tool/.test(name)) return "Tools";
  if (/design|ui|ux/.test(name)) return "Design";
  return "Other";
}

export default function SkillsPage() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const { data: skills } = usePolling<SkillSummary[]>("/api/skills", POLLING_INTERVALS.skills);

  const categorized = useMemo(() => {
    const cats = new Map<string, number>();
    for (const s of skills ?? []) {
      const cat = categorize(s.name);
      cats.set(cat, (cats.get(cat) ?? 0) + 1);
    }
    return Array.from(cats.entries()).sort(([, a], [, b]) => b - a);
  }, [skills]);

  const filtered = (skills ?? []).filter((s) => {
    if (category && categorize(s.name) !== category) return false;
    if (search && !s.name.toLowerCase().includes(search.toLowerCase()) && !s.description.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="p-3 grid grid-rows-[auto_1fr] gap-3 lg:h-full">
      {/* Filter bar */}
      <Card className="gap-0 py-0 rounded-lg">
        <CardContent className="px-4 py-2.5 flex items-center gap-4">
          <span className="text-sm font-medium text-foreground">Skills</span>
          <span className="text-xs text-muted-foreground">{filtered.length}/{skills?.length ?? 0}</span>
          <div className="flex items-center gap-1.5 ml-2">
            <button
              onClick={() => setCategory(null)}
              className={cn(
                "text-xs px-2 py-1 rounded-md transition-colors",
                category === null ? "bg-accent text-accent-foreground font-medium" : "text-muted-foreground hover:text-foreground"
              )}
            >
              All
            </button>
            {categorized.map(([cat, count]) => (
              <button
                key={cat}
                onClick={() => setCategory(category === cat ? null : cat)}
                className={cn(
                  "text-xs px-2 py-1 rounded-md transition-colors flex items-center gap-1",
                  category === cat ? "bg-accent text-accent-foreground font-medium" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {cat} <span className="opacity-50">{count}</span>
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

      {/* Scrollable skill grid */}
      <Card className="gap-0 py-0 rounded-lg overflow-hidden">
        <CardContent className="px-3 py-3 lg:h-full lg:overflow-y-auto scrollbar-thin">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5">
            {filtered.map((skill) => (
              <Link key={skill.name} href={`/skills/${encodeURIComponent(skill.name)}`}>
                <div className="rounded-md border border-border/50 p-3 hover:border-foreground/20 transition-colors cursor-pointer h-full">
                  <div className="flex items-start justify-between gap-1 mb-1.5">
                    <h3 className="text-xs font-medium text-foreground truncate">{skill.name}</h3>
                    <span className="text-xs font-mono text-muted-foreground shrink-0">{skill.lineCount}L</span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
                    {skill.description || skill.contentPreview}
                  </p>
                  <div className="mt-2">
                    <Badge variant="secondary" className="text-xs px-1 py-0 h-4 font-normal text-muted-foreground">
                      {categorize(skill.name)}
                    </Badge>
                  </div>
                </div>
              </Link>
            ))}
          </div>
          {filtered.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-8">No skills match</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
