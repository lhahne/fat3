# PDF / Printout Spec (Exercise Programs)

This repo exports exercise programs as **generated PDFs** (not “print the HTML page”). The goal of this spec is to make exported PDFs **gym-usable**, **print-friendly**, and **predictable** while staying deterministic/testable.

## Current implementation (baseline)

- PDF export is implemented with `pdf-lib` in `src/lib/exports/pdf.ts`.
- Export flow:
  - UI triggers `exportProgramAsPdf()` from `src/lib/exports/service.ts` (downloads a generated blob).
  - Program data is mapped into an `ExportModel` by `src/lib/exports/mapper.ts`.
  - `buildPdfRenderModel()` creates pages: **cover** + **one page per week**.
  - `buildPdfBytes()` draws:
    - A full-page background fill + top header band.
    - A weekly grid (7 columns, 1 row) with small text and (optional) color-coded cell backgrounds.
- Export options are exposed in the UI modal in `src/components/MesocyclePlanner.tsx` and passed through `ExportOptions`.
- `ExportOptions.detail` and `includeProgressionChart` are reflected in the PDF render model (`sessionDetail` pages and optional `progressionSummary` page).

## Goals

1. **Print-first usability**: readable at arm’s length, low cognitive load, easy to mark up with a pen.
2. **Ink-friendly defaults**: clean in grayscale and on cheap printers.
3. **Content hierarchy**: overview → week → session details (optional), with consistent placement.
4. **Deterministic output**: stable layout and testable render model; avoid hidden time-dependent content unless explicitly injected.
5. **Paper compatibility**: Letter + A4; portrait/landscape; safe margins for non-borderless printers.

## Non-goals (for now)

- Fully accessible tagged PDFs (pdf-lib does not produce fully tagged PDFs).
- Pixel-perfect equivalence across all PDF viewers (we target consistent results in common viewers/printers).
- Replacing the PDF generator with a headless browser (keep pdf-lib unless requirements force a switch).

## Best-practice principles for exercise program printouts

### Layout & readability
- **Minimum font sizes**:
  - Body: 10–11 pt equivalent
  - Secondary text: 9 pt minimum
  - Avoid < 9 pt for core info (especially in a 7-column grid).
- Use **whitespace and grouping** over heavy backgrounds.
- Prefer **short labels** and **consistent placement** (e.g., “Effort”, “RIR”, “Target” always in the same spot).
- Don’t rely on color alone to convey meaning; include **patterns/labels** that survive grayscale.

### Printer-safe design
- Default to **“Ink-saver”** styling:
  - White background, thin borders, minimal fills.
  - Optional light tinting for session types; avoid full-cell saturated fills.
- Respect **safe margins** (at least 0.5 in / ~36 pt) and avoid placing critical content near edges.

### Gym workflow fit
- Include **checkboxes** (or empty circles) for completion marking.
- Provide **notes space** where it matters (session-level and/or exercise-level).
- Keep “what do I do today?” at the top of a session detail page.
- Show only the **most actionable** fields by default; keep deep metadata optional.

### Content correctness
- If a session has a “main set” concept, show it explicitly; don’t depend on block index conventions.
- Always include:
  - Program identity (focus/level/profile), weeks range, export mode
  - Week objective and deload indicator
  - Session effort / difficulty markers (and what the scale means somewhere)

### Determinism & versioning
- If a timestamp is included, it must be **provided as an explicit input** (not `new Date()` inside mapping/layout functions).
- Include a small, non-intrusive **version string** (app/version) when available, so users can compare PDFs.

## Proposed PDF structure

The PDF should be generated from a render model that supports **pagination** and **multiple page templates**.

### Export modes (user-facing)

1. `compact` (calendar-focused)
   - 1 cover page
   - 1 page per week: weekly calendar grid + small weekly summary
2. `detailed` (calendar + workout details)
   - 1 cover page
   - 1 page per week: weekly calendar grid
   - 1–N pages per week: per-session detail pages (only training days)

### Page templates

**A) Cover page**
- Title: “Mesocycle Program”
- Subtitle: focus · level · strength profile · export mode
- Summary panel:
  - Mesocycle length, sessions/week, deload behavior
  - Totals (sessions, strength/endurance split, deload weeks)
- Legend (optional):
  - Session types with color + pattern + label (must work in grayscale)
- “How to use” micro-instructions (short):
  - Effort scale meaning (1–5)
  - RIR meaning (if used)
  - Safety note/disclaimer (1–2 lines)

**B) Week overview page**
- Header:
  - Program title (small)
  - Week number + objective + deload badge (if applicable)
- Weekly grid (7 columns):
  - Each day cell contains:
    - Day label (Mon…Sun)
    - Session title (or “Rest”)
    - Session type
    - Effort indicator
    - “Main prescription” 1-liner (optional, only if it’s truly “main”)
    - Completion checkbox
- Footer:
  - Page number `x / y`
  - Optional export timestamp (if provided)

**C) Session detail page (detailed mode)**
- Header:
  - Week + day + session title
  - Session type + objective + effort
  - Target (e.g., RPE/HR/Time/Distance) if present
- Workout blocks:
  - Each block as a section with a compact table:
    - Checkbox | Exercise | Sets | Reps | RIR | Notes (blank line)
  - If the source prescription cannot be parsed into Sets/Reps/RIR, fall back to “Prescription” column.
- Notes area:
  - “Session notes” with 4–6 ruled lines.

**D) Progression summary page (optional)**
- Only when `includeProgressionChart === true`
- Contains:
  - A small table of weekly summary metrics (sessions, avg effort, deload)
  - A simple chart (e.g., bars/line) with axis labels that print well in grayscale

## Data mapping rules

- Week/day ordering: Mon → Sun (fixed).
- “Main prescription” selection:
  - Prefer an explicit field if available (future: compute `workout.mainPrescription`).
  - Otherwise select the first “main” exercise heuristically (don’t hard-code `blocks[1]`).
- Detailed tables:
  - Parse `NxM @ RIR` into columns when possible; otherwise place the full string into “Prescription”.
- Rest/recovery days:
  - Show “Rest” (or “Recovery”) clearly and omit detailed pages.

## Styling rules (PDF drawing)

- Use a shared **spacing scale** and typography tokens:
  - `margin`, `gutter`, `headerHeight`, `fontSizes`, `lineHeights`
- Avoid full-page background fills in ink-saver mode.
- Ensure all text stays within `[margin, pageWidth - margin]` and `[margin, pageHeight - margin]`.
- Grid cell backgrounds:
  - In color mode: very light tint only (≤ ~10–15%).
  - In grayscale mode: no tint; use border + a small icon/pattern in the corner.

## Options & defaults

- Paper size:
  - Default: `letter` (US) but allow switching to `a4`.
- Orientation:
  - Default: `auto` (compact → landscape, detailed → portrait) as currently implemented.
- Theme:
  - `grayscale` boolean remains.
  - Add `inkSaver` boolean (default `true`) OR replace `grayscale` with `theme: 'ink-saver' | 'color' | 'grayscale'`.
- Include:
  - `includeLegend` default `true`
  - `includeProgressionChart` default `false` unless explicitly enabled

## Determinism requirements

- `mapProgramToExportModel()` should accept a `now` (Date/ISO string) injected from the caller so tests can freeze time.
- `buildPdfRenderModel()` should not read the system clock.
- `buildPdfBytes()` should be deterministic for the same render model and options.

## Testing strategy

1. Render model tests (fast, deterministic):
   - Snapshot/structural tests for page count, template selection, and key text strings.
2. PDF smoke tests (existing pattern in `src/lib/exports/pdf.test.ts`):
   - Generated bytes are non-empty.
   - PDF loads successfully.
   - Page count matches render model.
3. Layout invariants (unit tests):
   - No content is positioned outside margins (validate coordinates from the render model/layout step).

## Implementation plan (incremental)

1. **Introduce explicit page templates** in the render model:
   - `cover`, `weekOverview`, `sessionDetail`, `progressionSummary`
2. **Refactor PDF drawing**:
   - Split drawing into template-specific functions.
   - Add a lightweight layout step that computes coordinates and handles pagination for session details.
3. **Keep time injectable**:
   - Preserve `nowIso` injection from exporter → mapper/render model for deterministic tests.
4. **Wire up missing options**:
   - Expose paper size, grayscale/theme, legend, progression chart toggles in UI.
5. **Add session detail pages** for `ExportOptions.detail === 'full'` in detailed mode.
6. **Tune typography/ink usage**:
   - Raise minimum core font sizes; reduce background fills; add patterns/icons for session types.
7. **Expand tests**:
   - Add deterministic render model snapshots with frozen time.
   - Add page-count and margin invariants.

## Acceptance criteria

- Compact mode prints a week-per-page overview that remains readable in grayscale on Letter and A4.
- Detailed mode includes per-session detail pages with checkboxes and notes space.
- PDF output is deterministic under a frozen `nowIso`.
- Export options in the UI map 1:1 to PDF output behavior.
