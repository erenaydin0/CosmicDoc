/**
 * Dosya ve metin formatlama yardımcı fonksiyonları
 */

/**
 * Bayt cinsinden dosya boyutunu okunabilir bir formata dönüştürür
 * @param bytes Dosya boyutu (bayt cinsinden)
 * @returns Formatlanmış dosya boyutu (B, KB, MB veya GB olarak)
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return bytes + ' B';
  else if (bytes < 1048576) return (bytes / 1024).toFixed(2) + ' KB';
  else if (bytes < 1073741824) return (bytes / 1048576).toFixed(2) + ' MB';
  else return (bytes / 1073741824).toFixed(2) + ' GB';
};

/**
 * Değerin boş olup olmadığını kontrol eder
 * @param value Kontrol edilecek değer
 */
export const isEmpty = (value: any): boolean => {
  return value == null || (typeof value === 'string' && value.trim() === '');
};

/**
 * İki değerin eşit olup olmadığını güvenli bir şekilde kontrol eder
 * @param value1 İlk değer
 * @param value2 İkinci değer
 * @param epsilon Sayısal karşılaştırma toleransı
 */
export const safeEquals = (value1: any, value2: any, epsilon: number = 0.0001): boolean => {
  // İki değer de boşsa eşit
  if (isEmpty(value1) && isEmpty(value2)) return true;

  // Biri boş diğeri değilse farklı
  if (isEmpty(value1) !== isEmpty(value2)) return false;

  // Sayısal değerleri karşılaştır
  if (typeof value1 === 'number' && typeof value2 === 'number') {
    return Math.abs(value1 - value2) < epsilon;
  }

  // Diğer değerleri string'e çevirerek karşılaştır
  return String(value1) === String(value2);
};