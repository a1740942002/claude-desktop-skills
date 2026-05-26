import { homedir } from "os";
import { join } from "path";
import type { Registry } from "./types.js";

export const SKILL_INSTALLER_DIR = join(homedir(), ".skill-installer");
export const REPOS_DIR = join(SKILL_INSTALLER_DIR, "repos");
export const REGISTRY_PATH = join(SKILL_INSTALLER_DIR, "registry.json");

export const DESKTOP_BASE = join(
  homedir(),
  "Library",
  "Application Support",
  "Claude",
  "local-agent-mode-sessions",
  "skills-plugin"
);

export const SKILL_FILENAME = "SKILL.md";

export const EXCLUDED_DIRS = new Set([
  ".git",
  "node_modules",
  ".github",
  "docs",
  "experiments",
  "covers",
  ".superpowers",
]);

export const EMPTY_REGISTRY: Registry = {
  version: 1,
  desktopPath: null,
  repos: {},
  skills: {},
};
