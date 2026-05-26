import { join } from "path";
import { parseRepoId, cloneOrPull } from "../core/repo.js";
import { scanSkills, findSkillDir } from "../core/scanner.js";
import { readRegistry, writeRegistry } from "../core/registry.js";
import {
  resolveDesktopSkillsPath,
  readDesktopManifest,
  writeDesktopManifest,
  addSkillToManifest,
  copySkillToDesktop,
} from "../core/desktop.js";
import { REGISTRY_PATH } from "../constants.js";
import type { DesktopManifestSkill } from "../types.js";

export async function updateCommand(skillName?: string): Promise<void> {
  const registry = readRegistry(REGISTRY_PATH);
  const entries = Object.entries(registry.skills);

  if (entries.length === 0) {
    console.log("No skills installed.");
    return;
  }

  const toUpdate = skillName
    ? entries.filter(([name]) => name === skillName)
    : entries;

  if (toUpdate.length === 0) {
    console.error(`Skill "${skillName}" is not installed.`);
    process.exit(1);
  }

  const desktopPath = registry.desktopPath ?? resolveDesktopSkillsPath();
  if (!desktopPath) {
    console.error("Claude Desktop skills directory not found.");
    process.exit(1);
  }

  const manifestPath = join(desktopPath, "manifest.json");
  let manifest = readDesktopManifest(manifestPath);

  const reposToUpdate = new Set(toUpdate.map(([, skill]) => skill.source));
  const repoShas: Record<string, string> = {};

  for (const repoSource of reposToUpdate) {
    console.log(`Pulling ${repoSource}...`);
    const repoId = parseRepoId(repoSource);
    const { commitSha } = await cloneOrPull(repoId);
    repoShas[repoSource] = commitSha;
    registry.repos[repoSource] = {
      ...registry.repos[repoSource],
      lastPulled: new Date().toISOString(),
      commitSha,
    };
  }

  let updated = 0;

  for (const [name, skill] of toUpdate) {
    const newSha = repoShas[skill.source];
    if (newSha === skill.commitSha) {
      console.log(`  - ${name} (already up to date)`);
      continue;
    }

    const repoPath = registry.repos[skill.source].localPath;
    const allSkills = scanSkills(repoPath);
    const skillMeta = allSkills.find((s) => s.name === name);

    if (!skillMeta) {
      console.warn(`  ⚠ ${name} no longer found in ${skill.source}, skipping`);
      continue;
    }

    const skillSourceDir = findSkillDir(repoPath, name);
    if (!skillSourceDir) {
      console.warn(`  ⚠ Could not locate directory for ${name}, skipping`);
      continue;
    }

    copySkillToDesktop(skillSourceDir, desktopPath, name);

    const manifestEntry: DesktopManifestSkill = {
      skillId: name,
      name,
      description: skillMeta.description,
      creatorType: "user",
      updatedAt: new Date().toISOString(),
      enabled: true,
    };
    manifest = addSkillToManifest(manifest, manifestEntry);

    registry.skills[name] = {
      ...skill,
      commitSha: newSha,
      updatedAt: new Date().toISOString(),
      files: skillMeta.files,
    };

    console.log(`  ✓ ${name} updated`);
    updated++;
  }

  writeDesktopManifest(manifestPath, manifest);
  writeRegistry(REGISTRY_PATH, registry);

  console.log(`\n${updated} skill(s) updated.`);
  if (updated > 0) {
    console.log("Note: You may need to restart Claude Desktop for changes to take effect.");
  }
}
