import { readFileSync } from 'node:fs';

describe('homepage wiring', () => {
  it('mounts the app shell component on the index page', () => {
    const source = readFileSync('src/pages/index.astro', 'utf-8');
    expect(source).toContain("import { AppShell } from '../components/AppShell';");
    expect(source).toContain('<AppShell client:load />');
  });

  it('has a catch-all route that mounts AppShell for SPA routing', () => {
    const source = readFileSync('src/pages/[...slug].astro', 'utf-8');
    expect(source).toContain("import { AppShell } from '../components/AppShell';");
    expect(source).toContain('<AppShell client:load />');
  });
});
