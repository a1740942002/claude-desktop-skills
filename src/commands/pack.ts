import { join } from "path";
import { mkdirSync, existsSync, writeFileSync } from "fs";
import { execSync } from "child_process";
import { parseRepoId, cloneOrPull, repoLocalPath } from "../core/repo.js";
import { scanSkills, findSkillDir } from "../core/scanner.js";

function timestamp(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const h = String(now.getHours()).padStart(2, "0");
  const min = String(now.getMinutes()).padStart(2, "0");
  return `${y}${m}${d}-${h}${min}`;
}

export async function packCommand(
  repoInput: string,
  options: { skill?: string; output?: string }
): Promise<void> {
  const repoId = parseRepoId(repoInput);
  const localPath = repoLocalPath(repoId.owner, repoId.repo);

  if (!existsSync(localPath)) {
    console.log(`Cloning ${repoId.owner}/${repoId.repo}...`);
    await cloneOrPull(repoId);
  }

  const { commitSha } = await cloneOrPull(repoId);

  const allSkills = scanSkills(localPath);
  if (allSkills.length === 0) {
    console.error(`No skills found in ${repoInput}.`);
    process.exit(1);
  }

  const skillsToPack = options.skill
    ? allSkills.filter((s) => s.name === options.skill)
    : allSkills;

  if (skillsToPack.length === 0) {
    console.error(
      `Skill "${options.skill}" not found. Available: ${allSkills.map((s) => s.name).join(", ")}`
    );
    process.exit(1);
  }

  const folderName = `${repoId.repo}-${timestamp()}`;
  const outputDir = options.output ?? join(process.cwd(), "skills-pack", folderName);
  mkdirSync(outputDir, { recursive: true });

  const packedSkills: Array<{ name: string; description: string }> = [];

  for (const skill of skillsToPack) {
    const skillDir = findSkillDir(localPath, skill.name);
    if (!skillDir) {
      console.warn(`  ⚠ Could not locate directory for ${skill.name}, skipping`);
      continue;
    }

    const outputPath = join(outputDir, `${skill.name}.skill`);
    const parentDir = join(skillDir, "..");

    execSync(`cd "${parentDir}" && zip -r "${outputPath}" "${skill.name}" -x "*.DS_Store"`, {
      stdio: "pipe",
    });

    console.log(`  ✓ ${skill.name}.skill`);
    packedSkills.push({ name: skill.name, description: skill.description });
  }

  const readmeLines = [
    `# ${repoId.repo}`,
    "",
    `Source: https://github.com/${repoId.owner}/${repoId.repo}`,
    `Packed: ${new Date().toISOString()}`,
    `Commit: ${commitSha.slice(0, 7)}`,
    "",
    "## Install",
    "",
    "Claude Desktop → Customize → Skills → **+** → Create skill → **Upload a skill**",
    "",
    "## Skills",
    "",
    ...packedSkills.map((s) => `- **${s.name}** — ${s.description.slice(0, 80)}`),
    "",
  ];
  writeFileSync(join(outputDir, "README.md"), readmeLines.join("\n"));

  console.log(`\nPacked ${packedSkills.length} skill(s) to ${outputDir}/`);
  console.log(
    `\nTo install: Claude Desktop → Customize → Skills → + → Create skill → Upload a skill`
  );
}
