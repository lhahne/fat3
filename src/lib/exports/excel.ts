import ExcelJS from 'exceljs';
import type { ExportModel } from './types';

interface SheetRowData {
  type: 'week-header' | 'day-header' | 'exercise' | 'empty';
  Exercise?: string;
  Prescription?: string;
  'Actual Reps'?: string;
  Weight?: string;
  Notes?: string;
}

const COLORS = {
  weekHeader: 'E0E0E0',
  dayHeader: 'F0F0F0',
  rowEven: 'FFFFFF',
  rowOdd: 'F8FBFF',
  inputColumn: 'FFFDE7',
  border: 'CCCCCC',
};

function buildSheetData(model: ExportModel): SheetRowData[] {
  const rows: SheetRowData[] = [];

  for (const week of model.filteredWeeks) {
    rows.push({
      type: 'week-header',
      Exercise: `Week ${week.weekIndex} - ${week.objective.charAt(0).toUpperCase() + week.objective.slice(1)} (Effort: ${Math.round(week.summary.avgEffort)}/5)`,
    });

    for (const day of week.days) {
      if (!day.workout) continue;

      rows.push({
        type: 'day-header',
        Exercise: `${day.dateLabel} - ${day.workout.title}`,
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
  }

  return rows;
}

export async function buildExcelWorkbook(model: ExportModel): Promise<ArrayBuffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'FAT3';
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet('Sessions Tracker', {
    pageSetup: { paperSize: 9, orientation: 'portrait', horizontalCentered: true },
    properties: { tabColor: { argb: 'FF000000' } },
  });

  worksheet.columns = [
    { header: 'Exercise', key: 'Exercise', width: 28 },
    { header: 'Prescription', key: 'Prescription', width: 18 },
    { header: 'Actual Reps', key: 'ActualReps', width: 12 },
    { header: 'Weight', key: 'Weight', width: 12 },
    { header: 'Notes', key: 'Notes', width: 25 },
  ];

  const sheetData = buildSheetData(model);
  let dataRowIndex = 0;

  const headerRow = worksheet.getRow(1);
  headerRow.eachCell((cell) => {
    cell.font = { bold: true };
    cell.border = { bottom: { style: 'medium', color: { argb: 'FF000000' } } };
    cell.alignment = { horizontal: 'center' };
  });
  headerRow.commit();

  for (let i = 0; i < sheetData.length; i++) {
    const rowData = sheetData[i];
    let row: ExcelJS.Row;

    if (rowData.type === 'week-header') {
      row = worksheet.addRow({ Exercise: rowData.Exercise, Prescription: '', ActualReps: '', Weight: '', Notes: '' });
      row.height = 25;

      worksheet.mergeCells(`A${row.number}:E${row.number}`);

      row.eachCell((cell) => {
        cell.font = { bold: true, size: 14 };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + COLORS.weekHeader } };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FF000000' } },
          bottom: { style: 'thin', color: { argb: 'FF000000' } },
          left: { style: 'thin', color: { argb: 'FF000000' } },
          right: { style: 'thin', color: { argb: 'FF000000' } },
        };
        cell.alignment = { horizontal: 'left' };
      });

    } else if (rowData.type === 'day-header') {
      row = worksheet.addRow({ Exercise: rowData.Exercise, Prescription: '', ActualReps: '', Weight: '', Notes: '' });

      worksheet.mergeCells(`A${row.number}:E${row.number}`);

      row.eachCell((cell) => {
        cell.font = { bold: true };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + COLORS.dayHeader } };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FF000000' } },
          bottom: { style: 'thin', color: { argb: 'FF000000' } },
          left: { style: 'thin', color: { argb: 'FF000000' } },
          right: { style: 'thin', color: { argb: 'FF000000' } },
        };
      });
    } else if (rowData.type === 'exercise') {
      const bgColor = dataRowIndex % 2 === 0 ? COLORS.rowEven : COLORS.rowOdd;

      row = worksheet.addRow({
        Exercise: rowData.Exercise ?? '',
        Prescription: rowData.Prescription ?? '',
        ActualReps: rowData['Actual Reps'] ?? '',
        Weight: rowData.Weight ?? '',
        Notes: rowData.Notes ?? '',
      });

      row.eachCell((cell, colNumber) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + bgColor } };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FF' + COLORS.border } },
          bottom: { style: 'thin', color: { argb: 'FF' + COLORS.border } },
          left: { style: 'thin', color: { argb: 'FF' + COLORS.border } },
          right: { style: 'thin', color: { argb: 'FF' + COLORS.border } },
        };

        if (colNumber === 3 || colNumber === 4) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + COLORS.inputColumn } };
        }
      });

      dataRowIndex++;
    } else {
      worksheet.addRow({ Exercise: '', Prescription: '', ActualReps: '', Weight: '', Notes: '' });
    }
  }

  worksheet.eachRow((row) => {
    row.height = 20;
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return buffer as ArrayBuffer;
}
