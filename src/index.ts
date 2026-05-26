#!/usr/bin/env node
import { Command } from "commander";
import { listCommand } from "./commands/list.js";
import { findCommand } from "./commands/find.js";
import { packCommand } from "./commands/pack.js";

const program = new Command();

program
  .name("claude-desktop-skills")
  .description("Package skills from GitHub repos for Claude Desktop")
  .version("0.1.0");

program
  .command("pack <repo>")
  .description("Package skills as .skill files for Claude Desktop upload")
  .option("-s, --skill <name>", "Package a specific skill only")
  .option("-o, --output <dir>", "Output directory (default: ./skills-pack)")
  .action(async (repo: string, options: { skill?: string; output?: string }) => {
    await packCommand(repo, options);
  });

program
  .command("list <repo>")
  .description("List available skills in a GitHub repo")
  .action(async (repo: string) => {
    await listCommand(repo);
  });

program
  .command("find <query>")
  .description("Search for skills across cached repos")
  .action((query: string) => {
    findCommand(query);
  });

program.parse();
