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

export async function installCommand(
  repoInput: string,
  options: { skill?: string }
): Promise<void> {
  const repoId = parseRepoId(repoInput);
  console.log(`Cloning ${repoId.owner}/${repoId.repo}...`);

  const { localPath, commitSha } = await cloneOrPull(repoId);
  console.log(`Repository ready (${commitSha.slice(0, 7)})`);

  const allSkills = scanSkills(localPath);
  if (allSkills.length === 0) {
    console.error(`No skills found in ${repoInput}. Looking for SKILL.md files.`);
    process.exit(1);
  }

  const skillsToInstall = options.skill
    ? allSkills.filter((s) => s.name === options.skill)
    : allSkills;

  if (skillsToInstall.length === 0) {
    console.error(
      `Skill "${options.skill}" not found. Available: ${allSkills.map((s) => s.name).join(", ")}`
    );
    process.exit(1);
  }

  const desktopPath = resolveDesktopSkillsPath();
  if (!desktopPath) {
    console.error("Claude Desktop skills directory not found. Is Claude Desktop installed?");
    process.exit(1);
  }

  const manifestPath = join(desktopPath, "manifest.json");
  let manifest = readDesktopManifest(manifestPath);
  const registry = readRegistry(REGISTRY_PATH);

  const repoSource = `${repoId.owner}/${repoId.repo}`;
  registry.desktopPath = desktopPath;
  registry.repos[repoSource] = {
    localPath,
    lastPulled: new Date().toISOString(),
    commitSha,
  };

  let installed = 0;

  for (const skill of skillsToInstall) {
    const skillSourceDir = findSkillDir(localPath, skill.name);
    if (!skillSourceDir) {
      console.warn(`  ⚠ Could not locate directory for ${skill.name}, skipping`);
      continue;
    }

    copySkillToDesktop(skillSourceDir, desktopPath, skill.name);

    const manifestEntry: DesktopManifestSkill = {
      skillId: skill.name,
      name: skill.name,
      description: skill.description,
      creatorType: "user",
      updatedAt: new Date().toISOString(),
      enabled: true,
    };
    manifest = addSkillToManifest(manifest, manifestEntry);

    registry.skills[skill.name] = {
      source: repoSource,
      sourcePath: skill.name,
      installedTo: ["desktop"],
      commitSha,
      installedAt: registry.skills[skill.name]?.installedAt ?? new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      files: skill.files,
    };

    console.log(`  ✓ ${skill.name} — ${skill.description.slice(0, 60)}`);
    installed++;
  }

  writeDesktopManifest(manifestPath, manifest);
  writeRegistry(REGISTRY_PATH, registry);

  console.log(`\nInstalled ${installed} skill(s) to Claude Desktop.`);
  console.log("Note: You may need to restart Claude Desktop for changes to take effect.");
}
