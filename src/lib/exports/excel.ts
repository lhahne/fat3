import * as XLSX from 'xlsx';
import type { ExportModel, SessionRow } from './types';

interface SheetRow {
  type: 'week-header' | 'day-header' | 'exercise' | 'empty';
  Week?: number;
  'Week Objective'?: string;
  Effort?: number;
  'Day Label'?: string;
  'Session Type'?: string;
  Exercise?: string;
  Prescription?: string;
  'Actual Reps'?: string;
  Weight?: string;
  Notes?: string;
}

function buildSheetData(model: ExportModel): SheetRow[] {
  const rows: SheetRow[] = [];
  const weeks = model.filteredWeeks;

  for (const week of weeks) {
    rows.push({
      type: 'week-header',
      Week: week.weekIndex,
      'Week Objective': week.objective,
      Effort: Math.round(week.summary.avgEffort),
    });

    for (const day of week.days) {
      if (!day.workout) continue;

      rows.push({
        type: 'day-header',
        'Day Label': day.dateLabel,
        'Session Type': day.workout.title,
      });

      for (const block of day.workout.blocks) {
        for (const item of block.items) {
          rows.push({
            type: 'exercise',
            Exercise: item.name,
            Prescription: item.prescription,
            'Actual Reps': '',
            Weight: '',
            Notes: '',
          });
        }
      }
    }

    rows.push({ type: 'empty' });
    rows.push({ type: 'empty' });
  }

  return rows;
}

function rowToArray(row: SheetRow): (string | number)[] {
  if (row.type === 'week-header') {
    return [
      `Week ${row.Week} - ${row['Week Objective']} (Effort: ${row.Effort}/5)`,
      '', '', '', '', ''
    ];
  }
  if (row.type === 'day-header') {
    return [
      `${row['Day Label']} - ${row['Session Type']}`,
      '', '', '', '', ''
    ];
  }
  return [
    row.Exercise ?? '',
    row.Prescription ?? '',
    row['Actual Reps'] ?? '',
    row.Weight ?? '',
    row.Notes ?? ''
  ];
}

export function buildExcelWorkbook(model: ExportModel): ArrayBuffer {
  const workbook = XLSX.utils.book_new();
  const sheetData = buildSheetData(model);

  const headers = ['Exercise', 'Prescription', 'Actual Reps', 'Weight', 'Notes'];
  const aoa: (string | number)[][] = [headers, ...sheetData.map(rowToArray)];

  const sheet = XLSX.utils.aoa_to_sheet(aoa);

  sheet['!cols'] = [
    { wch: 28 },
    { wch: 18 },
    { wch: 12 },
    { wch: 12 },
    { wch: 25 },
  ];

  const pageBreaks: XLSX.PageBreak[] = [];
  let currentRow = 1;

  for (let i = 0; i < sheetData.length; i++) {
    const row = sheetData[i];
    if (row.type === 'empty' && i < sheetData.length - 1) {
      const nextRow = sheetData[i + 1];
      if (nextRow && nextRow.type === 'week-header') {
        pageBreaks.push({ i: currentRow, ch: 'Rows' });
      }
    }
    currentRow++;
  }

  if (pageBreaks.length > 0) {
    sheet['!pagebreaks'] = { horz: pageBreaks };
  }

  sheet['!printArea'] = 'A1:E' + (sheetData.length + 1);

  XLSX.utils.book_append_sheet(workbook, sheet, 'Sessions Tracker');

  return XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
}