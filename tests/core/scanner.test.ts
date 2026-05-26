import { describe, it, expect, beforeEach, afterEach } from "bun:test";
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
