export interface AgentStatus {
  name: string;
  model: string;
  status: "active" | "idle";
  lastActivity: string | null;
  sessionCount: number;
  isCurrentAgent: boolean;
  currentCard?: string;
  currentNote?: string;
}

export interface AgentQueueData {
  active_agent: string;
  active_card_id: string;
  active_since: string;
  last_update: string;
  last_session: string;
  note: string;
  today_date: string;
  today_pipeline_count: number;
  queue: unknown[];
  paused_cards: unknown[];
}

export interface SessionEntry {
  sessionId: string;
  updatedAt: number;
  systemSent?: boolean;
  deliveryContext?: { channel: string; to: string };
  lastChannel?: string;
}

export interface CronJob {
  id: string;
  name: string;
  enabled: boolean;
  schedule: { kind: string; expr: string };
  sessionTarget: string;
  wakeMode: string;
  payload: { kind: string; text: string };
  state: {
    nextRunAtMs: number;
    lastRunAtMs: number;
    lastStatus: string;
    lastDurationMs: number;
    lastRunStatus: string;
    consecutiveErrors: number;
  };
}

export interface CronStatusResponse {
  jobs: CronJob[];
  upcoming: CronJob[];
  recent: CronJob[];
}

export interface CostEntry {
  timestamp: string;
  agent: string;
  model: string;
  cost: number;
  inputTokens: number;
  outputTokens: number;
  cacheRead: number;
  cacheWrite: number;
}

export interface CostSummary {
  totalToday: number;
  totalWeek: number;
  totalMonth: number;
  byDay: { date: string; cost: number }[];
  byAgent: { agent: string; cost: number }[];
  byModel: { model: string; cost: number }[];
  entries: CostEntry[];
}

export interface AgentStatusResponse {
  agents: AgentStatus[];
  activeAgent: string;
  activeNote: string;
  activeCardId: string;
  activeSince: string;
  todayPipelineCount: number;
}

export interface AgentProfile {
  name: string;
  label: string;
  role: string;
  stages: string;
  model: string;
  skills: string[];
  instructions: string;
  instructionsPath: string;
  lineCount: number;
}

export interface Skill {
  name: string;
  description: string;
  content: string;
  path: string;
  lineCount: number;
}

export interface LogEntry {
  timestamp: string;
  level: "info" | "warn" | "error" | "debug";
  source: string;
  message: string;
  raw: string;
}

export interface CronRun {
  ts: number;
  jobId: string;
  jobName?: string;
  action: string;
  status: string;
  summary: string;
  durationMs: number;
  runAtMs: number;
}

export interface HealthCheck {
  name: string;
  category: "agent" | "cron" | "infrastructure" | "data";
  status: "healthy" | "warning" | "critical" | "unknown";
  message: string;
  lastChecked: string;
}

export interface PipelineCard {
  id: string;
  name: string;
  list: string;
  labels: string[];
  agentLabel: string | null;
  lastActivity: string;
  pipelineTotal: number;
  pipelineDone: number;
  currentStage: string | null;
  url: string;
}

export interface PipelineResponse {
  doing: PipelineCard[];
  backlog: PipelineCard[];
  review: PipelineCard[];
  done: PipelineCard[];
  totalCards: number;
}

export interface Project {
  name: string;
  path: string;
  hasPackageJson: boolean;
  description: string;
  hasGit: boolean;
  lastModified: string;
  deployUrl: string | null;
  healthStatus: "healthy" | "unhealthy" | "unknown";
  framework: string;
  size: string;
}

export interface ProjectsResponse {
  projects: Project[];
  totalCount: number;
  deployedCount: number;
  frameworkBreakdown: Record<string, number>;
}

export interface ContainerInfo {
  name: string;
  image: string;
  status: string;
  memory: string;
  uptime: string;
}

export interface ServerHealth {
  disk: {
    total: string;
    used: string;
    available: string;
    usagePercent: number;
  };
  memory: {
    total: number;
    used: number;
    available: number;
    usagePercent: number;
  };
  containers: {
    total: number;
    running: number;
    list: ContainerInfo[];
  };
  uptime: string;
  lastChecked: string;
  error?: string;
}

export interface HourlyRateLimit {
  hour: string;
  count: number;
}

export interface ErrorType {
  type: string;
  count: number;
  lastSeen: string;
}

export interface RateLimitResponse {
  totalRateLimits: number;
  todayRateLimits: number;
  hourlyTrend: HourlyRateLimit[];
  errorBreakdown: ErrorType[];
  recentErrors: { timestamp: string; message: string; type: string }[];
  lastChecked: string;
}
