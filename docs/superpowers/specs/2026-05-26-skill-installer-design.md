# Skill Installer — Design Spec

A TypeScript CLI tool that installs skills from GitHub repos into Claude Desktop and Claude Code.

## Problem

Third-party skill repos (e.g., `getagentseal/founder-playbook`) contain valuable skills as `SKILL.md` files but are not structured as Claude plugin marketplaces. Users currently have no simple way to install these skills into Claude Desktop or Claude Code.

## Goals

- Install skills from any GitHub repo containing `SKILL.md` files into Claude Desktop
- Full lifecycle management: install, update, remove, list, search
- Support Claude Code as a secondary target (future phase)
- Personal tool — optimized for the author's workflow

## Non-Goals

- Publishing to npm or building for public distribution
- Supporting non-GitHub sources (local directories, URLs) in v1
- Building a skill marketplace or discovery service
- Supporting Claude Desktop's `.zip` import UI (direct injection is faster)

## Architecture

### Overview

```
┌──────────────┐     ┌──────────────┐     ┌─────────────────┐
│  GitHub Repo  │────▶│ skill-installer│────▶│  Claude Desktop  │
│  (SKILL.md)  │     │    CLI        │     │  skills-plugin/  │
└──────────────┘     └──────────────┘     └─────────────────┘
                            │
                            ▼
                     ┌──────────────┐
                     │  Registry     │
                     │  ~/.skill-    │
                     │  installer/   │
                     └──────────────┘
```

### Directory Layout

```
~/.skill-installer/
  registry.json         # Tracks all installed skills
  repos/                # Cloned GitHub repos
    getagentseal/
      founder-playbook/
        .git/
        mom-test/
          SKILL.md
          frameworks.md
          ...
```

### Claude Desktop Integration

Skills are injected into Claude Desktop's skills-plugin directory:

```
~/Library/Application Support/Claude/
  local-agent-mode-sessions/
    skills-plugin/
      {org-id}/
        {user-id}/
          manifest.json          # ← append skill entries here
          skills/
            mom-test/            # ← copy skill folder here
              SKILL.md
              frameworks.md
              cases.md
              examples.md
              integration.md
```

The `manifest.json` entry format:

```json
{
  "skillId": "mom-test",
  "name": "mom-test",
  "description": "Extracted from SKILL.md YAML frontmatter",
  "creatorType": "user",
  "updatedAt": "2026-05-26T12:00:00.000Z",
  "enabled": true
}
```

### Claude Code Integration (Phase 2)

For Claude Code, skills will be installed to `~/.claude/skills/<name>/`:

```
~/.claude/skills/
  mom-test/
    SKILL.md
    frameworks.md
    ...
```

This is the "local skills" mechanism — no marketplace registration needed. Claude Code automatically discovers skills in this directory.

## CLI Commands

### `skill-installer install <repo> [options]`

Install skills from a GitHub repo.

```bash
# Install all skills from a repo
skill-installer install getagentseal/founder-playbook

# Install a specific skill
skill-installer install getagentseal/founder-playbook --skill mom-test

# Install to Claude Code instead (phase 2)
skill-installer install getagentseal/founder-playbook --target code

# Default target is "desktop"
# Equivalent to: skill-installer install getagentseal/founder-playbook --target desktop
```

**Flow:**
1. Parse repo identifier (owner/repo format)
2. Clone or pull the repo to `~/.skill-installer/repos/<owner>/<repo>/`
3. Scan for directories containing `SKILL.md`
4. For each skill to install:
   a. Parse YAML frontmatter from `SKILL.md` to extract `name` and `description`
   b. Copy skill directory to Desktop's `skills-plugin/.../skills/<skill-name>/`
   c. Append entry to Desktop's `manifest.json`
   d. Record in `~/.skill-installer/registry.json`
5. Print summary of installed skills

### `skill-installer list <repo>`

List available skills in a GitHub repo without installing.

```bash
skill-installer list getagentseal/founder-playbook
```

**Output:**
```
Skills in getagentseal/founder-playbook:
  mom-test         — Customer interview framework for validating business ideas
  lean-startup     — Build-measure-learn methodology for startups
  100m-offers       — Framework for creating irresistible offers
  ...
  (14 skills total)
```

### `skill-installer installed`

List all installed skills.

```bash
skill-installer installed
```

**Output:**
```
Installed skills:
  mom-test         [desktop] from getagentseal/founder-playbook (abc123, 2026-05-26)
  lean-startup     [desktop] from getagentseal/founder-playbook (abc123, 2026-05-26)
```

### `skill-installer remove <skill-name>`

Remove an installed skill.

```bash
skill-installer remove mom-test
```

**Flow:**
1. Look up skill in registry
2. Remove skill directory from Desktop's `skills-plugin/.../skills/<skill-name>/`
3. Remove entry from Desktop's `manifest.json`
4. Remove from registry

### `skill-installer update [skill-name]`

Update installed skills to the latest version.

```bash
# Update all skills
skill-installer update

# Update a specific skill
skill-installer update mom-test
```

**Flow:**
1. For each installed skill (or specified skill):
   a. `git pull` the source repo
   b. Compare current commit SHA with registry
   c. If changed, re-copy skill files and update manifest
   d. Update registry with new commit SHA

### `skill-installer search <query>`

Search for skills across installed repos.

```bash
skill-installer search "customer interview"
```

**Flow:**
1. Search all cloned repos' skill names and descriptions
2. Simple substring/fuzzy match on name + description
3. Show matching skills with their source repo

## Skill Detection

### Scanning Algorithm

1. Walk the repo directory tree (max depth 3)
2. Find all directories containing a file named `SKILL.md`
3. Exclude common non-skill directories: `.git`, `node_modules`, `.github`, `docs/superpowers`

### Frontmatter Parsing

Extract `name` and `description` from YAML frontmatter in `SKILL.md`:

```yaml
---
name: mom-test
description: "Customer interview framework for validating business ideas..."
---
```

**Fallbacks:**
- If no `name`: use directory name
- If no `description`: use first paragraph of markdown content (truncated to 200 chars)

### Supporting Files

When copying a skill, copy the entire skill directory — not just `SKILL.md`. This preserves supporting files like `frameworks.md`, `cases.md`, `examples.md`, `integration.md`.

## Desktop Path Resolution

The Claude Desktop skills-plugin path contains org and user UUIDs:

```
~/Library/Application Support/Claude/local-agent-mode-sessions/skills-plugin/{org-id}/{user-id}/
```

**Resolution strategy:**
1. Scan `skills-plugin/` for subdirectories
2. Find the first path that contains a `manifest.json` with a `skills` array
3. Cache the resolved path in the registry for future use
4. If multiple org/user combos exist, prompt the user to select

## Registry Format

```json
{
  "version": 1,
  "desktopPath": "~/Library/Application Support/Claude/local-agent-mode-sessions/skills-plugin/{org}/{user}",
  "repos": {
    "getagentseal/founder-playbook": {
      "localPath": "~/.skill-installer/repos/getagentseal/founder-playbook",
      "lastPulled": "2026-05-26T12:00:00.000Z",
      "commitSha": "abc123def456"
    }
  },
  "skills": {
    "mom-test": {
      "source": "getagentseal/founder-playbook",
      "sourcePath": "mom-test",
      "installedTo": ["desktop"],
      "commitSha": "abc123def456",
      "installedAt": "2026-05-26T12:00:00.000Z",
      "updatedAt": "2026-05-26T12:00:00.000Z",
      "files": ["SKILL.md", "frameworks.md", "cases.md", "examples.md", "integration.md"]
    }
  }
}
```

## Technical Stack

- **Language:** TypeScript
- **Runtime:** Node.js (>= 18)
- **CLI framework:** Commander.js
- **Git:** simple-git (or shell out to git)
- **YAML parsing:** gray-matter (for YAML frontmatter extraction)
- **No build step:** Run via `tsx` during development; optionally compile for production

## Project Structure

```
SkillInstaller/
  package.json
  tsconfig.json
  src/
    index.ts              # CLI entry point, command definitions
    commands/
      install.ts          # install command
      list.ts             # list command
      installed.ts        # installed command
      remove.ts           # remove command
      update.ts           # update command
      search.ts           # search command
    core/
      repo.ts             # Git clone/pull operations
      scanner.ts          # Skill detection and frontmatter parsing
      desktop.ts          # Claude Desktop integration (path resolution, manifest, file ops)
      registry.ts         # Registry read/write
    types.ts              # Shared type definitions
    constants.ts          # Paths, defaults
```

## Edge Cases

- **Repo has no SKILL.md files:** Error with helpful message
- **Skill name conflicts:** Warn if a skill with the same name is already installed from a different repo. Ask to overwrite or skip.
- **Desktop app not installed:** Detect missing Desktop path and error gracefully
- **Desktop app running during install:** Skills may not appear until Desktop is restarted. Print a note.
- **SKILL.md without frontmatter:** Fall back to directory name and first paragraph
- **Nested skills (SKILL.md inside subdirectories of skill folders):** Only detect top-level skills (direct parent of SKILL.md)
- **Large repos:** Only clone with depth=1 for speed

## Risks and Mitigations

| Risk | Mitigation |
|------|------------|
| Desktop overwrites manifest on update | Registry tracks what we installed; `update` can re-inject after Desktop updates |
| Desktop path UUIDs change | Re-scan on each operation; cache is just an optimization |
| Desktop rejects `creatorType: "user"` | Try `"anthropic"` as fallback; test empirically |
| Repo structure varies wildly | Scanner is lenient — any dir with SKILL.md works |

## Future Enhancements (Not in v1)

- Claude Code target (`--target code`)
- `.zip` / `.skill` packaging for Desktop's import UI
- Skill templates for creating new skills
- Multiple source support (local dirs, URLs, gists)
- Auto-update via cron
