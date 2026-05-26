import { existsSync } from "fs";
import { parseRepoId, cloneOrPull, repoLocalPath } from "../core/repo.js";
import { scanSkills } from "../core/scanner.js";

export async function listCommand(repoInput: string): Promise<void> {
  const repoId = parseRepoId(repoInput);
  const localPath = repoLocalPath(repoId.owner, repoId.repo);

  if (!existsSync(localPath)) {
    console.log(`Cloning ${repoId.owner}/${repoId.repo}...`);
    await cloneOrPull(repoId);
  }

  const skills = scanSkills(localPath);

  if (skills.length === 0) {
    console.log(`No skills found in ${repoInput}.`);
    return;
  }

  console.log(`\nSkills in ${repoInput}:\n`);
  for (const skill of skills) {
    const desc = skill.description.slice(0, 70);
    console.log(`  ${skill.name.padEnd(25)} — ${desc}`);
  }
  console.log(`\n  (${skills.length} skills total)`);
}
