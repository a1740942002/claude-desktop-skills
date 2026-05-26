import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { dirname } from "path";
import type { Registry } from "../types.js";
import { EMPTY_REGISTRY } from "../constants.js";

export function readRegistry(path: string): Registry {
  if (!existsSync(path)) {
    return { ...EMPTY_REGISTRY, repos: {}, skills: {} };
  }
  const raw = readFileSync(path, "utf-8");
  return JSON.parse(raw) as Registry;
}

export function writeRegistry(path: string, registry: Registry): void {
  const dir = dirname(path);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  writeFileSync(path, JSON.stringify(registry, null, 2));
}
