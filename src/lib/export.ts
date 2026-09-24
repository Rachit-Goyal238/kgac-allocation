import Papa from 'papaparse';
import ExcelJS from 'exceljs';

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportToCSV(data: Record<string, any>[], filename: string) {
  const csv = Papa.unparse(data);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  downloadBlob(blob, filename);
}

export async function exportToExcel(
  data: Record<string, any>[],
  columns?: { header: string; key: string; width: number }[],
  filename: string = 'export.xlsx'
) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Export');

  const resolvedColumns = (columns && columns.length > 0)
    ? columns
    : Object.keys(data[0] || {}).map(key => ({
        header: key,
        key: key,
        width: Math.max(16, key.length + 6)
      }));

  sheet.columns = resolvedColumns;
  
  // Style header row
  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF333333' }
  };
  headerRow.height = 25;
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' };

  // Add auto filter
  sheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: resolvedColumns.length }
  };

  // Add data
  data.forEach((row, index) => {
    const dataRow = sheet.addRow(row);
    // Alternating row colors
    if (index % 2 === 0) {
      dataRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF9FAFB' }
      };
    }
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  downloadBlob(blob, filename);
}

export function exportGridToCSV(gridRows: any[], dates: Date[]) {
  // Simplistic export grid
  const data = gridRows.map(row => {
    const obj: Record<string, any> = {
      Name: row.profile.full_name,
      Department: row.profile.department_id,
      Role: row.profile.role
    };
    dates.forEach(date => {
      const dateStr = date.toISOString().split('T')[0];
      const alloc = row.allocations.find((a: any) => a.date === dateStr);
      obj[dateStr] = alloc ? alloc.hours : 0;
    });
    return obj;
  });
  exportToCSV(data, `allocation_grid_${new Date().toISOString().split('T')[0]}.csv`);
}

export async function exportGridToExcel(gridRows: any[], dates: Date[]) {
  const columns = [
    { header: 'Name', key: 'Name', width: 25 },
    { header: 'Department', key: 'Department', width: 20 },
    { header: 'Role', key: 'Role', width: 15 }
  ];
  
  dates.forEach(date => {
    columns.push({
      header: date.toISOString().split('T')[0],
      key: date.toISOString().split('T')[0],
      width: 12
    });
  });

  const data = gridRows.map(row => {
    const obj: Record<string, any> = {
      Name: row.profile.full_name,
      Department: row.profile.department_id,
      Role: row.profile.role
    };
    dates.forEach(date => {
      const dateStr = date.toISOString().split('T')[0];
      const alloc = row.allocations.find((a: any) => a.date === dateStr);
      obj[dateStr] = alloc ? alloc.hours : 0;
    });
    return obj;
  });

  await exportToExcel(data, columns, `allocation_grid_${new Date().toISOString().split('T')[0]}.xlsx`);
}
