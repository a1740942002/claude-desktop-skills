# skpkg

CLI tool that packages skills from GitHub repos into `.skill` files for Claude Desktop.

## Quick Start

```bash
npx skpkg pack getagentseal/founder-playbook
```

Then upload in Claude Desktop: **Customize → Skills → + → Create skill → Upload a skill**

![Upload a skill in Claude Desktop](images/upload-skill.png)

Works with `npx` and `bunx`.

## Commands

```bash
# Pack all skills from a repo
skpkg pack getagentseal/founder-playbook

# Pack a specific skill
skpkg pack getagentseal/founder-playbook --skill mom-test

# Custom output directory
skpkg pack getagentseal/founder-playbook --output ./my-skills

# List skills in a repo (without packing)
skpkg list getagentseal/founder-playbook

# Search across cached repos
skpkg search "customer"
```

Output goes to `skills-pack/<repo>-<timestamp>/` with a README and all `.skill` files.

## Install globally (optional)

```bash
npm install -g skpkg
```

## How it works

1. Clones the GitHub repo locally (temp, removed after packing)
2. Scans for directories containing `SKILL.md`
3. Extracts name/description from YAML frontmatter
4. Zips each skill folder into a `.skill` file (the format Claude Desktop expects)

## Why not `npx skills`?

[`vercel-labs/skills`](https://github.com/vercel-labs/skills) is a general-purpose skill manager for 55+ AI coding agents (Claude Code, Cursor, Copilot, etc.). It installs skills by symlinking into agent-specific directories like `.claude/skills/`.

**skpkg solves a different problem** — it targets **Claude Desktop**, which doesn't read from `.claude/skills/`. Claude Desktop requires `.skill` files uploaded through its UI. No other tool produces this format.

| | skpkg | vercel-labs/skills |
|---|---|---|
| Target | Claude Desktop | Claude Code + 55 agents |
| Output | `.skill` zip files for upload | Symlinks to agent directories |
| Workflow | `npx skpkg pack` → upload in UI | `npx skills add` → ready to use |
| Unique value | Only tool that produces `.skill` format | Multi-agent support |

**TL;DR** — Use `vercel-labs/skills` if you're in Claude Code or other coding agents. Use `skpkg` if you need skills in **Claude Desktop**.
