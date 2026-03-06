import fs from "fs/promises";
import { PATHS } from "../constants";
import type { CronJob, CronStatusResponse } from "../types";

export async function getCronStatus(): Promise<CronStatusResponse> {
  try {
    const raw = await fs.readFile(PATHS.cronJobs, "utf-8");
    const data = JSON.parse(raw) as { jobs: CronJob[] };
    const jobs = data.jobs;

    const now = Date.now();

    // Sort by next run for upcoming
    const upcoming = jobs
      .filter((j) => j.enabled && j.state.nextRunAtMs > now)
      .sort((a, b) => a.state.nextRunAtMs - b.state.nextRunAtMs)
      .slice(0, 5);

    // Sort by last run for recent
    const recent = jobs
      .filter((j) => j.state.lastRunAtMs > 0)
      .sort((a, b) => b.state.lastRunAtMs - a.state.lastRunAtMs)
      .slice(0, 5);

    return { jobs, upcoming, recent };
  } catch {
    return { jobs: [], upcoming: [], recent: [] };
  }
}
