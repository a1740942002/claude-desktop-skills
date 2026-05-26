import { readRegistry } from "../core/registry.js";
import { REGISTRY_PATH } from "../constants.js";

export function installedCommand(): void {
  const registry = readRegistry(REGISTRY_PATH);
  const entries = Object.entries(registry.skills);

  if (entries.length === 0) {
    console.log("No skills installed.");
    return;
  }

  console.log("\nInstalled skills:\n");
  for (const [name, skill] of entries) {
    const targets = skill.installedTo.join(", ");
    const sha = skill.commitSha.slice(0, 7);
    const date = skill.installedAt.split("T")[0];
    console.log(
      `  ${name.padEnd(25)} [${targets}] from ${skill.source} (${sha}, ${date})`
    );
  }
  console.log(`\n  (${entries.length} skills total)`);
}
