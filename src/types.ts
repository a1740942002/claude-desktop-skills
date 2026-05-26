export interface SkillMeta {
  name: string;
  description: string;
  files: string[];
}

export interface RegistrySkill {
  source: string;
  sourcePath: string;
  installedTo: string[];
  commitSha: string;
  installedAt: string;
  updatedAt: string;
  files: string[];
}

export interface RegistryRepo {
  localPath: string;
  lastPulled: string;
  commitSha: string;
}

export interface Registry {
  version: number;
  desktopPath: string | null;
  repos: Record<string, RegistryRepo>;
  skills: Record<string, RegistrySkill>;
}

export interface DesktopManifestSkill {
  skillId: string;
  name: string;
  description: string;
  creatorType: string;
  updatedAt: string;
  enabled: boolean;
}

export interface DesktopManifest {
  lastUpdated: number;
  skills: DesktopManifestSkill[];
}
