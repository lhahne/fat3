import type { ProgramOutput } from '../planner';

export type ExportScope = 'all' | 'selected';
export type ExportDetail = 'calendar-only' | 'full';
export type PdfMode = 'compact' | 'detailed';
export type PaperSize = 'letter' | 'a4';
export type Orientation = 'portrait' | 'landscape' | 'auto';

export type ExportOptions = {
  scope: ExportScope;
  selectedWeeks?: number[];
  detail: ExportDetail;
  pdfMode: PdfMode;
  paperSize: PaperSize;
  orientation: Orientation;
  grayscale: boolean;
  includeLegend: boolean;
  includeProgressionChart: boolean;
};

export type OverviewRow = { key: string; value: string };

export type CalendarRow = {
  Week: number;
  Objective: string;
  Mon: string;
  Tue: string;
  Wed: string;
  Thu: string;
  Fri: string;
  Sat: string;
  Sun: string;
};

export type WorkoutRow = Record<string, string | number>;

export type ProgressionRow = {
  Week: number;
  Objective: string;
  'Is Deload Week': string;
  'Planned Sessions': number;
  'Strength Sessions': number;
  'Endurance Sessions': number;
  'Rest Days': number;
  'Avg Effort': number;
  'Hard Endurance Sessions': number;
  'Collision Adjustments': number;
};

export type ExportModel = {
  program: ProgramOutput;
  options: ExportOptions;
  filteredWeeks: ProgramOutput['weeks'];
  overview: OverviewRow[];
  calendarRows: CalendarRow[];
  workoutRows: WorkoutRow[];
  progressionRows: ProgressionRow[];
};

export type PdfRenderPage = {
  title: string;
  subtitle?: string;
  lines: string[];
};

export type PdfRenderModel = {
  pages: PdfRenderPage[];
};
