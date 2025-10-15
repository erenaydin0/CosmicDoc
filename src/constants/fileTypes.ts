/**
 * Desteklenen dosya tipleri
 */

export const ALLOWED_FILE_TYPES = {
  PDF: ['.pdf'],
  EXCEL: ['.xlsx', '.xls', '.xlsm', '.xlsb', '.csv'],
  TEXT: ['.txt', '.md', '.json', '.xml', '.html', '.css', '.js', '.jsx', '.ts', '.tsx', '.yaml', '.yml', '.ini', '.conf', '.csv']
} as const;

export type FileType = keyof typeof ALLOWED_FILE_TYPES;

