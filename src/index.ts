#!/usr/bin/env node
import { Command } from "commander";
import { installCommand } from "./commands/install.js";
import { listCommand } from "./commands/list.js";
import { installedCommand } from "./commands/installed.js";
import { removeCommand } from "./commands/remove.js";
import { updateCommand } from "./commands/update.js";
import { searchCommand } from "./commands/search.js";
import { packCommand } from "./commands/pack.js";

const program = new Command();

program
  .name("skpkg")
  .description("Install skills from GitHub repos into Claude Desktop")
  .version("0.1.0");

program
  .command("install <repo>")
  .description("Install skills from a GitHub repo")
  .option("-s, --skill <name>", "Install a specific skill only")
  .action(async (repo: string, options: { skill?: string }) => {
    await installCommand(repo, options);
  });

program
  .command("list <repo>")
  .description("List available skills in a GitHub repo")
  .action(async (repo: string) => {
    await listCommand(repo);
  });

program
  .command("installed")
  .description("List all installed skills")
  .action(() => {
    installedCommand();
  });

program
  .command("remove <skill-name>")
  .description("Remove an installed skill")
  .action((skillName: string) => {
    removeCommand(skillName);
  });

program
  .command("update [skill-name]")
  .description("Update installed skills to the latest version")
  .action(async (skillName?: string) => {
    await updateCommand(skillName);
  });

program
  .command("search <query>")
  .description("Search for skills across cached repos")
  .action((query: string) => {
    searchCommand(query);
  });

program
  .command("pack <repo>")
  .description("Package skills as .skill files for Claude Desktop upload")
  .option("-s, --skill <name>", "Package a specific skill only")
  .option("-o, --output <dir>", "Output directory (default: ./skills-pack)")
  .action(async (repo: string, options: { skill?: string; output?: string }) => {
    await packCommand(repo, options);
  });

program.parse();
