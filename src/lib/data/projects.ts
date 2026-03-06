import fs from "fs/promises";
import path from "path";
import os from "os";

const DEV_DIR = path.join(os.homedir(), "Dev");
const CACHE_TTL = 300_000; // 5 minutes in ms

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

interface CachedResult {
  data: ProjectsResponse;
  timestamp: number;
}

let cache: CachedResult | null = null;

const SKIP_DIRS = new Set(["node_modules", ".git", ".DS_Store"]);

function detectFramework(deps: Record<string, string>): string {
  if (deps["next"]) return "nextjs";
  if (deps["react"]) return "react";
  if (deps["express"] || deps["fastify"] || deps["hono"]) return "node";
  return "unknown";
}

function humanSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

async function estimateSize(dirPath: string): Promise<string> {
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    let totalBytes = 0;
    let fileCount = 0;

    for (const entry of entries) {
      if (SKIP_DIRS.has(entry.name) || entry.name.startsWith(".")) continue;
      try {
        const stat = await fs.stat(path.join(dirPath, entry.name));
        if (stat.isFile()) {
          totalBytes += stat.size;
          fileCount++;
        } else if (stat.isDirectory()) {
          // Rough estimate: count top-level dir size only, don't recurse deep
          totalBytes += stat.size;
          fileCount++;
        }
      } catch {
        // skip inaccessible entries
      }
    }

    return fileCount > 0 ? humanSize(totalBytes) : "empty";
  } catch {
    return "unknown";
  }
}

async function scanProject(dirName: string): Promise<Project | null> {
  const projectPath = path.join(DEV_DIR, dirName);

  try {
    const stat = await fs.stat(projectPath);
    if (!stat.isDirectory()) return null;
  } catch {
    return null;
  }

  let hasPackageJson = false;
  let description = "";
  let framework = "unknown";

  try {
    const pkgRaw = await fs.readFile(path.join(projectPath, "package.json"), "utf-8");
    hasPackageJson = true;
    const pkg = JSON.parse(pkgRaw);
    description = pkg.description || "";
    const allDeps = {
      ...(pkg.dependencies || {}),
      ...(pkg.devDependencies || {}),
    };
    framework = detectFramework(allDeps);
  } catch {
    // no package.json or invalid
  }

  let hasGit = false;
  try {
    const gitStat = await fs.stat(path.join(projectPath, ".git"));
    hasGit = gitStat.isDirectory();
  } catch {
    // no .git
  }

  let lastModified: string;
  try {
    const stat = await fs.stat(projectPath);
    lastModified = stat.mtime.toISOString();
  } catch {
    lastModified = new Date(0).toISOString();
  }

  const deployUrl = `https://${dirName}.ashketing.com`;
  const size = await estimateSize(projectPath);

  return {
    name: dirName,
    path: projectPath,
    hasPackageJson,
    description,
    hasGit,
    lastModified,
    deployUrl,
    healthStatus: "unknown",
    framework,
    size,
  };
}

export interface ProjectDetail extends Project {
  packageJson: Record<string, unknown> | null;
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
  scripts: Record<string, string>;
  topLevelFiles: string[];
  topLevelDirs: string[];
  pages: string[]; // app router pages or pages dir
  readme: string | null;
  envExample: string | null;
  gitRemote: string | null;
  gitBranch: string | null;
  recentCommits: string[];
}

async function readFileSafe(filePath: string): Promise<string | null> {
  try {
    return await fs.readFile(filePath, "utf-8");
  } catch {
    return null;
  }
}

async function findPages(projectPath: string): Promise<string[]> {
  const pages: string[] = [];
  // Check app router
  const appDir = path.join(projectPath, "src/app");
  const altAppDir = path.join(projectPath, "app");
  const targetDir = await fs.stat(appDir).then(() => appDir).catch(() => altAppDir);

  try {
    const scan = async (dir: string, prefix: string) => {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.name.startsWith("_") || entry.name === "api" || entry.name === "components") continue;
        if (entry.isFile() && entry.name === "page.tsx") {
          pages.push(prefix || "/");
        } else if (entry.isDirectory() && !SKIP_DIRS.has(entry.name)) {
          const segment = entry.name.startsWith("[") ? entry.name : entry.name;
          await scan(path.join(dir, entry.name), `${prefix}/${segment}`);
        }
      }
    };
    await scan(targetDir, "");
  } catch {
    // no app dir
  }
  return pages.sort();
}

async function getGitInfo(projectPath: string): Promise<{ remote: string | null; branch: string | null; commits: string[] }> {
  const result = { remote: null as string | null, branch: null as string | null, commits: [] as string[] };
  try {
    const headRef = await readFileSafe(path.join(projectPath, ".git/HEAD"));
    if (headRef) {
      const match = headRef.trim().match(/ref: refs\/heads\/(.+)/);
      result.branch = match ? match[1] : headRef.trim().slice(0, 8);
    }
  } catch { /* */ }
  try {
    const config = await readFileSafe(path.join(projectPath, ".git/config"));
    if (config) {
      const match = config.match(/url\s*=\s*(.+)/);
      result.remote = match ? match[1].trim() : null;
    }
  } catch { /* */ }
  return result;
}

export async function getProjectDetail(name: string): Promise<ProjectDetail | null> {
  const projectPath = path.join(DEV_DIR, name);
  try {
    const stat = await fs.stat(projectPath);
    if (!stat.isDirectory()) return null;
  } catch {
    return null;
  }

  const base = await scanProject(name);
  if (!base) return null;

  let packageJson: Record<string, unknown> | null = null;
  let dependencies: Record<string, string> = {};
  let devDependencies: Record<string, string> = {};
  let scripts: Record<string, string> = {};

  try {
    const raw = await fs.readFile(path.join(projectPath, "package.json"), "utf-8");
    packageJson = JSON.parse(raw);
    dependencies = (packageJson?.dependencies as Record<string, string>) ?? {};
    devDependencies = (packageJson?.devDependencies as Record<string, string>) ?? {};
    scripts = (packageJson?.scripts as Record<string, string>) ?? {};
  } catch { /* */ }

  const entries = await fs.readdir(projectPath, { withFileTypes: true });
  const topLevelFiles = entries.filter(e => e.isFile()).map(e => e.name).sort();
  const topLevelDirs = entries.filter(e => e.isDirectory() && !e.name.startsWith(".") && e.name !== "node_modules").map(e => e.name).sort();

  const pages = await findPages(projectPath);
  const readme = await readFileSafe(path.join(projectPath, "README.md"));
  const envExample = await readFileSafe(path.join(projectPath, ".env.example")) ??
                     await readFileSafe(path.join(projectPath, ".env.local.example"));

  const gitInfo = await getGitInfo(projectPath);

  return {
    ...base,
    packageJson,
    dependencies,
    devDependencies,
    scripts,
    topLevelFiles,
    topLevelDirs,
    pages,
    readme,
    envExample,
    gitRemote: gitInfo.remote,
    gitBranch: gitInfo.branch,
    recentCommits: gitInfo.commits,
  };
}

export async function getProjects(): Promise<ProjectsResponse> {
  if (cache && Date.now() - cache.timestamp < CACHE_TTL) {
    return cache.data;
  }

  const entries = await fs.readdir(DEV_DIR, { withFileTypes: true });
  const dirNames = entries
    .filter((e) => e.isDirectory() && !e.name.startsWith("."))
    .map((e) => e.name);

  const results = await Promise.all(dirNames.map(scanProject));
  const projects = results
    .filter((p): p is Project => p !== null)
    .sort((a, b) => new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime());

  const deployedCount = projects.filter((p) => p.deployUrl !== null).length;

  const frameworkBreakdown: Record<string, number> = {};
  for (const p of projects) {
    frameworkBreakdown[p.framework] = (frameworkBreakdown[p.framework] ?? 0) + 1;
  }

  const data: ProjectsResponse = {
    projects,
    totalCount: projects.length,
    deployedCount,
    frameworkBreakdown,
  };

  cache = { data, timestamp: Date.now() };
  return data;
}
