import { join } from "path";
import { readRegistry, writeRegistry } from "../core/registry.js";
import {
  resolveDesktopSkillsPath,
  readDesktopManifest,
  writeDesktopManifest,
  removeSkillFromManifest,
  removeSkillFromDesktop,
} from "../core/desktop.js";
import { REGISTRY_PATH } from "../constants.js";

export function removeCommand(skillName: string): void {
  const registry = readRegistry(REGISTRY_PATH);

  if (!registry.skills[skillName]) {
    console.error(
      `Skill "${skillName}" is not installed. Run "skill-installer installed" to see installed skills.`
    );
    process.exit(1);
  }

  const desktopPath = registry.desktopPath ?? resolveDesktopSkillsPath();
  if (desktopPath) {
    const manifestPath = join(desktopPath, "manifest.json");
    let manifest = readDesktopManifest(manifestPath);
    manifest = removeSkillFromManifest(manifest, skillName);
    writeDesktopManifest(manifestPath, manifest);
    removeSkillFromDesktop(desktopPath, skillName);
  }

  delete registry.skills[skillName];
  writeRegistry(REGISTRY_PATH, registry);

  console.log(`Removed "${skillName}".`);
  console.log("Note: You may need to restart Claude Desktop for changes to take effect.");
}
