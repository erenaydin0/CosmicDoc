/**
 * Fark hesaplama fonksiyonlarını içeren yardımcı modül
 */

import { ExcelCompareResult } from "../types/ExcelTypes";
import { DiffResult } from "../types/PdfTypes";
import { TextCompareResult } from "../services/TextCompareService";

/**
 * Excel karşılaştırma sonuçlarında toplam fark sayısını hesaplar
 * @param result Excel karşılaştırma sonucu
 * @returns Toplam fark sayısı
 */
export const calculateExcelDiffCount = (result: ExcelCompareResult): number => {
  return result.sheetResults.reduce((acc, sheet) => acc + sheet.differences.length, 0);
};

/**
 * Metin karşılaştırma sonuçlarında toplam fark sayısını hesaplar
 * @param result Metin karşılaştırma sonucu
 * @returns Toplam fark sayısı
 */
export const calculateTextDiffCount = (result: TextCompareResult): number => {
  return result.differences.filter(diff => diff.added || diff.removed).length;
};

/**
 * PDF karşılaştırma sonuçlarında toplam fark sayısını hesaplar
 * @param pageResults PDF sayfa sonuçları
 * @returns Toplam fark sayısı
 */
export const calculatePdfDiffCount = (pageResults: { pageNumber: number; differences: DiffResult[] }[]): number => {
  let totalDiffCount = 0;
  pageResults.forEach(page => {
    const differences = page.differences.filter(diff => diff.added || diff.removed);
    let i = 0;
    while (i < differences.length) {
      const currentDiff = differences[i];
      if (currentDiff.removed && differences[i + 1] && differences[i + 1].added) {
        totalDiffCount += 1; // Değişiklik olarak say (silindi + eklendi)
        i += 2; // Bir sonraki çifti kontrol et
      } else {
        totalDiffCount += 1; // Tekli ekleme veya silme olarak say
        i += 1; // Bir sonraki farkı kontrol et
      }
    }
  });
  return totalDiffCount;
};

/**
 * Sayfa bazında PDF fark sayısını hesaplar
 * @param pageDifferences Sayfa farklılıkları
 * @returns Sayfa fark sayısı
 */
export const calculatePageDiffCount = (pageDifferences: DiffResult[]): number => {
  const differences = pageDifferences.filter(diff => diff.added || diff.removed);
  let pageDiffCount = 0;
  let i = 0;
  while (i < differences.length) {
    const currentDiff = differences[i];
    if (currentDiff.removed && differences[i + 1] && differences[i + 1].added) {
      pageDiffCount += 1; // Değişiklik olarak say (silindi + eklendi)
      i += 2; // Bir sonraki çifti kontrol et
    } else {
      pageDiffCount += 1; // Tekli ekleme veya silme olarak say
      i += 1; // Bir sonraki farkı kontrol et
    }
  }
  return pageDiffCount;
};