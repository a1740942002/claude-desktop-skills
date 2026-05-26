# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

CLI tool (`claude-desktop-skills`) that packages skills from GitHub repos into `.skill` zip files for upload into Claude Desktop. Unlike `vercel-labs/skills` which targets Claude Code and other coding agents via symlinks, this tool produces the `.skill` format that Claude Desktop requires.

## Commands

```bash
bun src/index.ts              # Run CLI locally (dev mode)
bun run build                 # Build to dist/ (bun build, ESM, node target)
bun test                      # Run all tests
bun test tests/core/repo.test.ts  # Run a single test file
bun test --watch              # Watch mode
```

Releases use changesets: `bun run changeset` → `bun run version` → `bun run release`.

## Architecture

Three CLI commands wired up via Commander in `src/index.ts`:

- **`pack <owner/repo>`** — Clones repo to temp dir, scans for `SKILL.md` files, zips each skill directory into a `.skill` file, outputs to `skills-pack/`. Main workflow.
- **`list <owner/repo>`** — Clones and lists skills without packing.
- **`find <query>`** — Searches the local registry (`~/.claude-desktop-skills/registry.json`) for previously packed skills.

Core modules in `src/core/`:
- `github.ts` — Repo parsing, shallow clone via `simple-git`, recursive scan for directories containing `SKILL.md`, frontmatter extraction via `gray-matter`
- `zip.ts` — Zero-dependency zip file creation using raw deflate and manual ZIP format construction (no archive library)
- `registry.ts` — JSON read/write for the local registry file

A skill is identified by a directory containing a `SKILL.md` file with YAML frontmatter (`name`, `description`). The scan skips directories listed in `EXCLUDED_DIRS` in `constants.ts`.

## Key Conventions

- Runtime is Bun (both for running and testing), but the build target is Node
- ESM throughout — imports use `.js` extensions per Node16 module resolution
- No lint or format tooling configured
- Published to npm as `claude-desktop-skills` with `dist/` as the only published artifact
