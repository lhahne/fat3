import { readFileSync } from 'node:fs';

describe('homepage wiring', () => {
  it('mounts the planner component on the index page', () => {
    const source = readFileSync('src/pages/index.astro', 'utf-8');
    expect(source).toContain("import MesocyclePlanner from '../components/MesocyclePlanner';");
    expect(source).toContain('<MesocyclePlanner client:load />');
  });
});
