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

    expect(wb.SheetNames).toEqual(['Sessions Tracker']);
    const sheet = XLSX.utils.sheet_to_json<string[]>(wb.Sheets['Sessions Tracker'], { header: 1 });
    expect(sheet[0]).toEqual(['Exercise', 'Prescription', 'Actual Reps', 'Weight', 'Notes']);
  });
});
