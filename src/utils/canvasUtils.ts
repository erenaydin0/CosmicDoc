/**
 * Canvas işlemleri için yardımcı fonksiyonlar
 */

import { VISUAL_COMPARISON } from '../constants/comparison';
import { DIFF_COLORS, CANVAS_COLORS } from '../constants/colors';

/**
 * Canvas üzerinde diff overlay oluşturur
 * @param originalCanvas Orijinal canvas
 * @param overlayCanvas Overlay canvas (farkları içeren)
 * @returns Birleştirilmiş canvas
 */
export const createDiffOverlay = (
  originalCanvas: HTMLCanvasElement,
  overlayCanvas: HTMLCanvasElement,
  hasVisualDifferences: boolean
): HTMLCanvasElement => {
  const combinedCanvas = document.createElement('canvas');
  combinedCanvas.width = originalCanvas.width;
  combinedCanvas.height = originalCanvas.height;
  combinedCanvas.className = 'pdf-preview-page';
  
  const ctx = combinedCanvas.getContext('2d')!;
  
  // Orijinal PDF'i çiz
  ctx.drawImage(originalCanvas, 0, 0);
  
  // Diff varsa sarı highlight ekle
  if (hasVisualDifferences && overlayCanvas) {
    const overlayData = overlayCanvas.getContext('2d')!.getImageData(
      0, 0, overlayCanvas.width, overlayCanvas.height
    );
    
    const currentData = ctx.getImageData(0, 0, combinedCanvas.width, combinedCanvas.height);
    
    for (let j = 0; j < overlayData.data.length; j += 4) {
      const r = overlayData.data[j];
      const g = overlayData.data[j + 1];
      const b = overlayData.data[j + 2];
      
      // Kırmızı piksel mi kontrol et (overlay'deki kırmızı işaretler)
      if (r > 200 && g < 100 && b < 100) {
        // Sarı highlight ekle (alpha blending)
        const alpha = DIFF_COLORS.HIGHLIGHT.ALPHA;
        currentData.data[j] = currentData.data[j] * (1 - alpha) + DIFF_COLORS.HIGHLIGHT.R * alpha;
        currentData.data[j + 1] = currentData.data[j + 1] * (1 - alpha) + DIFF_COLORS.HIGHLIGHT.G * alpha;
        currentData.data[j + 2] = currentData.data[j + 2] * (1 - alpha) + DIFF_COLORS.HIGHLIGHT.B * alpha;
      }
    }
    
    ctx.putImageData(currentData, 0, 0);
  }
  
  return combinedCanvas;
};

/**
 * İki canvas'ı piksel bazında karşılaştırır
 * @param canvas1 İlk canvas
 * @param canvas2 İkinci canvas
 * @returns Fark yüzdesi ve farklı piksel sayısı
 */
export const compareCanvasPixels = (
  canvas1: HTMLCanvasElement,
  canvas2: HTMLCanvasElement
): { differencePercentage: number } => {
  const minWidth = Math.min(canvas1.width, canvas2.width);
  const minHeight = Math.min(canvas1.height, canvas2.height);
  
  const imageData1 = canvas1.getContext('2d')!.getImageData(0, 0, minWidth, minHeight);
  const imageData2 = canvas2.getContext('2d')!.getImageData(0, 0, minWidth, minHeight);
  
  let differentPixels = 0;
  const threshold = VISUAL_COMPARISON.PIXEL_THRESHOLD;
  
  for (let y = 0; y < minHeight; y++) {
    for (let x = 0; x < minWidth; x++) {
      const index1 = (y * canvas1.width + x) * 4;
      const index2 = (y * canvas2.width + x) * 4;
      
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
        }
      }
    }
  }
  
  const totalPixels = minWidth * minHeight;
  const differencePercentage = totalPixels > 0 ? (differentPixels / totalPixels) * 100 : 0;
  
  return { differencePercentage };
};

/**
 * Overlay canvas oluşturur ve farkları işaretler
 * @param canvas1 İlk canvas
 * @param canvas2 İkinci canvas
 * @returns Overlay canvas ve fark bilgileri
 */
export const createOverlayCanvas = (
  canvas1: HTMLCanvasElement,
  canvas2: HTMLCanvasElement
): { overlayCanvas: HTMLCanvasElement; differencePercentage: number } => {
  const maxWidth = Math.max(canvas1.width, canvas2.width);
  const maxHeight = Math.max(canvas1.height, canvas2.height);
  
  const overlayCanvas = document.createElement('canvas');
  overlayCanvas.width = maxWidth;
  overlayCanvas.height = maxHeight;
  const overlayCtx = overlayCanvas.getContext('2d')!;
  
  // Beyaz arka plan ekle
  overlayCtx.fillStyle = CANVAS_COLORS.WHITE;
  overlayCtx.fillRect(0, 0, maxWidth, maxHeight);
  
  // İlk canvas'ı tam opak çiz
  overlayCtx.globalAlpha = 1.0;
  overlayCtx.globalCompositeOperation = 'source-over';
  overlayCtx.drawImage(canvas1, 0, 0);
  
  // Farkları hesapla ve işaretle
  const { differencePercentage } = compareCanvasPixels(canvas1, canvas2);
  
  if (differencePercentage > 0) {
    const imageData1 = canvas1.getContext('2d')!.getImageData(
      0, 0, Math.min(canvas1.width, maxWidth), Math.min(canvas1.height, maxHeight)
    );
    const imageData2 = canvas2.getContext('2d')!.getImageData(
      0, 0, Math.min(canvas2.width, maxWidth), Math.min(canvas2.height, maxHeight)
    );
    
    const overlayImageData = overlayCtx.getImageData(0, 0, maxWidth, maxHeight);
    
    const minWidth = Math.min(canvas1.width, canvas2.width, maxWidth);
    const minHeight = Math.min(canvas1.height, canvas2.height, maxHeight);
    const threshold = VISUAL_COMPARISON.PIXEL_THRESHOLD;
    
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
            overlayImageData.data[overlayIndex] = DIFF_COLORS.OVERLAY_MARK.R;
            overlayImageData.data[overlayIndex + 1] = DIFF_COLORS.OVERLAY_MARK.G;
            overlayImageData.data[overlayIndex + 2] = DIFF_COLORS.OVERLAY_MARK.B;
            overlayImageData.data[overlayIndex + 3] = DIFF_COLORS.OVERLAY_MARK.ALPHA;
          }
        }
      }
    }
    
    overlayCtx.putImageData(overlayImageData, 0, 0);
  }
  
  return { overlayCanvas, differencePercentage };
};

