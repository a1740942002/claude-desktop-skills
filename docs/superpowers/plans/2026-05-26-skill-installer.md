# Skill Installer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a TypeScript CLI that installs skills from GitHub repos into Claude Desktop by injecting into its skills-plugin directory.

**Architecture:** CLI clones GitHub repos locally, scans for `SKILL.md` files, copies skill folders into Claude Desktop's `skills-plugin/{org}/{user}/skills/` directory, and updates the Desktop `manifest.json`. A local registry at `~/.skill-installer/registry.json` tracks what was installed and from where.

**Tech Stack:** TypeScript, Node.js >= 18, Commander.js, simple-git, gray-matter, vitest

---

### Task 1: Project scaffolding

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `src/index.ts`

- [ ] **Step 1: Initialize the project**

```bash
cd /Users/brianlai/code/side-projects/SkillInstaller
npm init -y
```

- [ ] **Step 2: Install dependencies**

```bash
cd /Users/brianlai/code/side-projects/SkillInstaller
npm install commander simple-git gray-matter
npm install -D typescript tsx vitest @types/node
```

- [ ] **Step 3: Create tsconfig.json**

Create `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "Node16",
    "moduleResolution": "Node16",
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "declaration": true
  },
  "include": ["src"]
}
```

- [ ] **Step 4: Create minimal CLI entry point**

Create `src/index.ts`:

```typescript
#!/usr/bin/env node
import { Command } from "commander";

const program = new Command();

program
  .name("skill-installer")
  .description("Install skills from GitHub repos into Claude Desktop")
  .version("0.1.0");

program.parse();
```

- [ ] **Step 5: Add bin and scripts to package.json**

Update `package.json` — set `"type": "module"` and add:

```json
{
  "type": "module",
  "bin": {
    "skill-installer": "./node_modules/.bin/tsx src/index.ts"
  },
  "scripts": {
    "dev": "tsx src/index.ts",
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

- [ ] **Step 6: Verify CLI runs**

```bash
cd /Users/brianlai/code/side-projects/SkillInstaller
npx tsx src/index.ts --help
```

Expected: Shows help output with name "skill-installer" and description.

- [ ] **Step 7: Initialize git and commit**

```bash
cd /Users/brianlai/code/side-projects/SkillInstaller
git init
echo "node_modules/\ndist/\n.skill-installer/" > .gitignore
git add package.json package-lock.json tsconfig.json src/index.ts .gitignore
git commit -m "feat: project scaffolding with CLI entry point"
```

---

### Task 2: Types and constants

**Files:**
- Create: `src/types.ts`
- Create: `src/constants.ts`

- [ ] **Step 1: Create type definitions**

Create `src/types.ts`:

```typescript
export interface SkillMeta {
  name: string;
  description: string;
  files: string[];
}

export interface RegistrySkill {
  source: string;
  sourcePath: string;
  installedTo: string[];
  commitSha: string;
  installedAt: string;
  updatedAt: string;
  files: string[];
}

export interface RegistryRepo {
  localPath: string;
  lastPulled: string;
  commitSha: string;
}

export interface Registry {
  version: number;
  desktopPath: string | null;
  repos: Record<string, RegistryRepo>;
  skills: Record<string, RegistrySkill>;
}

export interface DesktopManifestSkill {
  skillId: string;
  name: string;
  description: string;
  creatorType: string;
  updatedAt: string;
  enabled: boolean;
}

export interface DesktopManifest {
  lastUpdated: number;
  skills: DesktopManifestSkill[];
}
```

- [ ] **Step 2: Create constants**

Create `src/constants.ts`:

```typescript
import { homedir } from "os";
import { join } from "path";

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
```

Add import at top of `src/constants.ts`:

```typescript
import type { Registry } from "./types.js";
```

- [ ] **Step 3: Commit**

```bash
cd /Users/brianlai/code/side-projects/SkillInstaller
git add src/types.ts src/constants.ts
git commit -m "feat: add type definitions and constants"
```

---

### Task 3: Registry module

**Files:**
- Create: `src/core/registry.ts`
- Create: `tests/core/registry.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/core/registry.test.ts`:

```typescript
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { readRegistry, writeRegistry } from "../../src/core/registry.js";
import { mkdtempSync, rmSync, writeFileSync, readFileSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import type { Registry } from "../../src/types.js";

describe("registry", () => {
  let tempDir: string;
  let registryPath: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), "skill-installer-test-"));
    registryPath = join(tempDir, "registry.json");
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it("returns empty registry when file does not exist", () => {
    const reg = readRegistry(registryPath);
    expect(reg.version).toBe(1);
    expect(reg.repos).toEqual({});
    expect(reg.skills).toEqual({});
    expect(reg.desktopPath).toBeNull();
  });

  it("reads existing registry", () => {
    const data: Registry = {
      version: 1,
      desktopPath: "/some/path",
      repos: {},
      skills: {
        "test-skill": {
          source: "owner/repo",
          sourcePath: "test-skill",
          installedTo: ["desktop"],
          commitSha: "abc123",
          installedAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
          files: ["SKILL.md"],
        },
      },
    };
    writeFileSync(registryPath, JSON.stringify(data));
    const reg = readRegistry(registryPath);
    expect(reg.skills["test-skill"].source).toBe("owner/repo");
  });

  it("writes registry and reads it back", () => {
    const data: Registry = {
      version: 1,
      desktopPath: null,
      repos: {},
      skills: {},
    };
    writeRegistry(registryPath, data);
    const raw = JSON.parse(readFileSync(registryPath, "utf-8"));
    expect(raw.version).toBe(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /Users/brianlai/code/side-projects/SkillInstaller
npx vitest run tests/core/registry.test.ts
```

Expected: FAIL — cannot resolve `../../src/core/registry.js`

- [ ] **Step 3: Implement registry module**

Create `src/core/registry.ts`:

```typescript
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { dirname } from "path";
import type { Registry } from "../types.js";
import { EMPTY_REGISTRY } from "../constants.js";

export function readRegistry(path: string): Registry {
  if (!existsSync(path)) {
    return { ...EMPTY_REGISTRY, repos: {}, skills: {} };
  }
  const raw = readFileSync(path, "utf-8");
  return JSON.parse(raw) as Registry;
}

export function writeRegistry(path: string, registry: Registry): void {
  const dir = dirname(path);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  writeFileSync(path, JSON.stringify(registry, null, 2));
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd /Users/brianlai/code/side-projects/SkillInstaller
npx vitest run tests/core/registry.test.ts
```

Expected: All 3 tests PASS.

- [ ] **Step 5: Commit**

```bash
cd /Users/brianlai/code/side-projects/SkillInstaller
git add src/core/registry.ts tests/core/registry.test.ts
git commit -m "feat: registry read/write module with tests"
```

---

### Task 4: Scanner module (skill detection + frontmatter parsing)

**Files:**
- Create: `src/core/scanner.ts`
- Create: `tests/core/scanner.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/core/scanner.test.ts`:

```typescript
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { scanSkills, parseFrontmatter } from "../../src/core/scanner.js";
import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

describe("parseFrontmatter", () => {
  it("extracts name and description from YAML frontmatter", () => {
    const content = `---
name: mom-test
description: "Customer interview framework"
---

# Mom Test

Content here.`;
    const result = parseFrontmatter(content);
    expect(result.name).toBe("mom-test");
    expect(result.description).toBe("Customer interview framework");
  });

  it("returns nulls when no frontmatter", () => {
    const content = "# Just a heading\n\nSome paragraph text.";
    const result = parseFrontmatter(content);
    expect(result.name).toBeNull();
    expect(result.description).toBeNull();
  });
});

describe("scanSkills", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), "skill-scan-test-"));
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it("finds skills with SKILL.md", () => {
    const skillDir = join(tempDir, "my-skill");
    mkdirSync(skillDir);
    writeFileSync(
      join(skillDir, "SKILL.md"),
      `---\nname: my-skill\ndescription: "A test skill"\n---\n\n# My Skill`
    );
    writeFileSync(join(skillDir, "frameworks.md"), "# Frameworks");

    const skills = scanSkills(tempDir);
    expect(skills).toHaveLength(1);
    expect(skills[0].name).toBe("my-skill");
    expect(skills[0].description).toBe("A test skill");
    expect(skills[0].files).toContain("SKILL.md");
    expect(skills[0].files).toContain("frameworks.md");
  });

  it("uses directory name as fallback when no frontmatter name", () => {
    const skillDir = join(tempDir, "fallback-skill");
    mkdirSync(skillDir);
    writeFileSync(join(skillDir, "SKILL.md"), "# Fallback\n\nFirst paragraph here.");

    const skills = scanSkills(tempDir);
    expect(skills).toHaveLength(1);
    expect(skills[0].name).toBe("fallback-skill");
  });

  it("excludes .git and node_modules directories", () => {
    const gitDir = join(tempDir, ".git", "hooks");
    mkdirSync(gitDir, { recursive: true });
    writeFileSync(join(tempDir, ".git", "SKILL.md"), "---\nname: bad\n---\n");

    const nodeDir = join(tempDir, "node_modules", "pkg");
    mkdirSync(nodeDir, { recursive: true });
    writeFileSync(join(nodeDir, "SKILL.md"), "---\nname: bad2\n---\n");

    const skills = scanSkills(tempDir);
    expect(skills).toHaveLength(0);
  });

  it("returns empty array when no skills found", () => {
    const skills = scanSkills(tempDir);
    expect(skills).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /Users/brianlai/code/side-projects/SkillInstaller
npx vitest run tests/core/scanner.test.ts
```

Expected: FAIL — cannot resolve `../../src/core/scanner.js`

- [ ] **Step 3: Implement scanner module**

Create `src/core/scanner.ts`:

```typescript
import { readdirSync, readFileSync, statSync, existsSync } from "fs";
import { join, basename } from "path";
import matter from "gray-matter";
import { SKILL_FILENAME, EXCLUDED_DIRS } from "../constants.js";
import type { SkillMeta } from "../types.js";

export function parseFrontmatter(content: string): {
  name: string | null;
  description: string | null;
} {
  try {
    const { data } = matter(content);
    return {
      name: data.name ?? null,
      description: data.description ?? null,
    };
  } catch {
    return { name: null, description: null };
  }
}

function firstParagraph(content: string): string {
  const stripped = content.replace(/^---[\s\S]*?---\n*/, "");
  const lines = stripped.split("\n");
  const paragraphLines: string[] = [];
  let started = false;
  for (const line of lines) {
    const trimmed = line.trim();
    if (!started) {
      if (trimmed && !trimmed.startsWith("#")) {
        started = true;
        paragraphLines.push(trimmed);
      }
    } else {
      if (!trimmed) break;
      paragraphLines.push(trimmed);
    }
  }
  const text = paragraphLines.join(" ");
  return text.length > 200 ? text.slice(0, 200) + "…" : text;
}

export function scanSkills(repoDir: string, maxDepth = 3): SkillMeta[] {
  const skills: SkillMeta[] = [];

  function walk(dir: string, depth: number) {
    if (depth > maxDepth) return;

    let entries: string[];
    try {
      entries = readdirSync(dir);
    } catch {
      return;
    }

    if (entries.includes(SKILL_FILENAME)) {
      const dirName = basename(dir);
      if (EXCLUDED_DIRS.has(dirName)) return;

      const skillPath = join(dir, SKILL_FILENAME);
      const content = readFileSync(skillPath, "utf-8");
      const { name, description } = parseFrontmatter(content);

      const files = entries.filter((e) => {
        const full = join(dir, e);
        try {
          return statSync(full).isFile();
        } catch {
          return false;
        }
      });

      skills.push({
        name: name ?? dirName,
        description: description ?? firstParagraph(content) || `Skill from ${dirName}`,
        files,
      });
      return;
    }

    for (const entry of entries) {
      if (EXCLUDED_DIRS.has(entry)) continue;
      const full = join(dir, entry);
      try {
        if (statSync(full).isDirectory()) {
          walk(full, depth + 1);
        }
      } catch {
        continue;
      }
    }
  }

  walk(repoDir, 0);
  return skills;
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd /Users/brianlai/code/side-projects/SkillInstaller
npx vitest run tests/core/scanner.test.ts
```

Expected: All 5 tests PASS.

- [ ] **Step 5: Commit**

```bash
cd /Users/brianlai/code/side-projects/SkillInstaller
git add src/core/scanner.ts tests/core/scanner.test.ts
git commit -m "feat: scanner module for skill detection and frontmatter parsing"
```

---

### Task 5: Repo module (git clone/pull)

**Files:**
- Create: `src/core/repo.ts`
- Create: `tests/core/repo.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/core/repo.test.ts`:

```typescript
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { parseRepoId, repoLocalPath } from "../../src/core/repo.js";

describe("parseRepoId", () => {
  it("parses owner/repo format", () => {
    const result = parseRepoId("getagentseal/founder-playbook");
    expect(result).toEqual({
      owner: "getagentseal",
      repo: "founder-playbook",
      url: "https://github.com/getagentseal/founder-playbook.git",
    });
  });

  it("throws on invalid format", () => {
    expect(() => parseRepoId("just-a-name")).toThrow();
  });

  it("handles trailing slashes", () => {
    const result = parseRepoId("owner/repo/");
    expect(result.owner).toBe("owner");
    expect(result.repo).toBe("repo");
  });
});

describe("repoLocalPath", () => {
  it("returns path under repos dir", () => {
    const path = repoLocalPath("getagentseal", "founder-playbook");
    expect(path).toContain("getagentseal");
    expect(path).toContain("founder-playbook");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /Users/brianlai/code/side-projects/SkillInstaller
npx vitest run tests/core/repo.test.ts
```

Expected: FAIL — cannot resolve `../../src/core/repo.js`

- [ ] **Step 3: Implement repo module**

Create `src/core/repo.ts`:

```typescript
import { join } from "path";
import simpleGit from "simple-git";
import { existsSync } from "fs";
import { REPOS_DIR } from "../constants.js";

export interface RepoId {
  owner: string;
  repo: string;
  url: string;
}

export function parseRepoId(input: string): RepoId {
  const cleaned = input.replace(/\/+$/, "");
  const parts = cleaned.split("/");
  if (parts.length < 2 || !parts[0] || !parts[1]) {
    throw new Error(
      `Invalid repo format: "${input}". Expected "owner/repo" (e.g., "getagentseal/founder-playbook").`
    );
  }
  return {
    owner: parts[0],
    repo: parts[1],
    url: `https://github.com/${parts[0]}/${parts[1]}.git`,
  };
}

export function repoLocalPath(owner: string, repo: string): string {
  return join(REPOS_DIR, owner, repo);
}

export async function cloneOrPull(repoId: RepoId): Promise<{
  localPath: string;
  commitSha: string;
}> {
  const localPath = repoLocalPath(repoId.owner, repoId.repo);
  const git = simpleGit();

  if (existsSync(join(localPath, ".git"))) {
    const repoGit = simpleGit(localPath);
    await repoGit.pull();
    const log = await repoGit.log({ maxCount: 1 });
    return { localPath, commitSha: log.latest?.hash ?? "unknown" };
  }

  await git.clone(repoId.url, localPath, ["--depth", "1"]);
  const repoGit = simpleGit(localPath);
  const log = await repoGit.log({ maxCount: 1 });
  return { localPath, commitSha: log.latest?.hash ?? "unknown" };
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd /Users/brianlai/code/side-projects/SkillInstaller
npx vitest run tests/core/repo.test.ts
```

Expected: All 4 tests PASS.

- [ ] **Step 5: Commit**

```bash
cd /Users/brianlai/code/side-projects/SkillInstaller
git add src/core/repo.ts tests/core/repo.test.ts
git commit -m "feat: repo module for git clone/pull and repo ID parsing"
```

---

### Task 6: Desktop module (path resolution, manifest, file copy)

**Files:**
- Create: `src/core/desktop.ts`
- Create: `tests/core/desktop.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/core/desktop.test.ts`:

```typescript
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  resolveDesktopSkillsPath,
  readDesktopManifest,
  writeDesktopManifest,
  addSkillToManifest,
  removeSkillFromManifest,
} from "../../src/core/desktop.js";
import {
  mkdtempSync,
  rmSync,
  mkdirSync,
  writeFileSync,
  existsSync,
} from "fs";
import { join } from "path";
import { tmpdir } from "os";
import type { DesktopManifest } from "../../src/types.js";

describe("resolveDesktopSkillsPath", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), "desktop-test-"));
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it("finds the path containing manifest.json", () => {
    const orgDir = join(tempDir, "org-123", "user-456");
    mkdirSync(orgDir, { recursive: true });
    const manifest: DesktopManifest = { lastUpdated: 0, skills: [] };
    writeFileSync(join(orgDir, "manifest.json"), JSON.stringify(manifest));

    const result = resolveDesktopSkillsPath(tempDir);
    expect(result).toBe(orgDir);
  });

  it("returns null when no manifest found", () => {
    const result = resolveDesktopSkillsPath(tempDir);
    expect(result).toBeNull();
  });
});

describe("desktop manifest", () => {
  let tempDir: string;
  let manifestPath: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), "manifest-test-"));
    manifestPath = join(tempDir, "manifest.json");
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it("reads existing manifest", () => {
    const data: DesktopManifest = {
      lastUpdated: 1000,
      skills: [
        {
          skillId: "existing",
          name: "existing",
          description: "An existing skill",
          creatorType: "anthropic",
          updatedAt: "2026-01-01T00:00:00.000Z",
          enabled: true,
        },
      ],
    };
    writeFileSync(manifestPath, JSON.stringify(data));
    const manifest = readDesktopManifest(manifestPath);
    expect(manifest.skills).toHaveLength(1);
    expect(manifest.skills[0].skillId).toBe("existing");
  });

  it("adds a skill to manifest without duplicating", () => {
    const manifest: DesktopManifest = { lastUpdated: 0, skills: [] };
    const updated = addSkillToManifest(manifest, {
      skillId: "new-skill",
      name: "new-skill",
      description: "A new skill",
      creatorType: "user",
      updatedAt: "2026-05-26T00:00:00.000Z",
      enabled: true,
    });
    expect(updated.skills).toHaveLength(1);
    expect(updated.skills[0].skillId).toBe("new-skill");

    const again = addSkillToManifest(updated, {
      skillId: "new-skill",
      name: "new-skill",
      description: "Updated description",
      creatorType: "user",
      updatedAt: "2026-05-27T00:00:00.000Z",
      enabled: true,
    });
    expect(again.skills).toHaveLength(1);
    expect(again.skills[0].description).toBe("Updated description");
  });

  it("removes a skill from manifest", () => {
    const manifest: DesktopManifest = {
      lastUpdated: 0,
      skills: [
        {
          skillId: "to-remove",
          name: "to-remove",
          description: "desc",
          creatorType: "user",
          updatedAt: "",
          enabled: true,
        },
      ],
    };
    const updated = removeSkillFromManifest(manifest, "to-remove");
    expect(updated.skills).toHaveLength(0);
  });

  it("writes and reads manifest roundtrip", () => {
    const manifest: DesktopManifest = {
      lastUpdated: Date.now(),
      skills: [],
    };
    writeDesktopManifest(manifestPath, manifest);
    const read = readDesktopManifest(manifestPath);
    expect(read.lastUpdated).toBe(manifest.lastUpdated);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /Users/brianlai/code/side-projects/SkillInstaller
npx vitest run tests/core/desktop.test.ts
```

Expected: FAIL — cannot resolve `../../src/core/desktop.js`

- [ ] **Step 3: Implement desktop module**

Create `src/core/desktop.ts`:

```typescript
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
import { join, basename } from "path";
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
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd /Users/brianlai/code/side-projects/SkillInstaller
npx vitest run tests/core/desktop.test.ts
```

Expected: All 5 tests PASS.

- [ ] **Step 5: Commit**

```bash
cd /Users/brianlai/code/side-projects/SkillInstaller
git add src/core/desktop.ts tests/core/desktop.test.ts
git commit -m "feat: desktop module for path resolution and manifest management"
```

---

### Task 7: Install command

**Files:**
- Create: `src/commands/install.ts`
- Modify: `src/index.ts`

- [ ] **Step 1: Add `findSkillDir` to scanner module**

Append to `src/core/scanner.ts` (after the `scanSkills` function):

```typescript
export function findSkillDir(
  dir: string,
  skillName: string,
  maxDepth = 3,
  depth = 0
): string | null {
  if (depth > maxDepth) return null;

  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return null;
  }

  if (entries.includes(SKILL_FILENAME)) {
    if (basename(dir) === skillName) return dir;
    const content = readFileSync(join(dir, SKILL_FILENAME), "utf-8");
    const { name } = parseFrontmatter(content);
    if (name === skillName) return dir;
  }

  for (const entry of entries) {
    if (EXCLUDED_DIRS.has(entry)) continue;
    const full = join(dir, entry);
    try {
      if (statSync(full).isDirectory()) {
        const result = findSkillDir(full, skillName, maxDepth, depth + 1);
        if (result) return result;
      }
    } catch {
      continue;
    }
  }

  return null;
}
```

- [ ] **Step 2: Implement install command**

Create `src/commands/install.ts`:

```typescript
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
    console.error(
      `No skills found in ${repoInput}. Looking for SKILL.md files.`
    );
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
    console.error(
      "Claude Desktop skills directory not found. Is Claude Desktop installed?"
    );
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
      installedAt:
        registry.skills[skill.name]?.installedAt ?? new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      files: skill.files,
    };

    console.log(`  ✓ ${skill.name} — ${skill.description.slice(0, 60)}`);
    installed++;
  }

  writeDesktopManifest(manifestPath, manifest);
  writeRegistry(REGISTRY_PATH, registry);

  console.log(
    `\nInstalled ${installed} skill(s) to Claude Desktop.`
  );
  console.log(
    "Note: You may need to restart Claude Desktop for changes to take effect."
  );
}
```

- [ ] **Step 2: Wire install command into CLI entry point**

Update `src/index.ts`:

```typescript
#!/usr/bin/env node
import { Command } from "commander";
import { installCommand } from "./commands/install.js";

const program = new Command();

program
  .name("skill-installer")
  .description("Install skills from GitHub repos into Claude Desktop")
  .version("0.1.0");

program
  .command("install <repo>")
  .description("Install skills from a GitHub repo")
  .option("-s, --skill <name>", "Install a specific skill only")
  .action(async (repo: string, options: { skill?: string }) => {
    await installCommand(repo, options);
  });

program.parse();
```

- [ ] **Step 3: Smoke test the install command help**

```bash
cd /Users/brianlai/code/side-projects/SkillInstaller
npx tsx src/index.ts install --help
```

Expected: Shows usage for install command with `<repo>` argument and `--skill` option.

- [ ] **Step 4: Commit**

```bash
cd /Users/brianlai/code/side-projects/SkillInstaller
git add src/commands/install.ts src/index.ts
git commit -m "feat: install command — clone repo, scan skills, inject into Desktop"
```

---

### Task 8: List command (list skills in a repo)

**Files:**
- Create: `src/commands/list.ts`
- Modify: `src/index.ts`

- [ ] **Step 1: Implement list command**

Create `src/commands/list.ts`:

```typescript
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
```

- [ ] **Step 2: Wire into CLI**

Add to `src/index.ts` after the install command:

```typescript
import { listCommand } from "./commands/list.js";

// ... after install command registration:

program
  .command("list <repo>")
  .description("List available skills in a GitHub repo")
  .action(async (repo: string) => {
    await listCommand(repo);
  });
```

- [ ] **Step 3: Commit**

```bash
cd /Users/brianlai/code/side-projects/SkillInstaller
git add src/commands/list.ts src/index.ts
git commit -m "feat: list command — show available skills in a repo"
```

---

### Task 9: Installed command (show installed skills)

**Files:**
- Create: `src/commands/installed.ts`
- Modify: `src/index.ts`

- [ ] **Step 1: Implement installed command**

Create `src/commands/installed.ts`:

```typescript
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
```

- [ ] **Step 2: Wire into CLI**

Add to `src/index.ts`:

```typescript
import { installedCommand } from "./commands/installed.js";

program
  .command("installed")
  .description("List all installed skills")
  .action(() => {
    installedCommand();
  });
```

- [ ] **Step 3: Commit**

```bash
cd /Users/brianlai/code/side-projects/SkillInstaller
git add src/commands/installed.ts src/index.ts
git commit -m "feat: installed command — show all installed skills"
```

---

### Task 10: Remove command

**Files:**
- Create: `src/commands/remove.ts`
- Modify: `src/index.ts`

- [ ] **Step 1: Implement remove command**

Create `src/commands/remove.ts`:

```typescript
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

  const desktopPath =
    registry.desktopPath ?? resolveDesktopSkillsPath();
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
  console.log(
    "Note: You may need to restart Claude Desktop for changes to take effect."
  );
}
```

- [ ] **Step 2: Wire into CLI**

Add to `src/index.ts`:

```typescript
import { removeCommand } from "./commands/remove.js";

program
  .command("remove <skill-name>")
  .description("Remove an installed skill")
  .action((skillName: string) => {
    removeCommand(skillName);
  });
```

- [ ] **Step 3: Commit**

```bash
cd /Users/brianlai/code/side-projects/SkillInstaller
git add src/commands/remove.ts src/index.ts
git commit -m "feat: remove command — uninstall a skill from Desktop"
```

---

### Task 11: Update command

**Files:**
- Create: `src/commands/update.ts`
- Modify: `src/index.ts`

- [ ] **Step 1: Implement update command**

Create `src/commands/update.ts`:

```typescript
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
    console.log(
      "Note: You may need to restart Claude Desktop for changes to take effect."
    );
  }
}
```

- [ ] **Step 2: Wire into CLI**

Add to `src/index.ts`:

```typescript
import { updateCommand } from "./commands/update.js";

program
  .command("update [skill-name]")
  .description("Update installed skills to the latest version")
  .action(async (skillName?: string) => {
    await updateCommand(skillName);
  });
```

- [ ] **Step 3: Commit**

```bash
cd /Users/brianlai/code/side-projects/SkillInstaller
git add src/commands/update.ts src/index.ts
git commit -m "feat: update command — pull latest and re-install skills"
```

---

### Task 12: Search command

**Files:**
- Create: `src/commands/search.ts`
- Modify: `src/index.ts`

- [ ] **Step 1: Implement search command**

Create `src/commands/search.ts`:

```typescript
import { readRegistry } from "../core/registry.js";
import { scanSkills } from "../core/scanner.js";
import { REGISTRY_PATH } from "../constants.js";
import { existsSync } from "fs";

export function searchCommand(query: string): void {
  const registry = readRegistry(REGISTRY_PATH);
  const repos = Object.entries(registry.repos);

  if (repos.length === 0) {
    console.log(
      "No repos cached yet. Install or list a repo first to enable search."
    );
    return;
  }

  const queryLower = query.toLowerCase();
  const results: Array<{
    name: string;
    description: string;
    source: string;
  }> = [];

  for (const [source, repo] of repos) {
    if (!existsSync(repo.localPath)) continue;
    const skills = scanSkills(repo.localPath);
    for (const skill of skills) {
      if (
        skill.name.toLowerCase().includes(queryLower) ||
        skill.description.toLowerCase().includes(queryLower)
      ) {
        results.push({
          name: skill.name,
          description: skill.description,
          source,
        });
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
```

- [ ] **Step 2: Wire into CLI**

Add to `src/index.ts`:

```typescript
import { searchCommand } from "./commands/search.js";

program
  .command("search <query>")
  .description("Search for skills across cached repos")
  .action((query: string) => {
    searchCommand(query);
  });
```

- [ ] **Step 3: Commit**

```bash
cd /Users/brianlai/code/side-projects/SkillInstaller
git add src/commands/search.ts src/index.ts
git commit -m "feat: search command — find skills across cached repos"
```

---

### Task 13: End-to-end test with real repo

**Files:** None (manual testing)

- [ ] **Step 1: Test listing skills from the founder-playbook repo**

```bash
cd /Users/brianlai/code/side-projects/SkillInstaller
npx tsx src/index.ts list getagentseal/founder-playbook
```

Expected: Lists ~14 skills with names like `mom-test`, `lean-startup`, `100m-offers`, etc.

- [ ] **Step 2: Test installing a single skill**

```bash
cd /Users/brianlai/code/side-projects/SkillInstaller
npx tsx src/index.ts install getagentseal/founder-playbook --skill mom-test
```

Expected: 
- Clones the repo (or pulls if already cached)
- Installs `mom-test` to Claude Desktop's skills directory
- Shows success message

- [ ] **Step 3: Verify the skill is in Desktop's directory**

```bash
ls ~/Library/Application\ Support/Claude/local-agent-mode-sessions/skills-plugin/af44cb8f-4918-430c-a08e-730919f7a6b3/b746b406-59da-4581-a597-2e23a3705f9a/skills/mom-test/
```

Expected: Shows `SKILL.md`, `frameworks.md`, `cases.md`, `examples.md`, `integration.md`

- [ ] **Step 4: Verify manifest was updated**

```bash
cat ~/Library/Application\ Support/Claude/local-agent-mode-sessions/skills-plugin/af44cb8f-4918-430c-a08e-730919f7a6b3/b746b406-59da-4581-a597-2e23a3705f9a/manifest.json | python3 -c "import sys,json; m=json.load(sys.stdin); print([s['skillId'] for s in m['skills']])"
```

Expected: List includes `"mom-test"` alongside the existing Anthropic skills.

- [ ] **Step 5: Test installed command**

```bash
cd /Users/brianlai/code/side-projects/SkillInstaller
npx tsx src/index.ts installed
```

Expected: Shows `mom-test` as installed from `getagentseal/founder-playbook`.

- [ ] **Step 6: Test search**

```bash
cd /Users/brianlai/code/side-projects/SkillInstaller
npx tsx src/index.ts search "customer"
```

Expected: Finds matching skills (likely `mom-test`).

- [ ] **Step 7: Test remove**

```bash
cd /Users/brianlai/code/side-projects/SkillInstaller
npx tsx src/index.ts remove mom-test
```

Expected: Removes skill files and manifest entry. Verify:

```bash
ls ~/Library/Application\ Support/Claude/local-agent-mode-sessions/skills-plugin/af44cb8f-4918-430c-a08e-730919f7a6b3/b746b406-59da-4581-a597-2e23a3705f9a/skills/mom-test/ 2>&1
```

Expected: "No such file or directory"

- [ ] **Step 8: Final commit**

```bash
cd /Users/brianlai/code/side-projects/SkillInstaller
git add -A
git commit -m "chore: finalize CLI with all commands wired up"
```
