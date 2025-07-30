import * as pdfjsLib from 'pdfjs-dist';
import { DiffResult, PdfPageCompareResult, PdfCompareResult, VisualCompareResult } from '../types/PdfTypes';
import { diffWords } from 'diff';
import { getPdfFile } from './IndexedDBService';

// Worker yolunu doğru şekilde ayarlayalım
pdfjsLib.GlobalWorkerOptions.workerSrc = window.location.origin + '/js/pdf.worker.js';

/**
 * PDF dosyalarını karşılaştırmak için servis
 */
export class PdfCompareService {
  /**
   * İki PDF dosyasını karşılaştırır
   */
  public static async comparePdfFiles(file1: File, file2: File): Promise<PdfCompareResult> {
    try {
      // Dosyaları yükle ve metin içeriğini çıkar
      const pdf1Text = await this.extractTextFromPdf(file1);
      const pdf2Text = await this.extractTextFromPdf(file2);
      
      // Sayfa sayılarını karşılaştır
      const pageCountDiff = pdf1Text.length !== pdf2Text.length;
      
      // Her sayfayı karşılaştır
      const pageResults: PdfPageCompareResult[] = [];
      const maxPages = Math.max(pdf1Text.length, pdf2Text.length);
      
      for (let i = 0; i < maxPages; i++) {
        const page1Text = i < pdf1Text.length ? pdf1Text[i] : '';
        const page2Text = i < pdf2Text.length ? pdf2Text[i] : '';
        
        // Sayfa içeriğini kelime bazında karşılaştır
        const differences = this.compareTexts(page1Text, page2Text);
        
        // Farklılık yüzdesini hesapla
        const diffPercentage = this.calculateDiffPercentage(differences);
        
        pageResults.push({
          pageNumber: i + 1,
          hasDifferences: differences.some(d => d.added || d.removed),
          diffPercentage,
          differences
        });
      }
      
      // Genel farklılık yüzdesini hesapla
      const overallDiffPercentage = this.calculateOverallDiffPercentage(pageResults);
      
      return {
        file1Name: file1.name,
        file2Name: file2.name,
        file1Size: file1.size,
        file2Size: file2.size,
        pageCount1: pdf1Text.length,
        pageCount2: pdf2Text.length,
        pageCountDiffers: pageCountDiff,
        pageResults,
        overallDiffPercentage
      };
    } catch (error: unknown) {
      console.error('PDF karşılaştırma hatası:', error);
      const errorMessage = error instanceof Error ? error.message : 'Bilinmeyen hata';
      throw new Error(`PDF karşılaştırılırken hata oluştu: ${errorMessage}`);
    }
  }
  
  /**
   * ID ile IndexedDB'den PDF dosyası yükler ve karşılaştırır
   */
  public static async comparePdfFilesFromDB(id1: string, id2: string): Promise<PdfCompareResult | null> {
    try {
      // IndexedDB'den dosyaları al
      const fileData1 = await getPdfFile<any>(id1);
      const fileData2 = await getPdfFile<any>(id2);
      
      if (!fileData1 || !fileData2) {
        throw new Error('Dosyalar veritabanından yüklenemedi');
      }
      
      // PDF'leri çözümle
      const pdf1Data = fileData1.data;
      const pdf2Data = fileData2.data;
      
      // PDF içeriğinden metin çıkar
      const pdf1Text = await this.extractTextFromDataURL(pdf1Data);
      const pdf2Text = await this.extractTextFromDataURL(pdf2Data);
      
      // Sayfa sayılarını karşılaştır
      const pageCountDiff = pdf1Text.length !== pdf2Text.length;
      
      // Her sayfayı karşılaştır
      const pageResults: PdfPageCompareResult[] = [];
      const maxPages = Math.max(pdf1Text.length, pdf2Text.length);
      
      for (let i = 0; i < maxPages; i++) {
        const page1Text = i < pdf1Text.length ? pdf1Text[i] : '';
        const page2Text = i < pdf2Text.length ? pdf2Text[i] : '';
        
        // Sayfa içeriğini kelime bazında karşılaştır
        const differences = this.compareTexts(page1Text, page2Text);
        
        // Farklılık yüzdesini hesapla
        const diffPercentage = this.calculateDiffPercentage(differences);
        
        pageResults.push({
          pageNumber: i + 1,
          hasDifferences: differences.some(d => d.added || d.removed),
          diffPercentage,
          differences
        });
      }
      
      // Genel farklılık yüzdesini hesapla
      const overallDiffPercentage = this.calculateOverallDiffPercentage(pageResults);
      
      return {
        file1Name: fileData1.metadata?.fileName || 'Dosya 1',
        file2Name: fileData2.metadata?.fileName || 'Dosya 2',
        file1Size: typeof pdf1Data === 'string' ? pdf1Data.length : 0,
        file2Size: typeof pdf2Data === 'string' ? pdf2Data.length : 0,
        pageCount1: pdf1Text.length,
        pageCount2: pdf2Text.length,
        pageCountDiffers: pageCountDiff,
        pageResults,
        overallDiffPercentage
      };
    } catch (error) {
      console.error('PDF veritabanından karşılaştırma hatası:', error);
      return null;
    }
  }
  
  /**
   * PDF dosyasından metin çıkarır
   */
  private static async extractTextFromPdf(file: File): Promise<string[]> {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const numPages = pdf.numPages;
    const pagesText: string[] = [];
    
    for (let i = 1; i <= numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map(item => 'str' in item ? item.str : '')
        .join(' ')
        .trim();
      
      pagesText.push(pageText);
    }
    
    return pagesText;
  }
  
  /**
   * Data URL'den PDF metni çıkarır
   */
  private static async extractTextFromDataURL(dataUrl: string): Promise<string[]> {
    try {
      // Data URL'deki base64 içeriğini çıkar
      const base64Content = dataUrl.split(',')[1];
      const binaryString = window.atob(base64Content);
      const bytes = new Uint8Array(binaryString.length);
      
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      // PDF'yi yükle
      const pdf = await pdfjsLib.getDocument({ data: bytes }).promise;
      const numPages = pdf.numPages;
      const pagesText: string[] = [];
      
      // Her sayfadan metni çıkar
      for (let i = 1; i <= numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
          .map(item => 'str' in item ? item.str : '')
          .join(' ')
          .trim();
        
        pagesText.push(pageText);
      }
      
      return pagesText;
    } catch (error) {
      console.error('Data URL çözümlenirken hata:', error);
      return [];
    }
  }
  
  /**
   * İki metin arasındaki farkları bulur
   */
  private static compareTexts(text1: string, text2: string): DiffResult[] {
    return diffWords(text1, text2);
  }
  
  /**
   * Farkların yüzdesini hesaplar
   */
  private static calculateDiffPercentage(differences: DiffResult[]): number {
    const totalChangedChars = differences.reduce((sum, diff) => {
      if (diff.added || diff.removed) {
        return sum + diff.value.length;
      }
      return sum;
    }, 0);
    
    const totalChars = differences.reduce((sum, diff) => sum + diff.value.length, 0);
    
    return totalChars > 0 ? (totalChangedChars / totalChars) * 100 : 0;
  }
  
  /**
   * Genel farklılık yüzdesini hesaplar
   */
  private static calculateOverallDiffPercentage(pageResults: PdfPageCompareResult[]): number {
    if (pageResults.length === 0) return 0;
    
    const sum = pageResults.reduce((acc, result) => acc + result.diffPercentage, 0);
    return sum / pageResults.length;
  }

  /**
   * İki PDF'i görsel olarak karşılaştırır
   */
  public static async compareVisually(file1Key: string, file2Key: string): Promise<VisualCompareResult[]> {
    try {
      // IndexedDB'den PDF verilerini al
      const file1Data = await getPdfFile<any>(file1Key);
      const file2Data = await getPdfFile<any>(file2Key);
      
      if (!file1Data || !file2Data) {
        throw new Error('PDF verileri bulunamadı');
      }
      
      // PDF dokümanlarını yükle
      const pdf1 = await pdfjsLib.getDocument(file1Data.data).promise;
      const pdf2 = await pdfjsLib.getDocument(file2Data.data).promise;
      
      const numPages1 = pdf1.numPages;
      const numPages2 = pdf2.numPages;
      const maxPages = Math.max(numPages1, numPages2);
      
      const visualResults: VisualCompareResult[] = [];
      
      for (let i = 1; i <= maxPages; i++) {
        let canvas1: HTMLCanvasElement | null = null;
        let canvas2: HTMLCanvasElement | null = null;
        
        // İlk PDF'den sayfa render et
        if (i <= numPages1) {
          const page1 = await pdf1.getPage(i);
          canvas1 = await this.renderPageToCanvas(page1);
        }
        
        // İkinci PDF'den sayfa render et
        if (i <= numPages2) {
          const page2 = await pdf2.getPage(i);
          canvas2 = await this.renderPageToCanvas(page2);
        }
        
        // Sayfaları karşılaştır
        const compareResult = this.compareCanvases(canvas1, canvas2, i);
        visualResults.push(compareResult);
      }
      
      return visualResults;
    } catch (error) {
      console.error('Görsel karşılaştırma hatası:', error);
      throw new Error('Görsel karşılaştırma yapılırken hata oluştu');
    }
  }
  
  /**
   * PDF sayfasını canvas'e render eder
   */
  private static async renderPageToCanvas(page: any): Promise<HTMLCanvasElement> {
    const scale = 1.5;
    const viewport = page.getViewport({ scale });
    
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    
    const context = canvas.getContext('2d')!;
    await page.render({ canvasContext: context, viewport }).promise;
    
    return canvas;
  }
  
  /**
   * İki canvas'ı piksel bazında karşılaştırır ve overlay oluşturur
   */
  private static compareCanvases(
    canvas1: HTMLCanvasElement | null, 
    canvas2: HTMLCanvasElement | null, 
    pageNumber: number
  ): VisualCompareResult {
    if (!canvas1 && !canvas2) {
      return {
        pageNumber,
        differencePercentage: 0,
        hasVisualDifferences: false
      };
    }
    
    if (!canvas1 || !canvas2) {
      return {
        pageNumber,
        differencePercentage: 100,
        hasVisualDifferences: true,
        overlayCanvas: canvas1 || canvas2 || undefined
      };
    }
    
    // Canvas boyutlarını eşitle
    const maxWidth = Math.max(canvas1.width, canvas2.width);
    const maxHeight = Math.max(canvas1.height, canvas2.height);
    
    // Overlay canvas oluştur
    const overlayCanvas = document.createElement('canvas');
    overlayCanvas.width = maxWidth;
    overlayCanvas.height = maxHeight;
    const overlayCtx = overlayCanvas.getContext('2d')!;
    
    // Beyaz arka plan ekle
    overlayCtx.fillStyle = '#ffffff';
    overlayCtx.fillRect(0, 0, maxWidth, maxHeight);
    
    // İlk canvas'ı tam opak çiz
    overlayCtx.globalAlpha = 1.0;
    overlayCtx.globalCompositeOperation = 'source-over';
    overlayCtx.drawImage(canvas1, 0, 0);
    
    // Farkları hesapla ve turuncu ile işaretle
    const imageData1 = canvas1.getContext('2d')!.getImageData(0, 0, Math.min(canvas1.width, maxWidth), Math.min(canvas1.height, maxHeight));
    const imageData2 = canvas2.getContext('2d')!.getImageData(0, 0, Math.min(canvas2.width, maxWidth), Math.min(canvas2.height, maxHeight));
    
    const overlayImageData = overlayCtx.getImageData(0, 0, maxWidth, maxHeight);
    
    let differentPixels = 0;
    const threshold = 30; // Piksel farklılık eşiği
    
    const minWidth = Math.min(canvas1.width, canvas2.width, maxWidth);
    const minHeight = Math.min(canvas1.height, canvas2.height, maxHeight);
    
    for (let y = 0; y < minHeight; y++) {
      for (let x = 0; x < minWidth; x++) {
        const index1 = (y * canvas1.width + x) * 4;
        const index2 = (y * canvas2.width + x) * 4;
        const overlayIndex = (y * maxWidth + x) * 4;
        
        if (index1 < imageData1.data.length && index2 < imageData2.data.length) {
          const r1 = imageData1.data[index1];
          const g1 = imageData1.data[index1 + 1];
          const b1 = imageData1.data[index1 + 2];
          
          const r2 = imageData2.data[index2];
          const g2 = imageData2.data[index2 + 1];
          const b2 = imageData2.data[index2 + 2];
          
          const diff = Math.abs(r1 - r2) + Math.abs(g1 - g2) + Math.abs(b1 - b2);
          
          if (diff > threshold) {
            differentPixels++;
            // Farkı canlı turuncu/kırmızı renkte işaretle
            overlayImageData.data[overlayIndex] = 255; // R
            overlayImageData.data[overlayIndex + 1] = 69;  // G
            overlayImageData.data[overlayIndex + 2] = 0;   // B
            overlayImageData.data[overlayIndex + 3] = 255; // A (tam opaklık)
          }
        }
      }
    }
    
    // Güncellenmiş image data'yı canvas'a uygula
    overlayCtx.putImageData(overlayImageData, 0, 0);
    
    const totalPixels = minWidth * minHeight;
    const differencePercentage = totalPixels > 0 ? (differentPixels / totalPixels) * 100 : 0;
    
    return {
      pageNumber,
      differencePercentage,
      hasVisualDifferences: differencePercentage > 0.1, // %0.1'den fazla fark varsa
      overlayCanvas: overlayCanvas
    };
  }
} 