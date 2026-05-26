#!/usr/bin/env node
import { Command } from "commander";

const program = new Command();

program
  .name("skill-installer")
  .description("Install skills from GitHub repos into Claude Desktop")
  .version("0.1.0");

program.parse();
