import fs from "fs/promises";
import path from "path";
import os from "os";

const HOME = os.homedir();

export interface HealthCheck {
  name: string;
  category: "agent" | "cron" | "infrastructure" | "data";
  status: "healthy" | "warning" | "critical" | "unknown";
  message: string;
  lastChecked: string;
}

async function fileExists(p: string): Promise<boolean> {
  try { await fs.access(p); return true; } catch { return false; }
}

async function fileFreshness(p: string, maxAgeMs: number): Promise<{ fresh: boolean; ageMs: number }> {
  try {
    const stat = await fs.stat(p);
    const ageMs = Date.now() - stat.mtimeMs;
    return { fresh: ageMs < maxAgeMs, ageMs };
  } catch {
    return { fresh: false, ageMs: Infinity };
  }
}

export async function runHealthChecks(): Promise<HealthCheck[]> {
  const checks: HealthCheck[] = [];
  const now = new Date().toISOString();

  // 1. Agent queue file exists and is fresh
  const queuePath = path.join(HOME, "clawd/memory/state/agent-queue.json");
  const queueFresh = await fileFreshness(queuePath, 2 * 60 * 60 * 1000); // 2h
  checks.push({
    name: "Agent Queue",
    category: "agent",
    status: queueFresh.fresh ? "healthy" : "warning",
    message: queueFresh.fresh
      ? `Updated ${Math.round(queueFresh.ageMs / 60000)}m ago`
      : `Stale — last updated ${Math.round(queueFresh.ageMs / 3600000)}h ago`,
    lastChecked: now,
  });

  // 2. Gateway process (check gateway.log freshness)
  const gwFresh = await fileFreshness(path.join(HOME, ".openclaw/logs/gateway.log"), 10 * 60 * 1000);
  checks.push({
    name: "Gateway Process",
    category: "infrastructure",
    status: gwFresh.fresh ? "healthy" : gwFresh.ageMs < 60 * 60 * 1000 ? "warning" : "critical",
    message: gwFresh.fresh
      ? `Active — log updated ${Math.round(gwFresh.ageMs / 60000)}m ago`
      : `Possibly down — no log activity for ${Math.round(gwFresh.ageMs / 3600000)}h`,
    lastChecked: now,
  });

  // 3. Cron jobs.json exists
  const cronExists = await fileExists(path.join(HOME, ".openclaw/cron/jobs.json"));
  checks.push({
    name: "Cron System",
    category: "cron",
    status: cronExists ? "healthy" : "critical",
    message: cronExists ? "jobs.json present" : "jobs.json missing",
    lastChecked: now,
  });

  // 4. Main agent sessions freshness
  const mainSessions = path.join(HOME, ".openclaw/agents/main/sessions/sessions.json");
  const mainFresh = await fileFreshness(mainSessions, 60 * 60 * 1000); // 1h
  checks.push({
    name: "Main Agent",
    category: "agent",
    status: mainFresh.fresh ? "healthy" : "warning",
    message: mainFresh.fresh
      ? `Active — session updated ${Math.round(mainFresh.ageMs / 60000)}m ago`
      : `Idle — no session activity for ${Math.round(mainFresh.ageMs / 3600000)}h`,
    lastChecked: now,
  });

  // 5. AGENTS.md exists
  const agentsMd = await fileExists(path.join(HOME, "clawd/AGENTS.md"));
  checks.push({
    name: "Agent Instructions",
    category: "data",
    status: agentsMd ? "healthy" : "critical",
    message: agentsMd ? "AGENTS.md present" : "AGENTS.md missing — agents have no instructions",
    lastChecked: now,
  });

  // 6. Trello config
  const trelloConfig = await fileExists(path.join(HOME, "clawd/config/trello.json"));
  checks.push({
    name: "Trello Config",
    category: "infrastructure",
    status: trelloConfig ? "healthy" : "critical",
    message: trelloConfig ? "trello.json present" : "trello.json missing — no board access",
    lastChecked: now,
  });

  // 7. Skills directory
  try {
    const skillDirs = await fs.readdir(path.join(HOME, "clawd/skills"), { withFileTypes: true });
    const count = skillDirs.filter(d => d.isDirectory()).length;
    checks.push({
      name: "Skills Library",
      category: "data",
      status: count > 0 ? "healthy" : "warning",
      message: `${count} skills available`,
      lastChecked: now,
    });
  } catch {
    checks.push({
      name: "Skills Library",
      category: "data",
      status: "critical",
      message: "Skills directory missing",
      lastChecked: now,
    });
  }

  // 8. Per-agent instruction files
  const agentNames = ["coder", "designer", "artist", "marketer", "planner", "tester", "ops"];
  let agentMdCount = 0;
  for (const name of agentNames) {
    if (await fileExists(path.join(HOME, `clawd/areas/agents/${name}/AGENTS.md`))) {
      agentMdCount++;
    }
  }
  checks.push({
    name: "Agent Instruction Files",
    category: "data",
    status: agentMdCount === agentNames.length ? "healthy" : agentMdCount > 0 ? "warning" : "critical",
    message: `${agentMdCount}/${agentNames.length} agent AGENTS.md files present`,
    lastChecked: now,
  });

  // 9. Error log check (recent errors)
  try {
    const errLog = path.join(HOME, ".openclaw/logs/gateway.err.log");
    const stat = await fs.stat(errLog);
    const recentErr = Date.now() - stat.mtimeMs < 30 * 60 * 1000; // errors in last 30min
    checks.push({
      name: "Error Log",
      category: "infrastructure",
      status: recentErr ? "warning" : "healthy",
      message: recentErr
        ? `Recent errors — last error ${Math.round((Date.now() - stat.mtimeMs) / 60000)}m ago`
        : `No recent errors`,
      lastChecked: now,
    });
  } catch {
    checks.push({
      name: "Error Log",
      category: "infrastructure",
      status: "unknown",
      message: "Error log not found",
      lastChecked: now,
    });
  }

  // 10. Workspace backup freshness
  try {
    const { execSync } = await import("child_process");
    const lastCommit = execSync("cd ~/clawd && git log -1 --format=%ct 2>/dev/null", { encoding: "utf-8" }).trim();
    const ageMs = Date.now() - parseInt(lastCommit) * 1000;
    checks.push({
      name: "Workspace Backup",
      category: "infrastructure",
      status: ageMs < 6 * 60 * 60 * 1000 ? "healthy" : "warning",
      message: `Last git commit ${Math.round(ageMs / 3600000)}h ago`,
      lastChecked: now,
    });
  } catch {
    checks.push({
      name: "Workspace Backup",
      category: "infrastructure",
      status: "unknown",
      message: "Could not check git status",
      lastChecked: now,
    });
  }

  return checks;
}
