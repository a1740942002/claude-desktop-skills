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
