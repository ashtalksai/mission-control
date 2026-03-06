import fs from "fs/promises";
import path from "path";
import os from "os";
import readline from "readline";
import { createReadStream } from "fs";

const HOME = os.homedir();
const GATEWAY_LOG = path.join(HOME, ".openclaw/logs/gateway.log");
const GATEWAY_ERR_LOG = path.join(HOME, ".openclaw/logs/gateway.err.log");
const CRON_RUNS_DIR = path.join(HOME, ".openclaw/cron/runs");
const CRON_JOBS_PATH = path.join(HOME, ".openclaw/cron/jobs.json");

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

// ISO timestamp pattern at start of line: 2026-03-06T13:52:54.843+01:00
const ISO_TS_RE = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[\d.]*(?:[+-]\d{2}:\d{2}|Z))\s+(.*)/;
// [ws] style timestamp: 2026-03-06T12:54:10.191Z [ws]
const WS_TS_RE = /^(\d{4}-\d{2}-\d{2}T[\d:.]+Z)\s+\[(\w+)\]\s*(.*)/;

function parseGatewayLine(line: string): LogEntry | null {
  if (!line.trim()) return null;

  let timestamp = "";
  let source = "gateway";
  let message = line;
  let level: LogEntry["level"] = "info";

  // Try ISO timestamp at start
  const isoMatch = line.match(ISO_TS_RE);
  if (isoMatch) {
    timestamp = isoMatch[1];
    message = isoMatch[2];
  }

  // Try [ws] style
  const wsMatch = line.match(WS_TS_RE);
  if (wsMatch) {
    timestamp = wsMatch[1];
    source = wsMatch[2];
    message = wsMatch[3];
  }

  // Extract [source] from message
  const bracketMatch = message.match(/^\[(\w+)\]\s*(.*)/);
  if (bracketMatch) {
    source = bracketMatch[1];
    message = bracketMatch[2];
  }

  // Detect level
  if (message.toLowerCase().includes("[error]") || message.toLowerCase().includes("error") || message.toLowerCase().includes("fail")) level = "error";
  else if (message.toLowerCase().includes("[warn]") || message.toLowerCase().includes("warn")) level = "warn";

  // Skip noise lines (config dumps, bind, etc)
  if (!timestamp && /^(Bind:|Config:|Source:|Gateway target:)/.test(line)) return null;

  return { timestamp, level, source, message, raw: line };
}

// Group multi-line log entries together
function groupGatewayLines(lines: string[]): LogEntry[] {
  const entries: LogEntry[] = [];
  let current: LogEntry | null = null;

  for (const line of lines) {
    const hasTimestamp = ISO_TS_RE.test(line) || WS_TS_RE.test(line);
    const isContinuation = !hasTimestamp && !line.startsWith("[") && current;

    if (isContinuation && current) {
      // Append to current entry
      current.message += "\n" + line;
      current.raw += "\n" + line;
    } else {
      const entry = parseGatewayLine(line);
      if (entry) {
        if (current) entries.push(current);
        current = entry;
      }
    }
  }
  if (current) entries.push(current);

  return entries;
}

export async function getGatewayLogs(lines: number = 200): Promise<LogEntry[]> {
  try {
    const content = await fs.readFile(GATEWAY_LOG, "utf-8");
    const allLines = content.split("\n").filter(Boolean);
    const recentLines = allLines.slice(-lines * 2); // grab extra for multi-line grouping
    const entries = groupGatewayLines(recentLines);
    return entries.slice(-lines);
  } catch {
    return [];
  }
}

export async function getErrorLogs(lines: number = 100): Promise<LogEntry[]> {
  try {
    const content = await fs.readFile(GATEWAY_ERR_LOG, "utf-8");
    const allLines = content.split("\n").filter(Boolean);
    const recentLines = allLines.slice(-lines);
    return recentLines.map((line) => ({
      timestamp: "",
      level: "error" as const,
      source: "error",
      message: line,
      raw: line,
    }));
  } catch {
    return [];
  }
}

async function getJobNameMap(): Promise<Map<string, string>> {
  try {
    const raw = await fs.readFile(CRON_JOBS_PATH, "utf-8");
    const data = JSON.parse(raw) as { jobs: { id: string; name: string }[] };
    const map = new Map<string, string>();
    for (const job of data.jobs) {
      map.set(job.id, job.name);
    }
    return map;
  } catch {
    return new Map();
  }
}

export async function getCronRunHistory(limit: number = 200): Promise<CronRun[]> {
  try {
    const jobNameMap = await getJobNameMap();
    const files = await fs.readdir(CRON_RUNS_DIR);
    const jsonlFiles = files.filter((f) => f.endsWith(".jsonl"));

    const allRuns: CronRun[] = [];

    await Promise.all(
      jsonlFiles.map(async (file) => {
        const filePath = path.join(CRON_RUNS_DIR, file);
        try {
          const stream = createReadStream(filePath, { encoding: "utf-8" });
          const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });
          for await (const line of rl) {
            try {
              const entry = JSON.parse(line);
              if (entry.action === "finished" || entry.action === "error") {
                allRuns.push({
                  ts: entry.ts,
                  jobId: entry.jobId,
                  jobName: jobNameMap.get(entry.jobId) ?? entry.jobId.slice(0, 8),
                  action: entry.action,
                  status: entry.status ?? "unknown",
                  summary: entry.summary ?? "",
                  durationMs: entry.durationMs ?? 0,
                  runAtMs: entry.runAtMs ?? entry.ts,
                });
              }
            } catch { /* skip malformed */ }
          }
        } catch { /* skip unreadable */ }
      })
    );

    allRuns.sort((a, b) => b.ts - a.ts);
    return allRuns.slice(0, limit);
  } catch {
    return [];
  }
}
