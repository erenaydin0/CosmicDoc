/**
 * Satır sayma işlemleri için yardımcı fonksiyonlar
 */

import { DiffResult } from '../types/PdfTypes';

/**
 * Diff sonucundaki satırları ayıklar ve son boş satırı temizler
 * @param value Diff içeriği
 * @returns Temizlenmiş satır dizisi
 */
export const extractCleanLines = (value: string): string[] => {
  const lines = value.split('\n');
  // Son boş satırı atla (eğer varsa)
  return lines.length > 0 && lines[lines.length - 1] === '' 
    ? lines.slice(0, -1) 
    : lines;
};

/**
 * Diff sonuçlarından dosya satır sayılarını hesaplar
 * @param differences Diff sonuçları
 * @returns Dosya 1 ve Dosya 2 satır sayıları
 */
export const calculateLineCountsFromDiff = (differences: DiffResult[]): {
  file1LineCount: number;
  file2LineCount: number;
} => {
  let file1Lines = 0;
  let file2Lines = 0;

  differences.forEach(diff => {
    const actualLines = extractCleanLines(diff.value);

    if (!diff.added) {
      // Dosya 1'e ait (normal veya silinen)
      file1Lines += actualLines.length;
    }
    
    if (!diff.removed) {
      // Dosya 2'ye ait (normal veya eklenen)
      file2Lines += actualLines.length;
    }
  });

  return { file1LineCount: file1Lines, file2LineCount: file2Lines };
};

