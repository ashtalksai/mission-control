import path from "path";
import os from "os";

const HOME = os.homedir();

export const PATHS = {
  agentQueue: path.join(HOME, "clawd/memory/state/agent-queue.json"),
  openclawAgents: path.join(HOME, ".openclaw/agents"),
  cronJobs: path.join(HOME, ".openclaw/cron/jobs.json"),
  gatewayLog: path.join(HOME, ".openclaw/logs/gateway.log"),
} as const;

export const AGENT_NAMES = [
  "main",
  "coder",
  "codex",
  "designer",
  "artist",
  "marketer",
  "planner",
  "tester",
  "ops",
  "claude-code",
] as const;

export const AGENT_MODELS: Record<string, string> = {
  main: "opus",
  coder: "haiku",
  codex: "codex",
  designer: "sonnet",
  artist: "sonnet",
  marketer: "haiku",
  planner: "sonnet",
  tester: "haiku",
  ops: "haiku",
  "claude-code": "opus",
};

export const POLLING_INTERVALS = {
  agents: 10_000,
  costs: 300_000,
  cron: 30_000,
} as const;
