export interface DiffResult {
  value: string;
  added?: boolean;
  removed?: boolean;
}

export interface PdfPageCompareResult {
  pageNumber: number;
  hasDifferences: boolean;
  diffPercentage: number;
  differences: DiffResult[];
}

export interface PdfCompareResult {
  file1Name: string;
  file2Name: string;
  file1Size: number; // Dosya 1 boyutu (byte cinsinden)
  file2Size: number; // Dosya 2 boyutu (byte cinsinden)
  pageCount1: number;
  pageCount2: number;
  pageCountDiffers: boolean;
  pageResults: PdfPageCompareResult[];
  overallDiffPercentage: number;
} 