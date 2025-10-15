import * as XLSX from 'xlsx';
import { ExcelCompareResult, SheetDiff, CellDiff } from '../types/ExcelTypes';
import { getExcelFile } from './IndexedDBService';

/**
 * Excel dosyalarını karşılaştırmak için servis
 */
export class ExcelCompareService {
  /**
   * İki Excel dosyasını karşılaştırır
   */
  public static async compareExcelFiles(file1: File, file2: File, matchColumns: boolean = false, ignoreSheetNames: boolean = false): Promise<ExcelCompareResult> {
    try {
      // Dosyaları yükle ve içeriğini çıkar
      const workbook1 = await this.readExcelFile(file1);
      const workbook2 = await this.readExcelFile(file2);
      
      // Sayfa listelerini al
      const sheets1 = workbook1.SheetNames;
      const sheets2 = workbook2.SheetNames;
      
      // Sayfa sayılarını karşılaştır
      const sheetCountDiffers = sheets1.length !== sheets2.length;
      
      // Hangi sayfaların eksik olduğunu belirle
      let missingSheets1: string[] = [];
      let missingSheets2: string[] = [];
      
      if (!ignoreSheetNames) {
        // Normal mod: sayfa isimlerine göre karşılaştır
        missingSheets1 = sheets2.filter(sheet => !sheets1.includes(sheet));
        missingSheets2 = sheets1.filter(sheet => !sheets2.includes(sheet));
      } else {
        // Sayfa isimlerini yoksay modu: sıra numaralarına göre karşılaştır
        if (sheets1.length < sheets2.length) {
          missingSheets1 = sheets2.slice(sheets1.length);
        } else if (sheets2.length < sheets1.length) {
          missingSheets2 = sheets1.slice(sheets2.length);
        }
      }
      
      // Her sayfayı karşılaştır
      const sheetResults: SheetDiff[] = [];
      const processedSheets = new Set<string>();
      
      // Dosyaların satır ve sütun sayılarını sakla
      let file1MaxRows = 0;
      let file2MaxRows = 0;
      let file1MaxCols = 0;
      let file2MaxCols = 0;
      
      if (!ignoreSheetNames) {
        // Normal mod: aynı isimli sayfaları karşılaştır
        for (const sheetName of sheets1) {
          if (sheets2.includes(sheetName)) {
            // Her iki dosyada da bulunan sayfaları karşılaştır
            const sheet1 = workbook1.Sheets[sheetName];
            const sheet2 = workbook2.Sheets[sheetName];
            
            // Sayfaları JSON'a dönüştür
            const json1 = XLSX.utils.sheet_to_json(sheet1, { header: 1, defval: null }) as any[][];
            const json2 = XLSX.utils.sheet_to_json(sheet2, { header: 1, defval: null }) as any[][];
            
            // Her dosyanın satır ve sütun sayılarını güncelle
            file1MaxRows = Math.max(file1MaxRows, json1.length);
            file2MaxRows = Math.max(file2MaxRows, json2.length);
            
            // Her satırdaki maksimum sütun sayısını hesapla
            for (const row of json1) {
              file1MaxCols = Math.max(file1MaxCols, row.length);
            }
            for (const row of json2) {
              file2MaxCols = Math.max(file2MaxCols, row.length);
            }
            
            // Sayfaları karşılaştır
            const differences = await this.compareSheets(json1, json2, sheetName, matchColumns);
            
            // Farklılık yüzdesini hesapla
            const totalCells = this.countCells(json1) + this.countCells(json2);
            const diffPercentage = totalCells > 0 ? (differences.length / totalCells) * 100 : 0;
            
            sheetResults.push({
              sheetName,
              differences,
              diffPercentage
            });
            
            processedSheets.add(sheetName);
          }
        }
      } else {
        // Sayfa isimlerini yoksay modu: sıra numaralarına göre karşılaştır
        const minSheetCount = Math.min(sheets1.length, sheets2.length);
        
        for (let i = 0; i < minSheetCount; i++) {
          const sheetName1 = sheets1[i];
          const sheetName2 = sheets2[i];
          const displayName = `${sheetName1} ↔ ${sheetName2}`;
          
          const sheet1 = workbook1.Sheets[sheetName1];
          const sheet2 = workbook2.Sheets[sheetName2];
          
          // Sayfaları JSON'a dönüştür
          const json1 = XLSX.utils.sheet_to_json(sheet1, { header: 1, defval: null }) as any[][];
          const json2 = XLSX.utils.sheet_to_json(sheet2, { header: 1, defval: null }) as any[][];
          
          // Her dosyanın satır ve sütun sayılarını güncelle
          file1MaxRows = Math.max(file1MaxRows, json1.length);
          file2MaxRows = Math.max(file2MaxRows, json2.length);
          
          // Her satırdaki maksimum sütun sayısını hesapla
          for (const row of json1) {
            file1MaxCols = Math.max(file1MaxCols, row.length);
          }
          for (const row of json2) {
            file2MaxCols = Math.max(file2MaxCols, row.length);
          }
          
          // Sayfaları karşılaştır
          const differences = await this.compareSheets(json1, json2, displayName, matchColumns);
          
          // Farklılık yüzdesini hesapla
          const totalCells = this.countCells(json1) + this.countCells(json2);
          const diffPercentage = totalCells > 0 ? (differences.length / totalCells) * 100 : 0;
          
          sheetResults.push({
            sheetName: displayName,
            differences,
            diffPercentage
          });
          
          processedSheets.add(displayName);
        }
      }
      
      // Genel farklılık yüzdesini hesapla
      const overallDiffPercentage = this.calculateOverallDiffPercentage(sheetResults);
      
      return {
        file1Name: file1.name,
        file2Name: file2.name,
        file1Size: file1.size,
        file2Size: file2.size,
        sheetCount1: sheets1.length,
        sheetCount2: sheets2.length,
        sheetCountDiffers,
        sheetResults,
        overallDiffPercentage,
        missingSheets1,
        missingSheets2,
        file1MaxRows,
        file2MaxRows,
        file1MaxCols,
        file2MaxCols
      };
    } catch (error: unknown) {
      console.error('Excel karşılaştırma hatası:', error);
      const errorMessage = error instanceof Error ? error.message : 'Bilinmeyen hata';
      throw new Error(`Excel karşılaştırılırken hata oluştu: ${errorMessage}`);
    }
  }
  
  /**
   * ID ile IndexedDB'den Excel dosyası yükler ve karşılaştırır
   */
  public static async compareExcelFilesFromDB(id1: string, id2: string, matchColumns: boolean = false, ignoreSheetNames: boolean = false): Promise<ExcelCompareResult | null> {
    try {
      // IndexedDB'den dosyaları al
      const fileData1 = await getExcelFile<any>(id1);
      const fileData2 = await getExcelFile<any>(id2);
      
      if (!fileData1 || !fileData2) {
        throw new Error('Dosyalar veritabanından yüklenemedi');
      }
      
      // Excel'leri çözümle
      const excel1Data = fileData1.data as string;
      const excel2Data = fileData2.data as string;
      
      // Data URL'leri Excel workbook'a dönüştür
      const workbook1 = await this.readExcelFromDataURL(excel1Data);
      const workbook2 = await this.readExcelFromDataURL(excel2Data);
      
      if (!workbook1 || !workbook2) {
        throw new Error('Excel dosyaları okunamadı');
      }
      
      // Sayfa listelerini al
      const sheets1 = workbook1.SheetNames;
      const sheets2 = workbook2.SheetNames;
      
      // Sayfa sayılarını karşılaştır
      const sheetCountDiffers = sheets1.length !== sheets2.length;
      
      // Hangi sayfaların eksik olduğunu belirle
      let missingSheets1: string[] = [];
      let missingSheets2: string[] = [];
      
      if (!ignoreSheetNames) {
        // Normal mod: sayfa isimlerine göre karşılaştır
        missingSheets1 = sheets2.filter(sheet => !sheets1.includes(sheet));
        missingSheets2 = sheets1.filter(sheet => !sheets2.includes(sheet));
      } else {
        // Sayfa isimlerini yoksay modu: sıra numaralarına göre karşılaştır
        if (sheets1.length < sheets2.length) {
          missingSheets1 = sheets2.slice(sheets1.length);
        } else if (sheets2.length < sheets1.length) {
          missingSheets2 = sheets1.slice(sheets2.length);
        }
      }
      
      // Her sayfayı karşılaştır
      const sheetResults: SheetDiff[] = [];
      const processedSheets = new Set<string>();
      
      // Dosyaların satır ve sütun sayılarını sakla
      let file1MaxRows = 0;
      let file2MaxRows = 0;
      let file1MaxCols = 0;
      let file2MaxCols = 0;
      
      if (!ignoreSheetNames) {
        // Normal mod: aynı isimli sayfaları karşılaştır
        for (const sheetName of sheets1) {
          if (sheets2.includes(sheetName)) {
            // Her iki dosyada da bulunan sayfaları karşılaştır
            const sheet1 = workbook1.Sheets[sheetName];
            const sheet2 = workbook2.Sheets[sheetName];
            
            // Sayfaları JSON'a dönüştür
            const json1 = XLSX.utils.sheet_to_json(sheet1, { header: 1, defval: null }) as any[][];
            const json2 = XLSX.utils.sheet_to_json(sheet2, { header: 1, defval: null }) as any[][];
            
            // Her dosyanın satır ve sütun sayılarını güncelle
            file1MaxRows = Math.max(file1MaxRows, json1.length);
            file2MaxRows = Math.max(file2MaxRows, json2.length);
            
            // Her satırdaki maksimum sütun sayısını hesapla
            for (const row of json1) {
              file1MaxCols = Math.max(file1MaxCols, row.length);
            }
            for (const row of json2) {
              file2MaxCols = Math.max(file2MaxCols, row.length);
            }
            
            // Sayfaları karşılaştır
            const differences = await this.compareSheets(json1, json2, sheetName, matchColumns);
            
            // Farklılık yüzdesini hesapla
            const totalCells = this.countCells(json1) + this.countCells(json2);
            const diffPercentage = totalCells > 0 ? (differences.length / totalCells) * 100 : 0;
            
            sheetResults.push({
              sheetName,
              differences,
              diffPercentage
            });
            
            processedSheets.add(sheetName);
          }
        }
      } else {
        // Sayfa isimlerini yoksay modu: sıra numaralarına göre karşılaştır
        const minSheetCount = Math.min(sheets1.length, sheets2.length);
        
        for (let i = 0; i < minSheetCount; i++) {
          const sheetName1 = sheets1[i];
          const sheetName2 = sheets2[i];
          const displayName = `${sheetName1} ↔ ${sheetName2}`;
          
          const sheet1 = workbook1.Sheets[sheetName1];
          const sheet2 = workbook2.Sheets[sheetName2];
          
          // Sayfaları JSON'a dönüştür
          const json1 = XLSX.utils.sheet_to_json(sheet1, { header: 1, defval: null }) as any[][];
          const json2 = XLSX.utils.sheet_to_json(sheet2, { header: 1, defval: null }) as any[][];
          
          // Her dosyanın satır ve sütun sayılarını güncelle
          file1MaxRows = Math.max(file1MaxRows, json1.length);
          file2MaxRows = Math.max(file2MaxRows, json2.length);
          
          // Her satırdaki maksimum sütun sayısını hesapla
          for (const row of json1) {
            file1MaxCols = Math.max(file1MaxCols, row.length);
          }
          for (const row of json2) {
            file2MaxCols = Math.max(file2MaxCols, row.length);
          }
          
          // Sayfaları karşılaştır
          const differences = await this.compareSheets(json1, json2, displayName, matchColumns);
          
          // Farklılık yüzdesini hesapla
          const totalCells = this.countCells(json1) + this.countCells(json2);
          const diffPercentage = totalCells > 0 ? (differences.length / totalCells) * 100 : 0;
          
          sheetResults.push({
            sheetName: displayName,
            differences,
            diffPercentage
          });
          
          processedSheets.add(displayName);
        }
      }
      
      // Genel farklılık yüzdesini hesapla
      const overallDiffPercentage = this.calculateOverallDiffPercentage(sheetResults);
      
      return {
        file1Name: fileData1.metadata?.fileName || 'Dosya 1',
        file2Name: fileData2.metadata?.fileName || 'Dosya 2',
        file1Size: typeof excel1Data === 'string' ? excel1Data.length : 0,
        file2Size: typeof excel2Data === 'string' ? excel2Data.length : 0,
        sheetCount1: sheets1.length,
        sheetCount2: sheets2.length,
        sheetCountDiffers,
        sheetResults,
        overallDiffPercentage,
        missingSheets1,
        missingSheets2,
        file1MaxRows,
        file2MaxRows,
        file1MaxCols,
        file2MaxCols
      };
      
    } catch (error) {
      console.error('Excel veritabanından karşılaştırma hatası:', error);
      return null;
    }
  }
  
  /**
   * Excel dosyasını okur
   */
  private static async readExcelFile(file: File): Promise<XLSX.WorkBook> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const data = e.target?.result;
          if (!data) {
            reject(new Error('Excel dosyası okunamadı'));
            return;
          }
          
          const arrayBuffer = data as ArrayBuffer;
          const workbook = XLSX.read(arrayBuffer, { type: 'array' });
          resolve(workbook);
        } catch (error) {
          reject(error);
        }
      };
      
      reader.onerror = (error) => {
        reject(error);
      };
      
      reader.readAsArrayBuffer(file);
    });
  }
  
  /**
   * Data URL'den Excel workbook oluşturur
   */
  private static async readExcelFromDataURL(dataUrl: string): Promise<XLSX.WorkBook | null> {
    try {
      // Data URL'deki base64 içeriğini çıkar
      const base64Content = dataUrl.split(',')[1];
      const binaryString = window.atob(base64Content);
      const bytes = new Uint8Array(binaryString.length);
      
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      // Excel workbook'u oluştur
      const workbook = XLSX.read(bytes, { type: 'array' });
      return workbook;
    } catch (error) {
      console.error('Data URL çözümlenirken hata:', error);
      return null;
    }
  }
  
  /**
   * İki Excel sayfasını karşılaştırır (Optimized Version)
   */
  private static async compareSheets(sheet1: any[][], sheet2: any[][], sheetName: string, matchColumns: boolean = false): Promise<CellDiff[]> {
    const differences: CellDiff[] = [];
    
    if (matchColumns && sheet1.length > 0 && sheet2.length > 0) {
      // Sütun eşleme modunda karşılaştır
      return await this.compareSheetsWithColumnMapping(sheet1, sheet2, sheetName);
    }
    
    // İlk satırı başlık olarak oku (varsa)
    const headers = sheet1.length > 0 ? sheet1[0] : [];
    
    // Normal mod - pozisyona göre karşılaştırma
    const maxRows = Math.max(sheet1.length, sheet2.length);
    const CHUNK_SIZE = 1000; // Her chunk'ta 1000 satır işle
    
    // Büyük veri setleri için chunk-based processing
    for (let startRow = 0; startRow < maxRows; startRow += CHUNK_SIZE) {
      const endRow = Math.min(startRow + CHUNK_SIZE, maxRows);
      
      // Her chunk'ı işle
      for (let r = startRow; r < endRow; r++) {
        const row1 = r < sheet1.length ? sheet1[r] : [];
        const row2 = r < sheet2.length ? sheet2[r] : [];
        
        const maxCols = Math.max(row1.length, row2.length);
        
        for (let c = 0; c < maxCols; c++) {
          const value1 = r < sheet1.length && c < row1.length ? row1[c] : null;
          const value2 = r < sheet2.length && c < row2.length ? row2[c] : null;
          
          // Hücre değerleri farklı mı?
          if (this.cellValuesAreDifferent(value1, value2)) {
            // Sütun adını al (ilk satırdan)
            const columnName = c < headers.length && headers[c] !== null && headers[c] !== undefined && String(headers[c]).trim() !== '' 
              ? String(headers[c]) 
              : undefined;
            
            // Satır adını al (ilk sütundan)
            const rowName = r < sheet1.length && sheet1[r][0] !== null && sheet1[r][0] !== undefined && String(sheet1[r][0]).trim() !== '' 
              ? String(sheet1[r][0]) 
              : undefined;
            
            differences.push({
              value1,
              value2,
              row: r + 1, // 1'den başlayan satır numaraları
              col: c + 1, // 1'den başlayan sütun numaraları
              columnName,
              rowName,
              sheet: sheetName
            });
          }
        }
      }
      
      // Her chunk'tan sonra main thread'e nefes ver
      if (startRow + CHUNK_SIZE < maxRows) {
        await new Promise(resolve => setTimeout(resolve, 0));
      }
    }
    
    return differences;
  }
  
  /**
   * İki hücre değerinin farklı olup olmadığını kontrol eder
   */
  private static cellValuesAreDifferent(value1: any, value2: any): boolean {
    const isEmpty = (v: any) => v == null || (typeof v === 'string' && v.trim() === '');

    // İki değer de boşsa farklı değiller
    if (isEmpty(value1) && isEmpty(value2)) return false;

    // Biri boş diğeri değilse farklılar
    if (isEmpty(value1) !== isEmpty(value2)) return true;

    // Sayısal değerleri karşılaştır
    if (typeof value1 === 'number' && typeof value2 === 'number') {
      return Math.abs(value1 - value2) > 0.0001; // Küçük farkları yok say
    }

    // Diğer değerleri string'e çevirerek karşılaştır
    return String(value1) !== String(value2);
  }
  
  /**
   * Bir sayfadaki hücre sayısını hesaplar
   */
  private static countCells(sheet: any[][]): number {
    let count = 0;
    for (const row of sheet) {
      count += row.length;
    }
    return count;
  }
  
  /**
   * Sütun başlıklarına göre eşleyerek Excel sayfalarını karşılaştırır
   */
  private static async compareSheetsWithColumnMapping(sheet1: any[][], sheet2: any[][], sheetName: string): Promise<CellDiff[]> {
    const differences: CellDiff[] = [];
    
    // İlk satırları başlık olarak al
    const headers1 = sheet1[0] || [];
    const headers2 = sheet2[0] || [];
    
    // Sütun eşleme tablosu oluştur (sheet1 sütun index -> sheet2 sütun index)
    const columnMapping: Map<number, number> = new Map();
    
    for (let i = 0; i < headers1.length; i++) {
      const header1 = String(headers1[i] || '').trim();
      if (header1) {
        // Aynı başlığı sheet2'de ara
        for (let j = 0; j < headers2.length; j++) {
          const header2 = String(headers2[j] || '').trim();
          if (header1 === header2) {
            columnMapping.set(i, j);
            break;
          }
        }
      }
    }
    
    // Başlık satırındaki eşleşmeyen sütunları da kontrol et
    // Sheet1'deki eşleşmeyen başlıklar
    for (let i = 0; i < headers1.length; i++) {
      if (!columnMapping.has(i)) {
        const header1 = headers1[i];
        if (header1 !== null && header1 !== undefined && String(header1).trim() !== '') {
          const columnName = String(header1);
          differences.push({
            value1: header1,
            value2: null,
            row: 1, // Başlık satırı
            col: i + 1,
            columnName,
            rowName: undefined,
            sheet: sheetName
          });
        }
      }
    }
    
    // Sheet2'deki eşleşmeyen başlıklar
    for (let j = 0; j < headers2.length; j++) {
      const isMatched = Array.from(columnMapping.values()).includes(j);
      if (!isMatched) {
        const header2 = headers2[j];
        if (header2 !== null && header2 !== undefined && String(header2).trim() !== '') {
          const columnName = String(header2);
          differences.push({
            value1: null,
            value2: header2,
            row: 1, // Başlık satırı
            col: j + 1,
            columnName,
            rowName: undefined,
            sheet: sheetName
          });
        }
      }
    }
    
    // Veri satırlarını karşılaştır (başlık satırından sonraki satırlar)
    const maxRows = Math.max(sheet1.length, sheet2.length);
    const CHUNK_SIZE = 1000;
    
    for (let startRow = 1; startRow < maxRows; startRow += CHUNK_SIZE) {
      const endRow = Math.min(startRow + CHUNK_SIZE, maxRows);
      
      for (let r = startRow; r < endRow; r++) {
        const row1 = r < sheet1.length ? sheet1[r] : [];
        const row2 = r < sheet2.length ? sheet2[r] : [];
        
        // Eşleşen sütunları karşılaştır
        for (const [col1Index, col2Index] of columnMapping.entries()) {
          const value1 = col1Index < row1.length ? row1[col1Index] : null;
          const value2 = col2Index < row2.length ? row2[col2Index] : null;
          
          if (this.cellValuesAreDifferent(value1, value2)) {
            // Sütun adını al
            const columnName = col1Index < headers1.length && headers1[col1Index] !== null && headers1[col1Index] !== undefined && String(headers1[col1Index]).trim() !== '' 
              ? String(headers1[col1Index]) 
              : undefined;
            
            // Satır adını al (ilk sütundan)
            const rowName = r < sheet1.length && sheet1[r][0] !== null && sheet1[r][0] !== undefined && String(sheet1[r][0]).trim() !== '' 
              ? String(sheet1[r][0]) 
              : undefined;
            
            differences.push({
              value1,
              value2,
              row: r + 1, // 1'den başlayan satır numaraları
              col: col1Index + 1, // Dosya 1'deki sütun numarası
              columnName,
              rowName,
              sheet: sheetName
            });
          }
        }
        
        // Sheet1'de var olan ama sheet2'de eşleşmeyen sütunları kontrol et
        for (let c = 0; c < row1.length; c++) {
          if (!columnMapping.has(c)) {
            const value1 = row1[c];
            if (value1 !== null && value1 !== undefined && String(value1).trim() !== '') {
              // Sütun adını al
              const columnName = c < headers1.length && headers1[c] !== null && headers1[c] !== undefined && String(headers1[c]).trim() !== '' 
                ? String(headers1[c]) 
                : undefined;
              
              // Satır adını al (ilk sütundan)
              const rowName = r < sheet1.length && sheet1[r][0] !== null && sheet1[r][0] !== undefined && String(sheet1[r][0]).trim() !== '' 
                ? String(sheet1[r][0]) 
                : undefined;
              
              differences.push({
                value1,
                value2: null,
                row: r + 1,
                col: c + 1,
                columnName,
                rowName,
                sheet: sheetName
              });
            }
          }
        }
        
        // Sheet2'de var olan ama sheet1'de eşleşmeyen sütunları kontrol et
        for (let c = 0; c < row2.length; c++) {
          // Sheet2'deki bu sütunun sheet1'de eşleşmesi var mı kontrol et
          const isMatched = Array.from(columnMapping.values()).includes(c);
          if (!isMatched) {
            const value2 = row2[c];
            if (value2 !== null && value2 !== undefined && String(value2).trim() !== '') {
              // Sütun adını al
              const columnName = c < headers2.length && headers2[c] !== null && headers2[c] !== undefined && String(headers2[c]).trim() !== '' 
                ? String(headers2[c]) 
                : undefined;
              
              // Satır adını al (ilk sütundan)
              const rowName = r < sheet2.length && sheet2[r][0] !== null && sheet2[r][0] !== undefined && String(sheet2[r][0]).trim() !== '' 
                ? String(sheet2[r][0]) 
                : undefined;
              
              differences.push({
                value1: null,
                value2,
                row: r + 1,
                col: c + 1, // Sheet2'deki sütun numarası
                columnName,
                rowName,
                sheet: sheetName
              });
            }
          }
        }
      }
      
      // Her chunk'tan sonra main thread'e nefes ver
      if (startRow + CHUNK_SIZE < maxRows) {
        await new Promise(resolve => setTimeout(resolve, 0));
      }
    }
    
    return differences;
  }
  
  /**
   * Genel farklılık yüzdesini hesaplar
   */
  private static calculateOverallDiffPercentage(sheetResults: SheetDiff[]): number {
    if (sheetResults.length === 0) return 0;
    
    const sum = sheetResults.reduce((acc, result) => acc + result.diffPercentage, 0);
    return sum / sheetResults.length;
  }
} 