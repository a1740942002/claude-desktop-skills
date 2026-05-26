import { readdirSync, readFileSync, statSync } from "fs";
import { join, basename } from "path";
import matter from "gray-matter";
import { SKILL_FILENAME, EXCLUDED_DIRS } from "../constants.js";
import type { SkillMeta } from "../types.js";

export function parseFrontmatter(content: string): {
  name: string | null;
  description: string | null;
} {
  try {
    const { data } = matter(content);
    return {
      name: data.name ?? null,
      description: data.description ?? null,
    };
  } catch {
    return { name: null, description: null };
  }
}

function firstParagraph(content: string): string {
  const stripped = content.replace(/^---[\s\S]*?---\n*/, "");
  const lines = stripped.split("\n");
  const paragraphLines: string[] = [];
  let started = false;
  for (const line of lines) {
    const trimmed = line.trim();
    if (!started) {
      if (trimmed && !trimmed.startsWith("#")) {
        started = true;
        paragraphLines.push(trimmed);
      }
    } else {
      if (!trimmed) break;
      paragraphLines.push(trimmed);
    }
  }
  const text = paragraphLines.join(" ");
  return text.length > 200 ? text.slice(0, 200) + "…" : text;
}

export function scanSkills(repoDir: string, maxDepth = 3): SkillMeta[] {
  const skills: SkillMeta[] = [];

  function walk(dir: string, depth: number) {
    if (depth > maxDepth) return;

    let entries: string[];
    try {
      entries = readdirSync(dir);
    } catch {
      return;
    }

    if (entries.includes(SKILL_FILENAME)) {
      const dirName = basename(dir);
      if (EXCLUDED_DIRS.has(dirName)) return;

      const skillPath = join(dir, SKILL_FILENAME);
      const content = readFileSync(skillPath, "utf-8");
      const { name, description } = parseFrontmatter(content);

      const files = entries.filter((e) => {
        const full = join(dir, e);
        try {
          return statSync(full).isFile();
        } catch {
          return false;
        }
      });

      skills.push({
        name: name ?? dirName,
        description: description ?? (firstParagraph(content) || `Skill from ${dirName}`),
        files,
      });
      return;
    }

    for (const entry of entries) {
      if (EXCLUDED_DIRS.has(entry)) continue;
      const full = join(dir, entry);
      try {
        if (statSync(full).isDirectory()) {
          walk(full, depth + 1);
        }
      } catch {
        continue;
      }
    }
  }

  walk(repoDir, 0);
  return skills;
}

export function findSkillDir(
  dir: string,
  skillName: string,
  maxDepth = 3,
  depth = 0
): string | null {
  if (depth > maxDepth) return null;

  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return null;
  }

  if (entries.includes(SKILL_FILENAME)) {
    if (basename(dir) === skillName) return dir;
    const content = readFileSync(join(dir, SKILL_FILENAME), "utf-8");
    const { name } = parseFrontmatter(content);
    if (name === skillName) return dir;
  }

  for (const entry of entries) {
    if (EXCLUDED_DIRS.has(entry)) continue;
    const full = join(dir, entry);
    try {
      if (statSync(full).isDirectory()) {
        const result = findSkillDir(full, skillName, maxDepth, depth + 1);
        if (result) return result;
      }
    } catch {
      continue;
    }
  }

  return null;
}
