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
