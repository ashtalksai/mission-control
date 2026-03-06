import fs from "fs/promises";
import path from "path";
import { PATHS, AGENT_NAMES, AGENT_MODELS } from "../constants";
import type { AgentQueueData, AgentStatus, AgentStatusResponse } from "../types";

async function readJson<T>(filePath: string): Promise<T | null> {
  try {
    const raw = await fs.readFile(filePath, "utf-8");
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

interface SubagentSession {
  updatedAt: number;
  label?: string;
  modelOverride?: string;
  spawnedBy?: string;
  spawnDepth?: number;
}

interface SessionEntry {
  sessionId: string;
  updatedAt: number;
  label?: string;
  modelOverride?: string;
  spawnedBy?: string;
  spawnDepth?: number;
}

async function getAgentLastActivity(agentName: string): Promise<{ lastActivity: string | null; sessionCount: number }> {
  const sessionsPath = path.join(PATHS.openclawAgents, agentName, "sessions", "sessions.json");
  const sessions = await readJson<Record<string, SessionEntry>>(sessionsPath);
  if (!sessions) return { lastActivity: null, sessionCount: 0 };

  const entries = Object.values(sessions);
  const sessionCount = entries.length;
  if (sessionCount === 0) return { lastActivity: null, sessionCount: 0 };

  const latest = entries.reduce((max, e) => (e.updatedAt > max.updatedAt ? e : max), entries[0]);
  return {
    lastActivity: new Date(latest.updatedAt).toISOString(),
    sessionCount,
  };
}

// Subagent sessions live under main's sessions.json with keys like "agent:main:subagent:*"
// They have labels like "coder-succession-healthfix" or "ops-succession-reverify"
async function getSubagentActivity(): Promise<Map<string, { lastActivity: string; sessionCount: number; lastLabel: string; lastModel: string }>> {
  const sessionsPath = path.join(PATHS.openclawAgents, "main", "sessions", "sessions.json");
  const sessions = await readJson<Record<string, SubagentSession>>(sessionsPath);
  if (!sessions) return new Map();

  const agentMap = new Map<string, { lastActivity: string; sessionCount: number; lastLabel: string; lastModel: string }>();

  for (const [key, session] of Object.entries(sessions)) {
    if (!key.startsWith("agent:main:subagent:")) continue;

    // Extract agent name from label (e.g. "coder-succession-healthfix" -> "coder")
    const label = session.label ?? "";
    const agentName = label.split("-")[0];
    if (!agentName) continue;

    const existing = agentMap.get(agentName);
    const count = (existing?.sessionCount ?? 0) + 1;
    const ts = session.updatedAt;

    if (!existing || ts > new Date(existing.lastActivity).getTime()) {
      agentMap.set(agentName, {
        lastActivity: new Date(ts).toISOString(),
        sessionCount: count,
        lastLabel: label,
        lastModel: session.modelOverride ?? "",
      });
    } else {
      agentMap.set(agentName, { ...existing, sessionCount: count });
    }
  }

  return agentMap;
}

export async function getAgentStatus(): Promise<AgentStatusResponse> {
  const queue = await readJson<AgentQueueData>(PATHS.agentQueue);
  const activeAgentName = queue?.active_agent?.replace("@", "") ?? "";

  // Get both direct sessions and subagent sessions from main
  const subagentActivity = await getSubagentActivity();

  const agents: AgentStatus[] = await Promise.all(
    AGENT_NAMES.map(async (name) => {
      const direct = await getAgentLastActivity(name);
      const sub = subagentActivity.get(name);

      // Use whichever is more recent: direct session or subagent session
      let lastActivity = direct.lastActivity;
      let sessionCount = direct.sessionCount;

      if (sub) {
        sessionCount += sub.sessionCount;
        const directTs = lastActivity ? new Date(lastActivity).getTime() : 0;
        const subTs = new Date(sub.lastActivity).getTime();
        if (subTs > directTs) {
          lastActivity = sub.lastActivity;
        }
      }

      const isActive = name === activeAgentName;
      const fifteenMinAgo = Date.now() - 15 * 60 * 1000;
      const lastTs = lastActivity ? new Date(lastActivity).getTime() : 0;

      return {
        name,
        model: sub?.lastModel || (AGENT_MODELS[name] ?? "unknown"),
        status: (isActive || lastTs > fifteenMinAgo ? "active" : "idle") as "active" | "idle",
        lastActivity,
        sessionCount,
        isCurrentAgent: isActive,
        currentCard: isActive ? queue?.active_card_id : undefined,
        currentNote: isActive ? queue?.note : undefined,
      };
    })
  );

  return {
    agents,
    activeAgent: activeAgentName,
    activeNote: queue?.note ?? "",
    activeCardId: queue?.active_card_id ?? "",
    activeSince: queue?.active_since ?? "",
    todayPipelineCount: queue?.today_pipeline_count ?? 0,
  };
}
