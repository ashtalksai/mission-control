import { execSync } from "child_process";

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
  cpu: {
    usagePercent: number;
    cores: number;
    loadAvg: string;
  };
  containers: {
    total: number;
    running: number;
    list: ContainerInfo[];
  };
  uptime: string;
  lastChecked: string;
}

let cache: { data: ServerHealth; timestamp: number } | null = null;
const CACHE_TTL = 120_000; // 2 minutes

function ssh(command: string): string {
  return execSync(`ssh ash-server '${command}'`, {
    timeout: 10_000,
    encoding: "utf-8",
  }).trim();
}

function parseDisk(): ServerHealth["disk"] {
  const line = ssh("df -h / | tail -1");
  // Format: filesystem  size  used  avail  use%  mount
  const parts = line.split(/\s+/);
  return {
    total: parts[1],
    used: parts[2],
    available: parts[3],
    usagePercent: parseInt(parts[4], 10) || 0,
  };
}

function parseMemory(): ServerHealth["memory"] {
  const line = ssh("free -m | grep Mem");
  // Format: Mem:  total  used  free  shared  buff/cache  available
  const parts = line.split(/\s+/);
  const total = parseInt(parts[1], 10) || 0;
  const used = parseInt(parts[2], 10) || 0;
  const available = parseInt(parts[6], 10) || 0;
  return {
    total,
    used,
    available,
    usagePercent: total > 0 ? Math.round((used / total) * 100) : 0,
  };
}

function parseContainers(): ServerHealth["containers"] {
  let output: string;
  try {
    output = ssh(
      'docker ps --format "{{.Names}}\\t{{.Image}}\\t{{.Status}}\\t{{.Size}}"'
    );
  } catch {
    return { total: 0, running: 0, list: [] };
  }

  if (!output) {
    return { total: 0, running: 0, list: [] };
  }

  const lines = output.split("\n").filter(Boolean);
  const list: ContainerInfo[] = lines.map((line) => {
    const [name, image, status, size] = line.split("\t");
    // Extract uptime from status (e.g. "Up 2 days" -> "2 days ago")
    const uptimeMatch = status?.match(/Up\s+(.+)/);
    return {
      name: name || "unknown",
      image: image || "unknown",
      status: status || "unknown",
      memory: size || "N/A",
      uptime: uptimeMatch ? uptimeMatch[1] : status || "unknown",
    };
  });

  return {
    total: list.length,
    running: list.length, // docker ps only shows running containers
    list,
  };
}

function parseCpu(): ServerHealth["cpu"] {
  try {
    const cores = parseInt(ssh("nproc"), 10) || 1;
    const loadLine = ssh("cat /proc/loadavg");
    const loadParts = loadLine.split(/\s+/);
    const loadAvg = loadParts.slice(0, 3).join(", ");
    // Derive usage from 1-min load avg vs cores
    const load1m = parseFloat(loadParts[0]) || 0;
    const usagePercent = Math.min(100, Math.round((load1m / cores) * 100));
    return { usagePercent, cores, loadAvg };
  } catch {
    return { usagePercent: 0, cores: 0, loadAvg: "N/A" };
  }
}

function parseUptime(): string {
  try {
    return ssh("uptime -p");
  } catch {
    return "unknown";
  }
}

export async function getServerHealth(): Promise<ServerHealth> {
  if (cache && Date.now() - cache.timestamp < CACHE_TTL) {
    return cache.data;
  }

  try {
    const data: ServerHealth = {
      disk: parseDisk(),
      memory: parseMemory(),
      cpu: parseCpu(),
      containers: parseContainers(),
      uptime: parseUptime(),
      lastChecked: new Date().toISOString(),
    };

    cache = { data, timestamp: Date.now() };
    return data;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown SSH error";
    throw new Error(`Failed to fetch server health: ${message}`);
  }
}
