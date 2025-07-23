export interface CellDiff {
  value1: string | number | boolean | null;
  value2: string | number | boolean | null;
  row: number;
  col: number;
  sheet: string;
}

export interface SheetDiff {
  sheetName: string;
  differences: CellDiff[];
  diffPercentage: number;
}

export interface ExcelCompareResult {
  file1Name: string;
  file2Name: string;
  file1Size: number;
  file2Size: number;
  sheetCount1: number;
  sheetCount2: number;
  sheetCountDiffers: boolean;
  sheetResults: SheetDiff[];
  overallDiffPercentage: number;
  missingSheets1: string[];
  missingSheets2: string[];
  file1MaxRows: number;
  file2MaxRows: number;
  file1MaxCols: number;
  file2MaxCols: number;
} 