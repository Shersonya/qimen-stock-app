declare module '@/scripts/generate-deploy-probe.mjs' {
  export type DeployProbe = {
    commit: string;
    shortCommit: string;
    branch: string;
    generatedAt: string;
    platform: string;
  };

  export function buildDeployProbe(now?: Date): DeployProbe;

  export function writeDeployProbe(probe?: DeployProbe): DeployProbe;
}
