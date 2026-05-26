import { describe, it, expect, beforeEach, afterEach } from "bun:test";
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
