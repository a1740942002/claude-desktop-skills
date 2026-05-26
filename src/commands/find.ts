import { readRegistry } from "../core/registry.js";
import { REGISTRY_PATH } from "../constants.js";

export function findCommand(query: string): void {
  const registry = readRegistry(REGISTRY_PATH);
  const skills = Object.entries(registry.skills);

  if (skills.length === 0) {
    console.log("No skills installed yet. Use 'pack' to install skills first.");
    return;
  }

  const queryLower = query.toLowerCase();
  const results: Array<{ name: string; source: string }> = [];

  for (const [name, skill] of skills) {
    if (name.toLowerCase().includes(queryLower) || skill.source.toLowerCase().includes(queryLower)) {
      results.push({ name, source: skill.source });
    }
  }

  if (results.length === 0) {
    console.log(`No skills matching "${query}" found.`);
    return;
  }

  console.log(`\nSearch results for "${query}":\n`);
  for (const result of results) {
    console.log(`  ${result.name.padEnd(25)} — from ${result.source}`);
  }
  console.log(`\n  (${results.length} results)`);
}
