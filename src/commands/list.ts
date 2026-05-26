import { parseRepoId, listSkillsFromApi } from "../core/github.js";

export async function listCommand(repoInput: string): Promise<void> {
  const { owner, repo } = parseRepoId(repoInput);

  console.log(`Fetching skills from ${owner}/${repo}...`);
  const skills = await listSkillsFromApi(owner, repo);

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
