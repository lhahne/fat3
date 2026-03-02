# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Mesocycle training planner built with Astro + React, deployed to Cloudflare Pages. Generates week-by-week training plans with Excel/PDF export support.

## Commands

- **Install**: `pnpm install`
- **Dev**: `pnpm dev` (http://localhost:4321)
- **Build**: `pnpm build`
- **Test all**: `pnpm test`
- **Test single file**: `pnpm test src/lib/planner.test.ts`
- **Test watch mode**: `pnpm test:watch`
- **Typecheck**: `pnpm typecheck`

**Use pnpm only.** Do not use npm or commit package-lock.json.

## TDD Workflow (Required)

Follow red-green-refactor for all feature changes:
1. Write a failing test
2. Implement minimal code to pass
3. Refactor with tests still green

## Architecture

**Stack**: Astro 5 (SSR/static) + React 19 (interactive UI) + TypeScript (strict) + Cloudflare Pages

**Key separation**: Business logic lives in `src/lib/`, UI in `src/components/`, pages in `src/pages/`.

### Core modules

- **`src/lib/planner.ts`** — Pure functions for mesocycle plan generation. Defines strength profiles (bodybuilding, powerlifting, balanced, endurance-support), session types, and exercise templates. Exports `generateProgram()`, `getRecommendedDefaults()`, `normalizeInputs()`.

- **`src/lib/exports/`** — Multi-format export pipeline using mapper→formatter→download pattern:
  - `service.ts` — Public API, lazy-loads formatters via dynamic `import()`
  - `mapper.ts` — Transforms `ProgramOutput` → `ExportModel`
  - `excel.ts` — ExcelJS workbook builder
  - `pdf.ts` — pdf-lib document builder
  - `types.ts` — Export type definitions

- **`src/components/MesocyclePlanner.tsx`** — Main container component orchestrating the planner UI. Uses local React state (no external state library).

- **`src/components/useTheme.ts`** — Theme hook with localStorage persistence and system preference fallback.

### Testing

Vitest with jsdom environment and React Testing Library. Tests are colocated with source files. Integration tests live in `tests/`.

### CI

GitHub Actions runs: test → typecheck → build (Node 20, pnpm 10).
