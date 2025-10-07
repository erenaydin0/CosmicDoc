// Karşılaştırma modu
export enum CompareMode {
  TEXT = 'text',
  VISUAL = 'visual'
}

// Diff sonucu
export interface DiffResult {
  value: string;
  count?: number;
  added?: boolean;
  removed?: boolean;
}

// PDF sayfa karşılaştırma sonucu
export interface PdfPageCompareResult {
  pageNumber: number;
  hasDifferences: boolean;
  diffPercentage: number;
  differences: DiffResult[];
}

// Görsel karşılaştırma sonucu
export interface VisualCompareResult {
  pageNumber: number;
  differencePercentage: number;
  hasVisualDifferences: boolean;
  overlayCanvas?: HTMLCanvasElement;
}

// PDF karşılaştırma sonucu
export interface PdfCompareResult {
  file1Name: string;
  file2Name: string;
  file1Size: number;
  file2Size: number;
  pageCount1: number;
  pageCount2: number;
  pageCountDiffers: boolean;
  pageResults: PdfPageCompareResult[];
  overallDiffPercentage: number;
  visualResults?: VisualCompareResult[];
  // Önizleme için gereken ek alanlar
  timestamp?: number;
  pdf1Key?: string;
  pdf2Key?: string;
  isLoading?: boolean;
} 