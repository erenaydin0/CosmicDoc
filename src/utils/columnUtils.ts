/**
 * Excel sütun işlemleri için yardımcı fonksiyonlar
 */

/**
 * Sütun indeksini Excel harfine dönüştürür (1 -> A, 2 -> B, ...)
 * @param colIndex Sütun indeksi (1'den başlar)
 * @returns Excel sütun harfi
 */
export const convertColumnIndexToLetter = (colIndex: number): string => {
  let letter = '';
  let tempColIndex = colIndex;
  
  while (tempColIndex > 0) {
    const remainder = (tempColIndex - 1) % 26;
    letter = String.fromCharCode(65 + remainder) + letter;
    tempColIndex = Math.floor((tempColIndex - 1) / 26);
  }
  
  return letter;
};

/**
 * Excel harfini sütun indeksine dönüştürür (A -> 1, B -> 2, ...)
 * @param letter Excel sütun harfi
 * @returns Sütun indeksi
 */
export const convertLetterToColumnIndex = (letter: string): number => {
  let colIndex = 0;
  
  for (let i = 0; i < letter.length; i++) {
    colIndex = colIndex * 26 + (letter.charCodeAt(i) - 64);
  }
  
  return colIndex;
};

