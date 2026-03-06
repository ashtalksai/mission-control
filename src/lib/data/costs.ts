import fs from "fs/promises";
import path from "path";
import readline from "readline";
import { createReadStream } from "fs";
import { PATHS, AGENT_NAMES } from "../constants";
import type { CostEntry, CostSummary } from "../types";

interface CacheEntry {
  mtime: number;
  costs: CostEntry[];
}

const mtimeCache = new Map<string, CacheEntry>();

async function parseJsonlCosts(filePath: string, agentName: string): Promise<CostEntry[]> {
  try {
    const stat = await fs.stat(filePath);
    const cached = mtimeCache.get(filePath);
    if (cached && cached.mtime === stat.mtimeMs) {
      return cached.costs;
    }

    const costs: CostEntry[] = [];
    const stream = createReadStream(filePath, { encoding: "utf-8" });
    const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });

    for await (const line of rl) {
      if (!line.includes('"cost"')) continue;
      try {
        const entry = JSON.parse(line);
        if (entry.type === "message" && entry.message?.usage?.cost?.total > 0) {
          costs.push({
            timestamp: entry.timestamp || entry.message?.timestamp || "",
            agent: agentName,
            model: entry.message?.model || "unknown",
            cost: entry.message.usage.cost.total,
            inputTokens: entry.message.usage.input || 0,
            outputTokens: entry.message.usage.output || 0,
            cacheRead: entry.message.usage.cacheRead || 0,
            cacheWrite: entry.message.usage.cacheWrite || 0,
          });
        }
      } catch {
        // skip malformed lines
      }
    }

    mtimeCache.set(filePath, { mtime: stat.mtimeMs, costs });
    return costs;
  } catch {
    return [];
  }
}

async function getJsonlFiles(agentName: string): Promise<string[]> {
  const sessionsDir = path.join(PATHS.openclawAgents, agentName, "sessions");
  try {
    const files = await fs.readdir(sessionsDir);
    return files
      .filter((f) => f.endsWith(".jsonl") && !f.includes(".deleted"))
      .map((f) => path.join(sessionsDir, f));
  } catch {
    return [];
  }
}

export async function getCostSummary(): Promise<CostSummary> {
  const allCosts: CostEntry[] = [];

  await Promise.all(
    AGENT_NAMES.map(async (agent) => {
      const files = await getJsonlFiles(agent);
      const results = await Promise.all(files.map((f) => parseJsonlCosts(f, agent)));
      allCosts.push(...results.flat());
    })
  );

  // Sort by timestamp desc
  allCosts.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const now = new Date();
  const todayStr = now.toISOString().split("T")[0];
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const totalToday = allCosts
    .filter((c) => c.timestamp.startsWith(todayStr))
    .reduce((sum, c) => sum + c.cost, 0);

  const totalWeek = allCosts
    .filter((c) => new Date(c.timestamp) >= weekAgo)
    .reduce((sum, c) => sum + c.cost, 0);

  const totalMonth = allCosts
    .filter((c) => new Date(c.timestamp) >= monthAgo)
    .reduce((sum, c) => sum + c.cost, 0);

  // By day (last 30 days)
  const byDayMap = new Map<string, number>();
  for (const c of allCosts) {
    if (new Date(c.timestamp) < monthAgo) continue;
    const day = c.timestamp.split("T")[0];
    byDayMap.set(day, (byDayMap.get(day) ?? 0) + c.cost);
  }
  const byDay = Array.from(byDayMap.entries())
    .map(([date, cost]) => ({ date, cost }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // By agent
  const byAgentMap = new Map<string, number>();
  for (const c of allCosts) {
    if (new Date(c.timestamp) < monthAgo) continue;
    byAgentMap.set(c.agent, (byAgentMap.get(c.agent) ?? 0) + c.cost);
  }
  const byAgent = Array.from(byAgentMap.entries())
    .map(([agent, cost]) => ({ agent, cost }))
    .sort((a, b) => b.cost - a.cost);

  // By model
  const byModelMap = new Map<string, number>();
  for (const c of allCosts) {
    if (new Date(c.timestamp) < monthAgo) continue;
    byModelMap.set(c.model, (byModelMap.get(c.model) ?? 0) + c.cost);
  }
  const byModel = Array.from(byModelMap.entries())
    .map(([model, cost]) => ({ model, cost }))
    .sort((a, b) => b.cost - a.cost);

  return {
    totalToday,
    totalWeek,
    totalMonth,
    byDay,
    byAgent,
    byModel,
    entries: allCosts.slice(0, 500),
  };
}
