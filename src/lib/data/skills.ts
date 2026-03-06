import fs from "fs/promises";
import path from "path";
import os from "os";

const HOME = os.homedir();
const SKILLS_DIR = path.join(HOME, "clawd/skills");

export interface Skill {
  name: string;
  description: string;
  content: string;
  path: string;
  lineCount: number;
}

function parseFrontmatter(content: string): { name: string; description: string; body: string } {
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) return { name: "", description: "", body: content };

  const frontmatter = match[1];
  const body = match[2];

  const nameMatch = frontmatter.match(/^name:\s*(.+)$/m);
  const descMatch = frontmatter.match(/^description:\s*(.+)$/m);

  return {
    name: nameMatch?.[1]?.trim() ?? "",
    description: descMatch?.[1]?.trim() ?? "",
    body: body.trim(),
  };
}

export async function getSkill(name: string): Promise<Skill | null> {
  const skillPath = path.join(SKILLS_DIR, name, "SKILL.md");
  try {
    const content = await fs.readFile(skillPath, "utf-8");
    const { name: skillName, description, body } = parseFrontmatter(content);
    return {
      name: skillName || name,
      description,
      content: body,
      path: skillPath,
      lineCount: content.split("\n").length,
    };
  } catch {
    return null;
  }
}

export async function getAllSkills(): Promise<Skill[]> {
  try {
    const dirs = await fs.readdir(SKILLS_DIR, { withFileTypes: true });
    const skillDirs = dirs.filter((d) => d.isDirectory()).map((d) => d.name);
    const skills = await Promise.all(skillDirs.map(getSkill));
    return skills.filter((s): s is Skill => s !== null).sort((a, b) => a.name.localeCompare(b.name));
  } catch {
    return [];
  }
}
