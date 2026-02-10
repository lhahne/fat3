import { describe, expect, it } from 'vitest';
import * as XLSX from 'xlsx';
import { generateProgram } from '../planner';
import { buildExcelWorkbook } from './excel';
import { mapProgramToExportModel } from './mapper';

describe('buildExcelWorkbook', () => {
  it('creates workbook with expected sheets and headers', () => {
    const program = generateProgram({
      focus: 'strength',
      mesocycleWeeks: 4,
      level: 'beginner',
      sessionsPerWeek: 3,
      autoDeload: true,
      strengthProfile: 'powerlifting',
    });

    const model = mapProgramToExportModel(program, {
      scope: 'all',
      detail: 'full',
      pdfMode: 'compact',
      paperSize: 'letter',
      orientation: 'auto',
      grayscale: false,
      inkSaver: true,
      includeLegend: true,
      includeProgressionChart: true,
    });

    const bytes = buildExcelWorkbook(model);
    const wb = XLSX.read(bytes, { type: 'array' });

    expect(wb.SheetNames).toEqual(['Overview', 'Calendar', 'Workouts', 'Progression']);
    const calendar = XLSX.utils.sheet_to_json<string[]>(wb.Sheets.Calendar, { header: 1 });
    expect(calendar[0]).toEqual(['Week', 'Objective', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']);
  });
});
