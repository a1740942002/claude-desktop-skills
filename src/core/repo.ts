import { join } from "path";
import simpleGit from "simple-git";
import { existsSync } from "fs";
import { REPOS_DIR } from "../constants.js";

export interface RepoId {
  owner: string;
  repo: string;
  url: string;
}

export function parseRepoId(input: string): RepoId {
  const cleaned = input.replace(/\/+$/, "");
  const parts = cleaned.split("/");
  if (parts.length < 2 || !parts[0] || !parts[1]) {
    throw new Error(
      `Invalid repo format: "${input}". Expected "owner/repo" (e.g., "getagentseal/founder-playbook").`
    );
  }
  return {
    owner: parts[0],
    repo: parts[1],
    url: `https://github.com/${parts[0]}/${parts[1]}.git`,
  };
}

export function repoLocalPath(owner: string, repo: string): string {
  return join(REPOS_DIR, owner, repo);
}

export async function cloneOrPull(repoId: RepoId): Promise<{
  localPath: string;
  commitSha: string;
}> {
  const localPath = repoLocalPath(repoId.owner, repoId.repo);
  const git = simpleGit();

  if (existsSync(join(localPath, ".git"))) {
    const repoGit = simpleGit(localPath);
    await repoGit.pull();
    const log = await repoGit.log({ maxCount: 1 });
    return { localPath, commitSha: log.latest?.hash ?? "unknown" };
  }

  await git.clone(repoId.url, localPath, ["--depth", "1"]);
  const repoGit = simpleGit(localPath);
  const log = await repoGit.log({ maxCount: 1 });
  return { localPath, commitSha: log.latest?.hash ?? "unknown" };
}
