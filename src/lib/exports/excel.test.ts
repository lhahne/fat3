import { describe, expect, it } from 'vitest';
import ExcelJS from 'exceljs';
import { generateProgram } from '../planner';
import { buildExcelWorkbook } from './excel';
import { mapProgramToExportModel } from './mapper';

describe('buildExcelWorkbook', () => {
  it('creates workbook with expected sheets and headers', async () => {
    const program = generateProgram({
      focus: 'strength',
      mesocycleWeeks: 4,
      level: 'beginner',
      sessionsPerWeek: 3,
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

    const bytes = await buildExcelWorkbook(model);
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(bytes as Parameters<typeof workbook.xlsx.load>[0]);

    expect(workbook.worksheets.map(ws => ws.name)).toEqual(['Sessions Tracker']);
    const sheet = workbook.getWorksheet('Sessions Tracker');
    const headerRow = sheet?.getRow(1);
    expect(headerRow?.getCell(1).value).toBe('Exercise');
    expect(headerRow?.getCell(2).value).toBe('Prescription');
    expect(headerRow?.getCell(3).value).toBe('Actual Reps');
    expect(headerRow?.getCell(4).value).toBe('Weight');
    expect(headerRow?.getCell(5).value).toBe('Notes');
  });
});
