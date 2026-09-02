import * as pdfjsLib from 'pdfjs-dist';
import { DiffResult, PdfPageCompareResult, PdfCompareResult, VisualCompareResult } from '../types/PdfTypes';
import { diffWords } from 'diff';
import { getPdfFile } from './IndexedDBService';
import { PDF_COMPARISON, VISUAL_COMPARISON } from '../constants/comparison';
import { createOverlayCanvas } from '../utils/canvasUtils';

// Worker yolunu doğru şekilde ayarlayalım
pdfjsLib.GlobalWorkerOptions.workerSrc = window.location.origin + '/js/pdf.worker.js';

type PdfSource = string | ArrayBuffer | Uint8Array;

const yieldToMain = (): Promise<void> => new Promise(resolve => setTimeout(resolve, 0));

/**
 * PDF dosyalarını karşılaştırmak için servis
 */
export class PdfCompareService {
  /**
   * İki PDF dosyasını karşılaştırır
   */
  public static async comparePdfFiles(file1: File, file2: File): Promise<PdfCompareResult> {
    try {
      const [buffer1, buffer2] = await Promise.all([file1.arrayBuffer(), file2.arrayBuffer()]);
      return this.buildCompareResult(
        await this.extractTextFromData(buffer1),
        await this.extractTextFromData(buffer2),
        {
          file1Name: file1.name,
          file2Name: file2.name,
          file1Size: file1.size,
          file2Size: file2.size
        }
      );
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
      const fileData1 = await getPdfFile<any>(id1);
      const fileData2 = await getPdfFile<any>(id2);
      
      if (!fileData1 || !fileData2) {
        throw new Error('Dosyalar veritabanından yüklenemedi');
      }
      
      const [pdf1Text, pdf2Text] = await Promise.all([
        this.extractTextFromData(fileData1.data),
        this.extractTextFromData(fileData2.data)
      ]);
      
      return this.buildCompareResult(pdf1Text, pdf2Text, {
        file1Name: fileData1.metadata?.fileName || 'Dosya 1',
        file2Name: fileData2.metadata?.fileName || 'Dosya 2',
        file1Size: this.getStoredSize(fileData1.data),
        file2Size: this.getStoredSize(fileData2.data)
      });
    } catch (error) {
      console.error('PDF veritabanından karşılaştırma hatası:', error);
      return null;
    }
  }

  /**
   * IndexedDB kaydından pdf.js belgesi yükler
   */
  public static async loadPdfDocument(fileKey: string): Promise<pdfjsLib.PDFDocumentProxy> {
    const fileData = await getPdfFile<any>(fileKey);
    if (!fileData) {
      throw new Error('PDF verileri bulunamadı');
    }
    return pdfjsLib.getDocument({ data: this.toDocumentData(fileData.data) }).promise;
  }

  /**
   * Belirli bir sayfayı canvas'e çizer
   */
  public static async renderPage(
    pdf: pdfjsLib.PDFDocumentProxy,
    pageNumber: number,
    scale = VISUAL_COMPARISON.SCALE
  ): Promise<HTMLCanvasElement | null> {
    if (pageNumber < 1 || pageNumber > pdf.numPages) {
      return null;
    }
    const page = await pdf.getPage(pageNumber);
    return this.renderPageToCanvas(page, scale);
  }

  /**
   * Önceden çizilmiş canvas'lardan görsel sonuç üretir
   */
  public static buildVisualResultFromCanvases(
    canvas1: HTMLCanvasElement | null,
    canvas2: HTMLCanvasElement | null,
    pageNumber: number
  ): VisualCompareResult {
    return this.compareCanvases(canvas1, canvas2, pageNumber);
  }

  /**
   * Tek sayfayı görsel olarak karşılaştırır
   */
  public static async comparePageVisually(
    pdf1: pdfjsLib.PDFDocumentProxy,
    pdf2: pdfjsLib.PDFDocumentProxy,
    pageNumber: number,
    keepOverlay = true
  ): Promise<VisualCompareResult> {
    const canvas1 = pageNumber <= pdf1.numPages ? await this.renderPage(pdf1, pageNumber) : null;
    const canvas2 = pageNumber <= pdf2.numPages ? await this.renderPage(pdf2, pageNumber) : null;
    const result = this.compareCanvases(canvas1, canvas2, pageNumber);

    if (!keepOverlay) {
      return {
        pageNumber: result.pageNumber,
        differencePercentage: result.differencePercentage,
        hasVisualDifferences: result.hasVisualDifferences
      };
    }

    return result;
  }

  /**
   * Tüm sayfaları tarar; overlay canvas tutmaz
   */
  public static async scanVisualDifferences(
    pdf1: pdfjsLib.PDFDocumentProxy,
    pdf2: pdfjsLib.PDFDocumentProxy,
    options?: {
      onProgress?: (done: number, total: number) => void;
      shouldCancel?: () => boolean;
    }
  ): Promise<VisualCompareResult[]> {
    const maxPages = Math.max(pdf1.numPages, pdf2.numPages);
    const visualResults: VisualCompareResult[] = [];

    for (let i = 1; i <= maxPages; i++) {
      if (options?.shouldCancel?.()) {
        break;
      }

      visualResults.push(await this.comparePageVisually(pdf1, pdf2, i, false));
      options?.onProgress?.(i, maxPages);

      if (i % PDF_COMPARISON.VISUAL_YIELD_EVERY === 0) {
        await yieldToMain();
      }
    }

    return visualResults;
  }
  
  /**
   * İki PDF'i görsel olarak karşılaştırır
   */
  public static async compareVisually(file1Key: string, file2Key: string): Promise<VisualCompareResult[]> {
    try {
      const [pdf1, pdf2] = await Promise.all([
        this.loadPdfDocument(file1Key),
        this.loadPdfDocument(file2Key)
      ]);
      return this.scanVisualDifferences(pdf1, pdf2);
    } catch (error) {
      console.error('Görsel karşılaştırma hatası:', error);
      throw new Error('Görsel karşılaştırma yapılırken hata oluştu');
    }
  }

  private static buildCompareResult(
    pdf1Text: string[],
    pdf2Text: string[],
    meta: Pick<PdfCompareResult, 'file1Name' | 'file2Name' | 'file1Size' | 'file2Size'>
  ): PdfCompareResult {
    const pageCountDiff = pdf1Text.length !== pdf2Text.length;
    const pageResults: PdfPageCompareResult[] = [];
    const maxPages = Math.max(pdf1Text.length, pdf2Text.length);
    
    for (let i = 0; i < maxPages; i++) {
      const page1Text = i < pdf1Text.length ? pdf1Text[i] : '';
      const page2Text = i < pdf2Text.length ? pdf2Text[i] : '';
      const differences = this.compareTexts(page1Text, page2Text);
      const diffPercentage = this.calculateDiffPercentage(differences);
      
      pageResults.push({
        pageNumber: i + 1,
        hasDifferences: differences.some(d => d.added || d.removed),
        diffPercentage,
        differences
      });
    }
    
    return {
      ...meta,
      pageCount1: pdf1Text.length,
      pageCount2: pdf2Text.length,
      pageCountDiffers: pageCountDiff,
      pageResults,
      overallDiffPercentage: this.calculateOverallDiffPercentage(pageResults)
    };
  }
  
  /**
   * PDF verisinden metin çıkarır
   */
  private static async extractTextFromData(data: PdfSource): Promise<string[]> {
    const pdf = await pdfjsLib.getDocument({ data: this.toDocumentData(data) }).promise;
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

      if (i % PDF_COMPARISON.TEXT_YIELD_EVERY === 0) {
        await yieldToMain();
      }
    }
    
    return pagesText;
  }

  private static toDocumentData(data: PdfSource): PdfSource {
    if (typeof data === 'string' && data.includes(',')) {
      const base64Content = data.split(',')[1];
      const binaryString = window.atob(base64Content);
      const bytes = new Uint8Array(binaryString.length);
      
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      return bytes;
    }
    
    return data;
  }

  private static getStoredSize(data: PdfSource): number {
    if (typeof data === 'string') {
      return data.length;
    }
    return data.byteLength;
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
   * PDF sayfasını canvas'e render eder
   */
  private static async renderPageToCanvas(page: any, scale = VISUAL_COMPARISON.SCALE): Promise<HTMLCanvasElement> {
    const viewport = page.getViewport({ scale });
    
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    canvas.className = 'pdf-preview-page';
    
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
    
    const { overlayCanvas, differencePercentage } = createOverlayCanvas(canvas1, canvas2);
    
    return {
      pageNumber,
      differencePercentage,
      hasVisualDifferences: differencePercentage > VISUAL_COMPARISON.DIFFERENCE_THRESHOLD,
      overlayCanvas: overlayCanvas
    };
  }
}
