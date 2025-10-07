import * as diff from 'diff';

export interface TextCompareResult {
  file1Name: string;
  file2Name: string;
  file1Size: number;
  file2Size: number;
  differences: diff.Change[];
  timestamp: number;
  isLoading?: boolean;
}

export const compareTextFiles = async (file1: File, file2: File): Promise<TextCompareResult> => {
  try {
    const [text1, text2] = await Promise.all([
      readFileAsText(file1),
      readFileAsText(file2)
    ]);

    // Dosyaları satırlara ayır ve son boş satırı işle
    const lines1 = text1.endsWith('\n') ? text1.slice(0, -1).split('\n') : text1.split('\n');
    const lines2 = text2.endsWith('\n') ? text2.slice(0, -1).split('\n') : text2.split('\n');

    // Her bir satırı bağımsız olarak karşılaştır
    // Bu bize satırların gerçekten değişip değişmediğini gösterecek
    const differences: diff.Change[] = [];
    
    // LCS (Longest Common Subsequence) algoritması ile ortak satırları bul
    const commonLines = findCommonLines(lines1, lines2);
    
    // İlk dosyadaki satırları işle
    let file1Index = 0;
    let file2Index = 0;
    let commonIndex = 0;
    
    while (file1Index < lines1.length || file2Index < lines2.length) {
      if (commonIndex < commonLines.length && 
          file1Index === commonLines[commonIndex].file1Index && 
          file2Index === commonLines[commonIndex].file2Index) {
        // Ortak satır
        differences.push({
          count: 1,
          value: lines1[file1Index] + '\n',
          added: false,
          removed: false
        });
        file1Index++;
        file2Index++;
        commonIndex++;
      } else if (commonIndex < commonLines.length && file1Index < commonLines[commonIndex].file1Index) {
        // Dosya 1'de var ama dosya 2'de yok (silinen satır)
        differences.push({
          count: 1,
          value: lines1[file1Index] + '\n',
          added: false,
          removed: true
        });
        file1Index++;
      } else if (commonIndex < commonLines.length && file2Index < commonLines[commonIndex].file2Index) {
        // Dosya 2'de var ama dosya 1'de yok (eklenen satır)
        differences.push({
          count: 1,
          value: lines2[file2Index] + '\n',
          added: true,
          removed: false
        });
        file2Index++;
      } else if (commonIndex >= commonLines.length && file1Index < lines1.length) {
        // Kalan silinen satırlar
        differences.push({
          count: 1,
          value: lines1[file1Index] + '\n',
          added: false,
          removed: true
        });
        file1Index++;
      } else if (commonIndex >= commonLines.length && file2Index < lines2.length) {
        // Kalan eklenen satırlar
        differences.push({
          count: 1,
          value: lines2[file2Index] + '\n',
          added: true,
          removed: false
        });
        file2Index++;
      }
    }

    return {
      file1Name: file1.name,
      file2Name: file2.name,
      file1Size: file1.size,
      file2Size: file2.size,
      differences,
      timestamp: Date.now()
    };
  } catch (error) {
    console.error('Metin karşılaştırma hatası:', error);
    throw new Error('Metin dosyaları karşılaştırılırken bir hata oluştu');
  }
};

// Ortak satırları bulan yardımcı fonksiyon
interface CommonLine {
  file1Index: number;
  file2Index: number;
  line: string;
}

function findCommonLines(lines1: string[], lines2: string[]): CommonLine[] {
  const commonLines: CommonLine[] = [];
  
  for (let i = 0; i < lines1.length; i++) {
    const line1 = lines1[i];
    for (let j = 0; j < lines2.length; j++) {
      const line2 = lines2[j];
      if (line1 === line2) {
        // Aynı satır olup olmadığını kontrol et
        let isAlreadyInCommon = false;
        for (const common of commonLines) {
          if (common.file1Index === i || common.file2Index === j) {
            isAlreadyInCommon = true;
            break;
          }
        }
        
        // Eğer bu satır henüz ortak olarak işaretlenmediyse, ekle
        if (!isAlreadyInCommon) {
          commonLines.push({
            file1Index: i,
            file2Index: j,
            line: line1
          });
          break;
        }
      }
    }
  }
  
  // Ortak satırları, dosya 1 ve dosya 2'deki sıralarına göre sırala
  return commonLines.sort((a, b) => {
    if (a.file1Index !== b.file1Index) {
      return a.file1Index - b.file1Index;
    }
    return a.file2Index - b.file2Index;
  });
}

const readFileAsText = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        resolve(event.target.result as string);
      } else {
        reject(new Error('Dosya okunamadı'));
      }
    };
    reader.onerror = (error) => {
      reject(error);
    };
    reader.readAsText(file);
  });
}; 