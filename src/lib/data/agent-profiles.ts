import fs from "fs/promises";
import path from "path";
import os from "os";

const HOME = os.homedir();
const AGENTS_DIR = path.join(HOME, "clawd/areas/agents");
const MAIN_AGENTS_MD = path.join(HOME, "clawd/AGENTS.md");

interface AgentProfile {
  name: string;
  label: string;
  role: string;
  stages: string;
  model: string;
  skills: string[];
  instructions: string; // full AGENTS.md content
  instructionsPath: string;
  lineCount: number;
}

// Agent metadata from the main AGENTS.md table
const AGENT_META: Record<string, { label: string; stages: string; model: string; role: string }> = {
  main: { label: "(direct)", stages: "11, 15", model: "Opus 4.6", role: "Traffic control — dispatches agents, presents results to Ash" },
  planner: { label: "@planner", stages: "1-2", model: "Sonnet 4.6", role: "Research and planning — market analysis, competition, strategy" },
  designer: { label: "@designer", stages: "3", model: "Sonnet 4.6", role: "Design specs — UI/UX mockups, design system, brand identity" },
  coder: { label: "@coder", stages: "4, 6, 8b, 8c", model: "Opus 4.6", role: "Build full MVPs — Next.js/React Native, deploy to Coolify" },
  tester: { label: "@tester", stages: "5", model: "Sonnet 4.6", role: "QA — functional testing, scoring, bug reporting" },
  ops: { label: "@ops", stages: "7", model: "Haiku 4.5", role: "Verify deployments — health checks, DNS, SSL" },
  marketer: { label: "@marketer", stages: "8, 10, 12-14", model: "Sonnet 4.6", role: "GTM strategy, marketing plans, distribution, growth" },
  artist: { label: "@artist", stages: "9", model: "Sonnet 4.6", role: "Visual assets — logos, social media kits, mockups" },
};

async function readFile(p: string): Promise<string> {
  try {
    return await fs.readFile(p, "utf-8");
  } catch {
    return "";
  }
}

// Extract skills from agent instructions (references like "skills/pitch-deck/SKILL.md")
function extractSkills(content: string): string[] {
  const skills: string[] = [];
  const re = /skills\/([a-z0-9][\w-]*)\//gi;
  let match;
  while ((match = re.exec(content)) !== null) {
    const name = match[1];
    // Skip template placeholders and directory listing noise
    if (name === "<name>" || name === "name" || name.startsWith("<")) continue;
    skills.push(name);
  }
  return [...new Set(skills)];
}

export async function getAgentProfile(name: string): Promise<AgentProfile | null> {
  const meta = AGENT_META[name];
  if (!meta) return null;

  let instructionsPath: string;
  let content: string;

  if (name === "main") {
    instructionsPath = MAIN_AGENTS_MD;
    content = await readFile(MAIN_AGENTS_MD);
  } else {
    instructionsPath = path.join(AGENTS_DIR, name, "AGENTS.md");
    content = await readFile(instructionsPath);
  }

  return {
    name,
    ...meta,
    skills: extractSkills(content),
    instructions: content,
    instructionsPath,
    lineCount: content.split("\n").length,
  };
}

export async function getAllAgentProfiles(): Promise<AgentProfile[]> {
  const names = ["main", "planner", "designer", "coder", "tester", "ops", "marketer", "artist"];
  const profiles = await Promise.all(names.map(getAgentProfile));
  return profiles.filter((p): p is AgentProfile => p !== null);
}
