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
  inkSaver: boolean;
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

export type PdfRenderPage =
  | {
      kind: 'cover';
      title: string;
      subtitle?: string;
      lines: string[];
      howToUse: string[];
    }
  | {
      kind: 'weekOverview';
      title: string;
      subtitle?: string;
      weekIndex: number;
      objective: string;
      isDeloadWeek: boolean;
      weekSummary: string;
      days: ProgramOutput['weeks'][number]['days'];
      pageNumber: number;
      pageCount: number;
      exportTimestamp?: string;
    }
  | {
      kind: 'sessionDetail';
      title: string;
      subtitle?: string;
      weekIndex: number;
      dayLabel: string;
      objective: string;
      effort: number;
      sessionType: string;
      target?: string;
      sessionTitle: string;
      blocks: NonNullable<ProgramOutput['weeks'][number]['days'][number]['workout']>['blocks'];
      notes?: string;
      pageNumber: number;
      pageCount: number;
    }
  | {
      kind: 'progressionSummary';
      title: string;
      subtitle?: string;
      rows: ProgressionRow[];
      pageNumber: number;
      pageCount: number;
    };

export type PdfRenderModel = {
  pages: PdfRenderPage[];
};
