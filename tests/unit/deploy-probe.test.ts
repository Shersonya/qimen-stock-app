/** @jest-environment node */

import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

describe('deploy probe generator', () => {
  const outputPath = join(process.cwd(), 'public', 'deploy.json');

  it('writes the current commit probe for EdgeOne verification', async () => {
    const original = readFileSync(outputPath, 'utf8');

    try {
      const { buildDeployProbe, writeDeployProbe } = await import(
        '@/scripts/generate-deploy-probe.mjs'
      );
      const probe = buildDeployProbe(new Date('2026-04-23T08:00:00.000Z'));
      const written = writeDeployProbe(probe);
      const raw = JSON.parse(readFileSync(outputPath, 'utf8')) as typeof probe;

      expect(written).toEqual(probe);
      expect(raw).toEqual(probe);
      expect(raw.commit).toMatch(/^[0-9a-f]{40}$|^unknown$/);
      expect(raw.shortCommit).toMatch(/^[0-9a-f]{7,}$|^unknown$/);
      expect(raw.generatedAt).toBe('2026-04-23T08:00:00.000Z');
      expect(raw.platform).toBe('Tencent Cloud EdgeOne Pages');
    } finally {
      writeFileSync(outputPath, original);
    }
  });
});
