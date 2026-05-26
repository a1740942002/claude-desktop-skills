import { describe, it, expect, beforeEach, afterEach } from "bun:test";
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
