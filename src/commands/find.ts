import { readRegistry } from "../core/registry.js";
import { scanSkills } from "../core/scanner.js";
import { REGISTRY_PATH } from "../constants.js";
import { existsSync } from "fs";

export function findCommand(query: string): void {
  const registry = readRegistry(REGISTRY_PATH);
  const repos = Object.entries(registry.repos);

  if (repos.length === 0) {
    console.log("No repos cached yet. Install or list a repo first to enable search.");
    return;
  }

  const queryLower = query.toLowerCase();
  const results: Array<{ name: string; description: string; source: string }> = [];

  for (const [source, repo] of repos) {
    if (!existsSync(repo.localPath)) continue;
    const skills = scanSkills(repo.localPath);
    for (const skill of skills) {
      if (
        skill.name.toLowerCase().includes(queryLower) ||
        skill.description.toLowerCase().includes(queryLower)
      ) {
        results.push({ name: skill.name, description: skill.description, source });
      }
    }
  }

  if (results.length === 0) {
    console.log(`No skills matching "${query}" found.`);
    return;
  }

  console.log(`\nSearch results for "${query}":\n`);
  for (const result of results) {
    const desc = result.description.slice(0, 60);
    console.log(`  ${result.name.padEnd(25)} — ${desc}`);
    console.log(`  ${"".padEnd(25)}   from ${result.source}`);
  }
  console.log(`\n  (${results.length} results)`);
}
