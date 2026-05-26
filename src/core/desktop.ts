import {
  readdirSync,
  readFileSync,
  writeFileSync,
  existsSync,
  mkdirSync,
  cpSync,
  rmSync,
  statSync,
} from "fs";
import { join } from "path";
import { DESKTOP_BASE } from "../constants.js";
import type { DesktopManifest, DesktopManifestSkill } from "../types.js";

export function resolveDesktopSkillsPath(
  baseDir: string = DESKTOP_BASE
): string | null {
  if (!existsSync(baseDir)) return null;

  let orgDirs: string[];
  try {
    orgDirs = readdirSync(baseDir);
  } catch {
    return null;
  }

  for (const org of orgDirs) {
    const orgPath = join(baseDir, org);
    if (!statSync(orgPath).isDirectory()) continue;

    let userDirs: string[];
    try {
      userDirs = readdirSync(orgPath);
    } catch {
      continue;
    }

    for (const user of userDirs) {
      const userPath = join(orgPath, user);
      if (!statSync(userPath).isDirectory()) continue;
      if (existsSync(join(userPath, "manifest.json"))) {
        return userPath;
      }
    }
  }

  return null;
}

export function readDesktopManifest(manifestPath: string): DesktopManifest {
  const raw = readFileSync(manifestPath, "utf-8");
  return JSON.parse(raw) as DesktopManifest;
}

export function writeDesktopManifest(
  manifestPath: string,
  manifest: DesktopManifest
): void {
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 4));
}

export function addSkillToManifest(
  manifest: DesktopManifest,
  skill: DesktopManifestSkill
): DesktopManifest {
  const filtered = manifest.skills.filter((s) => s.skillId !== skill.skillId);
  return {
    ...manifest,
    lastUpdated: Date.now(),
    skills: [...filtered, skill],
  };
}

export function removeSkillFromManifest(
  manifest: DesktopManifest,
  skillId: string
): DesktopManifest {
  return {
    ...manifest,
    lastUpdated: Date.now(),
    skills: manifest.skills.filter((s) => s.skillId !== skillId),
  };
}

export function copySkillToDesktop(
  sourceDir: string,
  desktopPath: string,
  skillName: string
): void {
  const targetDir = join(desktopPath, "skills", skillName);
  if (existsSync(targetDir)) {
    rmSync(targetDir, { recursive: true, force: true });
  }
  mkdirSync(targetDir, { recursive: true });
  cpSync(sourceDir, targetDir, { recursive: true });
}

export function removeSkillFromDesktop(
  desktopPath: string,
  skillName: string
): void {
  const targetDir = join(desktopPath, "skills", skillName);
  if (existsSync(targetDir)) {
    rmSync(targetDir, { recursive: true, force: true });
  }
}
