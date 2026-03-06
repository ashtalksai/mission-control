import fs from "fs/promises";
import path from "path";
import os from "os";
import readline from "readline";
import { createReadStream } from "fs";

const ERR_LOG = path.join(os.homedir(), ".openclaw/logs/gateway.err.log");

export interface HourlyRateLimit {
  hour: string; // "2026-03-06T14" format
  count: number;
}

export interface ErrorType {
  type: string; // "rate_limit" | "overloaded" | "telegram" | "tool_failed" | "diagnostic" | "other"
  count: number;
  lastSeen: string;
}

export interface RateLimitResponse {
  totalRateLimits: number;
  todayRateLimits: number;
  hourlyTrend: HourlyRateLimit[]; // last 48 hours
  errorBreakdown: ErrorType[];
  recentErrors: { timestamp: string; message: string; type: string }[]; // last 20 non-rate-limit errors
  lastChecked: string;
}

interface CacheEntry {
  timestamp: number;
  data: RateLimitResponse;
}

let cache: CacheEntry | null = null;
const CACHE_TTL = 60_000; // 60 seconds

const SKIP_PATTERNS = ["EXTERNAL_UNTRUSTED", "DO NOT", "<<<"];

function classifyLine(line: string): string {
  const lower = line.toLowerCase();
  if (lower.includes("rate limit")) return "rate_limit";
  if (lower.includes("overloaded")) return "overloaded";
  if (line.includes("[telegram]")) return "telegram";
  if (line.includes("[tools]")) return "tool_failed";
  if (line.includes("[diagnostic]")) return "diagnostic";
  return "other";
}

function extractTimestamp(line: string): string | null {
  // Match ISO timestamps at the start or within brackets
  const match = line.match(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  return match ? match[0] : null;
}

async function parseErrorLog(): Promise<RateLimitResponse> {
  const now = new Date();
  const cutoff = new Date(now.getTime() - 48 * 60 * 60 * 1000);
  const cutoffStr = cutoff.toISOString().slice(0, 13);
  const todayStr = now.toISOString().slice(0, 10);

  let totalRateLimits = 0;
  let todayRateLimits = 0;
  const hourlyMap = new Map<string, number>();
  const errorTypeMap = new Map<string, { count: number; lastSeen: string }>();
  const recentErrors: { timestamp: string; message: string; type: string }[] = [];

  try {
    await fs.access(ERR_LOG);
  } catch {
    return {
      totalRateLimits: 0,
      todayRateLimits: 0,
      hourlyTrend: [],
      errorBreakdown: [],
      recentErrors: [],
      lastChecked: now.toISOString(),
    };
  }

  const stream = createReadStream(ERR_LOG, { encoding: "utf-8" });
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });

  for await (const line of rl) {
    // Skip SECURITY NOTICE multi-line block content
    if (SKIP_PATTERNS.some((p) => line.includes(p))) continue;

    const ts = extractTimestamp(line);
    if (!ts) continue;

    const hour = ts.slice(0, 13); // "2026-03-06T14"
    const day = ts.slice(0, 10); // "2026-03-06"

    // Only process lines within the last 48 hours
    if (hour < cutoffStr) continue;

    const type = classifyLine(line);

    // Track error type breakdown
    const existing = errorTypeMap.get(type);
    if (existing) {
      existing.count++;
      if (ts > existing.lastSeen) existing.lastSeen = ts;
    } else {
      errorTypeMap.set(type, { count: 1, lastSeen: ts });
    }

    if (type === "rate_limit") {
      totalRateLimits++;
      hourlyMap.set(hour, (hourlyMap.get(hour) ?? 0) + 1);
      if (day === todayStr) todayRateLimits++;
    } else {
      // Keep track of recent non-rate-limit errors (keep last 20)
      const truncated = line.length > 200 ? line.slice(0, 200) + "..." : line;
      recentErrors.push({ timestamp: ts, message: truncated, type });
      if (recentErrors.length > 20) recentErrors.shift();
    }
  }

  // Build hourly trend sorted by hour
  const hourlyTrend = Array.from(hourlyMap.entries())
    .map(([hour, count]) => ({ hour, count }))
    .sort((a, b) => a.hour.localeCompare(b.hour));

  // Build error breakdown sorted by count desc
  const errorBreakdown = Array.from(errorTypeMap.entries())
    .map(([type, { count, lastSeen }]) => ({ type, count, lastSeen }))
    .sort((a, b) => b.count - a.count);

  return {
    totalRateLimits,
    todayRateLimits,
    hourlyTrend,
    errorBreakdown,
    recentErrors,
    lastChecked: now.toISOString(),
  };
}

export async function getRateLimitData(): Promise<RateLimitResponse> {
  const now = Date.now();
  if (cache && now - cache.timestamp < CACHE_TTL) {
    return cache.data;
  }

  const data = await parseErrorLog();
  cache = { timestamp: now, data };
  return data;
}
