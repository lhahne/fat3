# Astro + React on Cloudflare Pages

Simple Astro app with a React counter component, configured for Cloudflare Pages and using `pnpm`.

## Requirements

- Node.js 20+
- pnpm 10+

## Local development

```bash
pnpm install
pnpm dev
```

Open `http://localhost:4321`.

## Testing (TDD workflow)

```bash
pnpm test
```

Tests include:
- React component behavior test (`src/components/CounterCard.test.tsx`)
- Integration build output test (`tests/index.integration.test.ts`)

## Production build

```bash
pnpm build
pnpm preview
```

## Cloudflare Pages deployment

Use these settings in Cloudflare Pages:

- Framework preset: `Astro`
- Build command: `pnpm build`
- Build output directory: `dist`
- Root directory: `/` (repo root)

The project includes `@astrojs/cloudflare` and `wrangler.jsonc` for Cloudflare runtime compatibility.

## Repository policy

- Use `pnpm` only.
- Do not use `npm`.
- Do not commit `package-lock.json`.
- See `AGENTS.md` for contributor instructions.
