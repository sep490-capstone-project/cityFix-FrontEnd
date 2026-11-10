export function escapeCsvCell(val: string | number | null | undefined): string {
  const str = val === null || val === undefined ? '' : String(val);
  return `"${str.replace(/"/g, '""')}"`;
}

/**
 * Xuất dữ liệu bảng ra file CSV chuẩn UTF-8 BOM (mở trực tiếp bằng Excel không lỗi font tiếng Việt)
 */
export function downloadCsvFile(
  filenamePrefix: string,
  headers: string[],
  rows: Array<Array<string | number | null | undefined>>
): void {
  const dateStr = new Date().toISOString().slice(0, 10);
  const csvLines = [
    headers.map(escapeCsvCell).join(','),
    ...rows.map((r) => r.map(escapeCsvCell).join(',')),
  ];
  const csvContent = '\uFEFF' + csvLines.join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `${filenamePrefix}_${dateStr}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export interface ExcelSheetSection {
  heading: string;
  headers: string[];
  rows: Array<Array<string | number | null | undefined>>;
}

/**
 * Xuất báo cáo nhiều bảng ra file Excel (.xls) có định dạng bảng biểu tiếng Việt chuẩn
 */
export function downloadExcelReport(
  filenamePrefix: string,
  reportTitle: string,
  subtitle: string,
  sections: ExcelSheetSection[]
): void {
  const dateStr = new Date().toISOString().slice(0, 10);
  const timestamp = new Date().toLocaleString('vi-VN');

  const sectionsHtml = sections
    .map(
      (sec) => `
      <h3 style="font-family: Arial, sans-serif; color: #c2410c; margin-top: 20px; margin-bottom: 8px;">
        ${sec.heading}
      </h3>
      <table border="1" cellspacing="0" cellpadding="6" style="border-collapse: collapse; font-family: Arial, sans-serif; font-size: 12px; width: 100%;">
        <thead>
          <tr style="background-color: #fff7ed; color: #9a3412; font-weight: bold;">
            ${sec.headers.map((h) => `<th style="padding: 8px; border: 1px solid #cbd5e1; text-align: left;">${h}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
          ${sec.rows
            .map(
              (row) => `
            <tr>
              ${row
                .map(
                  (cell) =>
                    `<td style="padding: 6px 8px; border: 1px solid #e2e8f0;">${
                      cell === null || cell === undefined ? '' : String(cell)
                    }</td>`
                )
                .join('')}
            </tr>`
            )
            .join('')}
        </tbody>
      </table>
    `
    )
    .join('<br/>');

  const html = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="UTF-8" />
        <!--[if gte mso 9]>
        <xml>
          <x:ExcelWorkbook>
            <x:ExcelWorksheets>
              <x:ExcelWorksheet>
                <x:Name>BaoCaoCityFix</x:Name>
                <x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions>
              </x:ExcelWorksheet>
            </x:ExcelWorksheets>
          </x:ExcelWorkbook>
        </xml>
        <![endif]-->
      </head>
      <body>
        <h2 style="font-family: Arial, sans-serif; color: #111827; margin-bottom: 4px;">${reportTitle}</h2>
        <p style="font-family: Arial, sans-serif; color: #6b7280; font-size: 12px; margin-top: 0;">
          ${subtitle} — Kết xuất lúc: ${timestamp}
        </p>
        ${sectionsHtml}
      </body>
    </html>
  `;

  const blob = new Blob(['\uFEFF' + html], {
    type: 'application/vnd.ms-excel;charset=utf-8;',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `${filenamePrefix}_${dateStr}.xls`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
