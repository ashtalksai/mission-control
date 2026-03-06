export const POLLING_INTERVALS = {
  agents: 10_000,
  costs: 300_000,
  cron: 30_000,
  logs: 30_000,
  health: 60_000,
  skills: 300_000,
  agentProfiles: 60_000,
  pipeline: 60_000,
  projects: 300_000,
  serverHealth: 120_000,
  ratelimits: 60_000,
} as const;
