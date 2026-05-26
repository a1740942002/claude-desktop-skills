import { join } from "path";
import { mkdirSync, readFileSync, writeFileSync } from "fs";
import { parseRepoId, cloneRepo, listSkillsFromLocal } from "../core/github.js";
import { createZip } from "../core/zip.js";

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
  const { owner, repo } = parseRepoId(repoInput);

  console.log(`Cloning ${owner}/${repo}...`);
  const cloned = await cloneRepo(owner, repo);

  try {
    const allSkills = listSkillsFromLocal(cloned.localPath);

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

    const folderName = `${repo}-${timestamp()}`;
    const outputDir =
      options.output ?? join(process.cwd(), "skills-pack", folderName);
    mkdirSync(outputDir, { recursive: true });

    const packedSkills: Array<{ name: string; description: string }> = [];

    for (const skill of skillsToPack) {
      const outputPath = join(outputDir, `${skill.name}.skill`);
      const entries: Array<{ name: string; data: Buffer }> = [];

      for (const fileName of skill.files) {
        const filePath = join(skill._localDir!, fileName);
        try {
          const content = readFileSync(filePath);
          entries.push({ name: `${skill.name}/${fileName}`, data: content });
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          console.warn(`  ⚠ Could not read ${skill.name}/${fileName}: ${msg}`);
        }
      }

      writeFileSync(outputPath, createZip(entries));
      console.log(`  ✓ ${skill.name}.skill (${entries.length} files)`);
      packedSkills.push({ name: skill.name, description: skill.description });
    }

    const readmeLines = [
      `# ${repo}`,
      "",
      `Source: https://github.com/${owner}/${repo}`,
      `Packed: ${new Date().toISOString()}`,
      `Commit: ${cloned.info.commitSha.slice(0, 7)}`,
      "",
      "## Install",
      "",
      "Claude Desktop → Customize → Skills → **+** → Create skill → **Upload a skill**",
      "",
      "## Skills",
      "",
      ...packedSkills.map(
        (s) => `- **${s.name}** — ${s.description.slice(0, 80)}`
      ),
      "",
    ];
    writeFileSync(join(outputDir, "README.md"), readmeLines.join("\n"));

    console.log(`\nPacked ${packedSkills.length} skill(s) to ${outputDir}/`);
    console.log(
      `\nTo install: Claude Desktop → Customize → Skills → + → Create skill → Upload a skill`
    );
  } finally {
    cloned.cleanup();
  }
}
