// Data layer for Trello pipeline state
import fs from "fs/promises";
import path from "path";
import os from "os";

const CONFIG_PATH = path.join(os.homedir(), "clawd/config/trello.json");

interface TrelloConfig {
  key: string;
  token: string;
  boards: {
    jarvis_hq: {
      id: string;
      lists: Record<string, string>;
      labels: Record<string, string>;
    };
  };
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

const TRELLO_LISTS = ["doing", "backlog", "review", "done"] as const;
const CACHE_TTL_MS = 60_000;

let configCache: TrelloConfig | null = null;
let pipelineCache: { data: PipelineResponse; timestamp: number } | null = null;

async function loadConfig(): Promise<TrelloConfig> {
  if (configCache) return configCache;
  const raw = await fs.readFile(CONFIG_PATH, "utf-8");
  configCache = JSON.parse(raw) as TrelloConfig;
  return configCache;
}

interface TrelloChecklistItem {
  state: "complete" | "incomplete";
  name: string;
}

interface TrelloChecklist {
  checkItems: TrelloChecklistItem[];
}

interface TrelloLabel {
  name: string;
}

interface TrelloCardRaw {
  id: string;
  name: string;
  labels: TrelloLabel[];
  dateLastActivity: string;
  url: string;
  checklists: TrelloChecklist[];
}

function parseCard(card: TrelloCardRaw, listName: string): PipelineCard {
  const labels = card.labels.map((l) => l.name);
  const agentLabel = labels.find((l) => l.startsWith("@")) ?? null;

  // Aggregate all checklist items for pipeline progress
  const allItems = card.checklists.flatMap((cl) => cl.checkItems);
  const pipelineTotal = allItems.length;
  const pipelineDone = allItems.filter((i) => i.state === "complete").length;

  // Current stage = first incomplete checklist item
  const firstIncomplete = allItems.find((i) => i.state === "incomplete");
  const currentStage = firstIncomplete?.name ?? null;

  return {
    id: card.id,
    name: card.name,
    list: listName,
    labels,
    agentLabel,
    lastActivity: card.dateLastActivity,
    pipelineTotal,
    pipelineDone,
    currentStage,
    url: card.url,
  };
}

async function fetchListCards(
  listId: string,
  listName: string,
  key: string,
  token: string
): Promise<PipelineCard[]> {
  const url = `https://api.trello.com/1/lists/${listId}/cards?key=${key}&token=${token}&fields=name,labels,dateLastActivity,url&checklists=all`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Trello API error for list ${listName}: ${res.status} ${res.statusText}`);
  }
  const cards: TrelloCardRaw[] = await res.json();
  return cards.map((c) => parseCard(c, listName));
}

export async function getPipelineData(): Promise<PipelineResponse> {
  // Return cached data if fresh
  if (pipelineCache && Date.now() - pipelineCache.timestamp < CACHE_TTL_MS) {
    return pipelineCache.data;
  }

  const config = await loadConfig();
  const { key, token } = config;
  const { lists } = config.boards.jarvis_hq;

  const results = await Promise.all(
    TRELLO_LISTS.map((listName) =>
      fetchListCards(lists[listName], listName, key, token)
    )
  );

  const [doing, backlog, review, done] = results;

  const data: PipelineResponse = {
    doing,
    backlog,
    review,
    done,
    totalCards: results.reduce((sum, r) => sum + r.length, 0),
  };

  pipelineCache = { data, timestamp: Date.now() };
  return data;
}
