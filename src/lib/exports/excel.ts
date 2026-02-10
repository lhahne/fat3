import * as XLSX from 'xlsx';
import { exportHeaders } from './mapper';
import type { ExportModel } from './types';

function toSheetFromRows(headers: string[], rows: Array<Record<string, string | number>>): XLSX.WorkSheet {
  const aoa = [headers, ...rows.map((row) => headers.map((header) => row[header] ?? ''))];
  return XLSX.utils.aoa_to_sheet(aoa);
}

export function buildExcelWorkbook(model: ExportModel): ArrayBuffer {
  const workbook = XLSX.utils.book_new();

  const overviewSheet = XLSX.utils.aoa_to_sheet([
    ['Field', 'Value'],
    ...model.overview.map((item) => [item.key, item.value]),
  ]);

  const calendarSheet = toSheetFromRows(exportHeaders.calendar, model.calendarRows);
  const workoutsSheet = toSheetFromRows(exportHeaders.workouts, model.workoutRows);
  const progressionSheet = toSheetFromRows(exportHeaders.progression, model.progressionRows);

  overviewSheet['!cols'] = [{ wch: 28 }, { wch: 42 }];
  calendarSheet['!cols'] = [{ wch: 8 }, { wch: 12 }, ...Array.from({ length: 7 }, () => ({ wch: 30 }))];
  workoutsSheet['!cols'] = Array.from({ length: exportHeaders.workouts.length }, () => ({ wch: 18 }));
  progressionSheet['!cols'] = Array.from({ length: exportHeaders.progression.length }, () => ({ wch: 18 }));

  XLSX.utils.book_append_sheet(workbook, overviewSheet, 'Overview');
  XLSX.utils.book_append_sheet(workbook, calendarSheet, 'Calendar');
  XLSX.utils.book_append_sheet(workbook, workoutsSheet, 'Workouts');
  XLSX.utils.book_append_sheet(workbook, progressionSheet, 'Progression');

  return XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
}
