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
  "strategist",
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
  coder: "opus",
  codex: "codex",
  strategist: "sonnet",
  designer: "sonnet",
  artist: "sonnet",
  marketer: "claude-sonnet-4-6",
  planner: "sonnet",
  tester: "sonnet",
  ops: "haiku",
  "claude-code": "opus",
};

export const POLLING_INTERVALS = {
  agents: 10_000,
  costs: 300_000,
  cron: 30_000,
} as const;
