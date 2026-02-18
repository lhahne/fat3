# Mesocycle Planner (Astro + React + Cloudflare)

This repository contains a mesocycle training planner built with Astro and React. The app generates week-by-week training plans and supports Excel/PDF export.

## Requirements

- Node.js 20+
- pnpm 10+

## Local development

```bash
pnpm install
pnpm dev
```

Open `http://localhost:4321`.

## Scripts

```bash
pnpm test
pnpm typecheck
pnpm build
pnpm preview
```

## Tests

Key tests include:
- Planner generation logic: `src/lib/planner.test.ts`
- Planner UI behavior: `src/components/MesocyclePlanner.test.tsx`
- Export mapper/service/formatters: `src/lib/exports/*.test.ts`
- Homepage wiring smoke test: `tests/index.integration.test.ts`

## Cloudflare Pages deployment

Use these settings in Cloudflare Pages:

- Framework preset: `Astro`
- Build command: `pnpm build`
- Build output directory: `dist`
- Root directory: `/` (repo root)

The project uses `@astrojs/cloudflare` and includes `wrangler.jsonc` for Cloudflare runtime compatibility.

## Repository policy

- Use `pnpm` only.
- Do not use `npm`.
- Do not commit `package-lock.json`.
- Follow the contributor instructions in `AGENTS.md`.
