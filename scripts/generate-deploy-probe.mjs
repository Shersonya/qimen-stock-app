import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const outputPath = join(rootDir, 'public', 'deploy.json');

function readGitValue(args, fallback) {
  try {
    return execFileSync('git', args, {
      cwd: rootDir,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return fallback;
  }
}

export function buildDeployProbe(now = new Date()) {
  const commit = readGitValue(['rev-parse', 'HEAD'], process.env.GITHUB_SHA ?? 'unknown');
  const shortCommit = readGitValue(
    ['rev-parse', '--short', 'HEAD'],
    commit === 'unknown' ? 'unknown' : commit.slice(0, 7),
  );
  const branch = readGitValue(
    ['rev-parse', '--abbrev-ref', 'HEAD'],
    process.env.GITHUB_REF_NAME ?? 'unknown',
  );

  return {
    commit,
    shortCommit,
    branch,
    generatedAt: now.toISOString(),
    platform: 'Tencent Cloud EdgeOne Pages',
  };
}

export function writeDeployProbe(probe = buildDeployProbe()) {
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(probe, null, 2)}\n`);
  return probe;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const probe = writeDeployProbe();
  console.log(`Generated public/deploy.json for ${probe.shortCommit}`);
}
