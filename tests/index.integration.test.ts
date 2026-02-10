import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

describe('homepage build output', () => {
  it('contains app heading in generated html', () => {
    execSync('pnpm build', { stdio: 'pipe' });

    const html = readFileSync('dist/index.html', 'utf-8');
    expect(html).toContain('Astro + React on Cloudflare Pages');
    expect(html).toMatch(/Count:\s*(?:<!-- -->)?0/);
  });
});
