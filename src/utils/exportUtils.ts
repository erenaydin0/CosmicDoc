import * as XLSX from 'xlsx';

/**
 * Excel'e aktarma işlevi için ortak yardımcı fonksiyonlar
 */

/**
 * Excel dosyası oluşturup indirir
 * @param data Excel'e aktarılacak veri dizisi
 * @param sheetName Excel sayfasının adı
 * @param fileName İndirilecek dosyanın adı (uzantı olmadan)
 */
export const exportToExcel = (data: any[], sheetName: string, fileName: string): void => {
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, `${fileName}.xlsx`);
};

/**
 * Excel karşılaştırma sonuçlarını dışa aktarır
 * @param sheetResults Sayfa sonuçları
 * @param missingSheets1 Dosya 1'de eksik sayfalar
 * @param missingSheets2 Dosya 2'de eksik sayfalar
 * @param convertColumnIndexToLetter Sütun indeksini Excel harfine çeviren fonksiyon
 */
export const exportExcelCompareResults = (
  sheetResults: any[],
  missingSheets1: string[],
  missingSheets2: string[],
  convertColumnIndexToLetter: (colIndex: number) => string
): void => {
  const allRows: any[] = [];
  
  // Tüm sayfalardaki tüm farkları birleştir
  sheetResults.forEach(sheet => {
    sheet.differences.forEach((diff: any) => {
      allRows.push({
        'Sayfa': sheet.sheetName,
        'Satır': diff.row,
        'Satır Başı': diff.rowName || '-',
        'Sütun': convertColumnIndexToLetter(diff.col), // Sütun numarasını harfe çevir
        'Sütun Başlığı': diff.columnName || '-',
        'Dosya 1 Değeri': diff.value1 !== null ? String(diff.value1) : '(boş)',
        'Dosya 2 Değeri': diff.value2 !== null ? String(diff.value2) : '(boş)',
      });
    });
  });
  
  // Eksik sayfaları raporla
  missingSheets1.forEach(sheetName => {
    allRows.push({
      'Sayfa': sheetName,
      'Satır': '-',
      'Satır Başı': '-',
      'Sütun': '-',
      'Sütun Başlığı': '-',
      'Dosya 1 Değeri': '(sayfa yok)',
      'Dosya 2 Değeri': 'Sayfa mevcut',
    });
  });
  
  missingSheets2.forEach(sheetName => {
    allRows.push({
      'Sayfa': sheetName,
      'Satır': '-',
      'Satır Başı': '-',
      'Sütun': '-',
      'Sütun Başlığı': '-',
      'Dosya 1 Değeri': 'Sayfa mevcut',
      'Dosya 2 Değeri': '(sayfa yok)',
    });
  });

  exportToExcel(allRows, 'Excel Farkları', 'excel_fark_raporu');
};

/**
 * Metin karşılaştırma sonuçlarını dışa aktarır
 * @param differences Fark dizisi
 */
export const exportTextCompareResults = (differences: any[]): void => {
  const allRows: any[] = [];

  // Satır numaralarını yeniden hesapla
  const file1ExportLineNumbers: number[] = [];
  const file2ExportLineNumbers: number[] = [];
  let currentFile1Line = 1;
  let currentFile2Line = 1;

  differences.forEach(diff => {
    const lines = diff.value.split('\n');
    const actualLines = lines.length > 0 && lines[lines.length - 1] === '' ? lines.slice(0, -1) : lines;

    for (let i = 0; i < actualLines.length; i++) {
      if (!diff.added) { // Bu satır Dosya 1'de mevcut (ortak veya silinmiş)
        file1ExportLineNumbers.push(currentFile1Line++);
      }
      if (!diff.removed) { // Bu satır Dosya 2'de mevcut (ortak veya eklenmiş)
        file2ExportLineNumbers.push(currentFile2Line++);
      }
    }
  });

  // Sadece farklılıkları rapora ekle
  let exportFile1Index = 0;
  let exportFile2Index = 0;

  differences.forEach(diff => {
    const lines = diff.value.split('\n');
    const actualLines = lines.length > 0 && lines[lines.length - 1] === '' ? lines.slice(0, -1) : lines;
    
            actualLines.forEach((line: string) => {
      if (diff.added) { // Line added to File 2
        allRows.push({
          'Dosya': 'Dosya 2',
          'Satır No': file2ExportLineNumbers[exportFile2Index++],
          'İçerik': line.trim(),
          'Tür': 'Eklenen'
        });
      } else if (diff.removed) { // Line removed from File 1
        allRows.push({
          'Dosya': 'Dosya 1',
          'Satır No': file1ExportLineNumbers[exportFile1Index++],
          'İçerik': line.trim(),
          'Tür': 'Silinen'
        });
      } else { // Common lines - Update counters but don't add to allRows
        exportFile1Index++;
        exportFile2Index++;
      }
    });
  });

  exportToExcel(allRows, 'Metin Farkları', 'metin_fark_raporu');
};

/**
 * PDF karşılaştırma sonuçlarını dışa aktarır
 * @param pageResults Sayfa sonuçları
 */
export const exportPdfCompareResults = (pageResults: any[]): void => {
  const allRows: any[] = [];
  
  // Tüm sayfalardaki tüm farkları birleştir
  pageResults.forEach((page) => {
    const pageNumber = page.pageNumber;
    const differences = page.differences.filter((diff: any) => diff.added || diff.removed); // Sadece gerçek farkları dikkate al

    let i = 0;
    while (i < differences.length) {
      const currentDiff = differences[i];

      if (currentDiff.removed && differences[i + 1] && differences[i + 1].added) {
        // Bir çift bulundu: silineni eklenen takip ediyor (bir değişiklik)
        const nextDiff = differences[i + 1];
        allRows.push({
          'Sayfa': pageNumber,
          'Dosya 1 Değeri': currentDiff.value.trim(),
          'Dosya 2 Değeri': nextDiff.value.trim(),
        });
        i += 2; // Hem mevcut hem de bir sonraki farkı atla
      } else {
        // Tek bir eklenen veya silinen fark
        allRows.push({
          'Sayfa': pageNumber,
          'Dosya 1 Değeri': currentDiff.removed ? currentDiff.value.trim() : '',
          'Dosya 2 Değeri': currentDiff.added ? currentDiff.value.trim() : '',
        });
        i += 1; // Bir sonraki farka geç
      }
    }
  });

  exportToExcel(allRows, 'PDF Farkları', 'pdf_fark_raporu');
};

/**
 * PDF görsel karşılaştırma sonuçlarını Excel'e aktarır
 * @param visualResults Görsel karşılaştırma sonuçları
 */
export const exportPdfVisualCompareResults = (visualResults: any[]): void => {
  const allRows: any[] = [];
  
  // Sadece farklılık bulunan sayfaları filtrele ve Excel'e aktar
  visualResults.forEach((result) => {
    if (result.hasVisualDifferences) {
      allRows.push({
        'Sayfa': result.pageNumber,
        'Farklılık Yüzdesi': `%${result.differencePercentage.toFixed(2)}`,
      });
    }
  });

  if (allRows.length === 0) {
    allRows.push({
      'Sayfa': '-',
      'Farklılık Yüzdesi': 'Görsel farklılık bulunamadı',
    });
  }

  exportToExcel(allRows, 'PDF Görsel Farkları', 'pdf_gorsel_fark_raporu');
};