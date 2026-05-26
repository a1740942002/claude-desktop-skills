import matter from "gray-matter";
import { SKILL_FILENAME } from "../constants.js";
import type { SkillMeta } from "../types.js";

interface TreeItem {
  path: string;
  type: string;
  sha: string;
}

async function ghFetch(url: string): Promise<Response> {
  const res = await fetch(url, {
    headers: { Accept: "application/vnd.github.v3+json" },
  });
  if (!res.ok) {
    if (res.status === 403) {
      throw new Error("GitHub API rate limit exceeded. Try again later.");
    }
    throw new Error(`GitHub API error: ${res.status} ${res.statusText}`);
  }
  return res;
}

async function getDefaultBranch(owner: string, repo: string): Promise<string> {
  const res = await ghFetch(`https://api.github.com/repos/${owner}/${repo}`);
  const data = (await res.json()) as { default_branch: string };
  return data.default_branch;
}

async function getTree(
  owner: string,
  repo: string,
  branch: string
): Promise<TreeItem[]> {
  const res = await ghFetch(
    `https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`
  );
  const data = (await res.json()) as { tree: TreeItem[] };
  return data.tree;
}

async function getFileContent(
  owner: string,
  repo: string,
  path: string
): Promise<string> {
  const res = await ghFetch(
    `https://api.github.com/repos/${owner}/${repo}/contents/${path}`
  );
  const data = (await res.json()) as { content: string; encoding: string };
  if (data.encoding === "base64") {
    return Buffer.from(data.content, "base64").toString("utf-8");
  }
  return data.content;
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

export interface RepoInfo {
  owner: string;
  repo: string;
  branch: string;
  commitSha: string;
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

export async function fetchRepoInfo(
  owner: string,
  repo: string
): Promise<RepoInfo> {
  const branch = await getDefaultBranch(owner, repo);
  const res = await ghFetch(
    `https://api.github.com/repos/${owner}/${repo}/commits/${branch}`
  );
  const data = (await res.json()) as { sha: string };
  return { owner, repo, branch, commitSha: data.sha };
}

export async function listSkillsFromApi(
  owner: string,
  repo: string
): Promise<SkillMeta[]> {
  const info = await fetchRepoInfo(owner, repo);
  const tree = await getTree(owner, repo, info.branch);

  const skillFiles = tree.filter(
    (item) => item.type === "blob" && item.path.endsWith(`/${SKILL_FILENAME}`)
  );

  const skills: SkillMeta[] = [];

  for (const sf of skillFiles) {
    const dirPath = sf.path.replace(`/${SKILL_FILENAME}`, "");
    const dirName = dirPath.split("/").pop() ?? dirPath;

    const content = await getFileContent(owner, repo, sf.path);

    let name: string | null = null;
    let description: string | null = null;
    try {
      const { data } = matter(content);
      name = data.name ?? null;
      description = data.description ?? null;
    } catch {}

    const files = tree
      .filter(
        (item) =>
          item.type === "blob" &&
          item.path.startsWith(dirPath + "/") &&
          !item.path.slice(dirPath.length + 1).includes("/")
      )
      .map((item) => item.path.split("/").pop()!);

    skills.push({
      name: name ?? dirName,
      description:
        description ?? (firstParagraph(content) || `Skill from ${dirName}`),
      files,
    });
  }

  return skills;
}

export async function downloadFile(
  owner: string,
  repo: string,
  path: string
): Promise<Buffer> {
  const res = await ghFetch(
    `https://api.github.com/repos/${owner}/${repo}/contents/${path}`
  );
  const data = (await res.json()) as { content: string; encoding: string };
  if (data.encoding === "base64") {
    return Buffer.from(data.content, "base64");
  }
  return Buffer.from(data.content, "utf-8");
}
