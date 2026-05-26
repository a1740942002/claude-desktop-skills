import { tmpdir } from "os";
import { join } from "path";
import { mkdtempSync, readdirSync, readFileSync, statSync, rmSync } from "fs";
import { simpleGit } from "simple-git";
import matter from "gray-matter";
import { SKILL_FILENAME, EXCLUDED_DIRS } from "../constants.js";
import type { SkillMeta } from "../types.js";

export interface RepoInfo {
  owner: string;
  repo: string;
  branch: string;
  commitSha: string;
}

export interface ClonedRepo {
  localPath: string;
  info: RepoInfo;
  cleanup: () => void;
}

export function parseRepoId(input: string): { owner: string; repo: string } {
  const cleaned = input.replace(/\/+$/, "");
  const parts = cleaned.split("/");
  if (parts.length < 2 || !parts[0] || !parts[1]) {
    throw new Error(
      `Invalid repo format: "${input}". Expected "owner/repo" (e.g., "getagentseal/founder-playbook").`
    );
  }
  return { owner: parts[0], repo: parts[1] };
}

export async function cloneRepo(
  owner: string,
  repo: string
): Promise<ClonedRepo> {
  const localPath = mkdtempSync(join(tmpdir(), `cds-${repo}-`));
  const url = `https://github.com/${owner}/${repo}.git`;
  const git = simpleGit();

  await git.clone(url, localPath, ["--depth", "1"]);

  const clonedGit = simpleGit(localPath);
  const log = await clonedGit.log({ maxCount: 1 });
  const branch =
    (await clonedGit.revparse(["--abbrev-ref", "HEAD"])).trim() || "main";
  const commitSha = log.latest?.hash ?? "unknown";

  return {
    localPath,
    info: { owner, repo, branch, commitSha },
    cleanup: () => rmSync(localPath, { recursive: true, force: true }),
  };
}

function scanSkillDirs(
  baseDir: string,
  relativePath = ""
): Array<{ dirPath: string; relPath: string }> {
  const results: Array<{ dirPath: string; relPath: string }> = [];
  const entries = readdirSync(baseDir, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isDirectory() || EXCLUDED_DIRS.has(entry.name)) continue;

    const fullPath = join(baseDir, entry.name);
    const relPath = relativePath ? `${relativePath}/${entry.name}` : entry.name;
    const skillFile = join(fullPath, SKILL_FILENAME);

    try {
      statSync(skillFile);
      results.push({ dirPath: fullPath, relPath });
    } catch {
      const nested = scanSkillDirs(fullPath, relPath);
      results.push(...nested);
    }
  }

  return results;
}

export function listSkillsFromLocal(localPath: string): SkillMeta[] {
  const skillDirs = scanSkillDirs(localPath);
  const skills: SkillMeta[] = [];

  for (const { dirPath, relPath } of skillDirs) {
    const skillFilePath = join(dirPath, SKILL_FILENAME);
    const content = readFileSync(skillFilePath, "utf-8");

    let name: string | null = null;
    let description: string | null = null;
    try {
      const { data } = matter(content);
      name = data.name ?? null;
      description = data.description ?? null;
    } catch {}

    const dirName = relPath.split("/").pop() ?? relPath;

    const files = readdirSync(dirPath)
      .filter((f) => {
        if (f === ".DS_Store") return false;
        const full = join(dirPath, f);
        return statSync(full).isFile();
      });

    skills.push({
      name: name ?? dirName,
      description:
        description ?? (firstParagraph(content) || `Skill from ${dirName}`),
      files,
      _localDir: dirPath,
    });
  }

  return skills;
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
