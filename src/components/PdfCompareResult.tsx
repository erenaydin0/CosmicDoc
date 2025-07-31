import React, { useState, useEffect, useRef } from 'react';
import { PdfCompareResult as PdfCompareResultType, CompareMode, VisualCompareResult } from '../types/PdfTypes';
import { PdfCompareService } from '../services/PdfCompareService';
import * as pdfjsLib from 'pdfjs-dist';
import jsPDF from 'jspdf';
import '../style/PdfCompareResult.css';
import { getPdfFile } from '../services/IndexedDBService';
import { formatFileSize } from '../utils/formatters';
import { exportPdfCompareResults } from '../utils/exportUtils';
import NoDiffMessage from './NoDiffMessage';
import StructureDiffTable from './StructureDiffTable';
import ExportButton from './ExportButton';

// Worker yolunu doğru şekilde ayarlayalım
pdfjsLib.GlobalWorkerOptions.workerSrc = window.location.origin + '/js/pdf.worker.js';

interface PdfCompareResultProps {
  result: PdfCompareResultType & {
    timestamp?: number;
    pdf1Key?: string;
    pdf2Key?: string;
  };
}

const PdfCompareResult: React.FC<PdfCompareResultProps> = ({ result }) => {
  const [pdf1Pages, setPdf1Pages] = useState<HTMLCanvasElement[]>([]);
  const [pdf2Pages, setPdf2Pages] = useState<HTMLCanvasElement[]>([]);
  const [overlayPages, setOverlayPages] = useState<HTMLCanvasElement[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [compareMode, setCompareMode] = useState<CompareMode>(CompareMode.TEXT);
  const [visualResults, setVisualResults] = useState<VisualCompareResult[]>([]);
  const [isComparingVisually, setIsComparingVisually] = useState<boolean>(false);
  
  const pdf1ContainerRef = useRef<HTMLDivElement>(null);
  const pdf2ContainerRef = useRef<HTMLDivElement>(null);
  const overlayContainerRef = useRef<HTMLDivElement>(null);
  const comparisonResultsRef = useRef<HTMLDivElement>(null);

  // Sayfa referanslarını tutmak için useRef kullanıyoruz
  const pdf1PageRefs = useRef<Array<HTMLDivElement | null>>([]);
  const pdf2PageRefs = useRef<Array<HTMLDivElement | null>>([]);
  
  // Toplam fark sayısını hesapla
  const calculateTotalDiffCount = () => {
    let totalDiffCount = 0;
    result.pageResults.forEach(page => {
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

  // PDF sayfalarını oluştur
  useEffect(() => {
    const renderPdfPages = async () => {
      try {
        setIsLoading(true);
        
        // IndexedDB'den PDF verilerini al
        const pdf1Key = result.pdf1Key || `pdf1_${result.timestamp}`;
        const pdf2Key = result.pdf2Key || `pdf2_${result.timestamp}`;
        
        console.log('PDF anahtarları:', pdf1Key, pdf2Key);
        
        const file1Data = await getPdfFile<any>(pdf1Key);
        const file2Data = await getPdfFile<any>(pdf2Key);
        
        if (!file1Data || !file2Data) {
          console.error('PDF verileri IndexedDB\'den alınamadı');
          setIsLoading(false);
          return;
        }
        
        console.log('PDF worker yolu:', pdfjsLib.GlobalWorkerOptions.workerSrc);
        
        // PDF dokümanlarını yükle
        const loadDocument1 = pdfjsLib.getDocument(file1Data.data).promise;
        const loadDocument2 = pdfjsLib.getDocument(file2Data.data).promise;
        
        // PDF dokümanlarını paralel olarak yükle
        const [pdf1, pdf2] = await Promise.all([loadDocument1, loadDocument2]);
        
        // Sayfa sayılarını al
        const numPages1 = pdf1.numPages;
        const numPages2 = pdf2.numPages;
        
        // PDF 1 sayfalarını render et
        const pdf1CanvasElements: HTMLCanvasElement[] = [];
        for (let i = 1; i <= numPages1; i++) {
          const page = await pdf1.getPage(i);
          const scale = 1.5;
          const viewport = page.getViewport({ scale });
          
          const canvas = document.createElement('canvas');
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          canvas.className = 'pdf-preview-page';
          
          const context = canvas.getContext('2d')!;
          await page.render({ canvasContext: context, viewport }).promise;
          
          pdf1CanvasElements.push(canvas);
        }
        
        // PDF 2 sayfalarını render et
        const pdf2CanvasElements: HTMLCanvasElement[] = [];
        for (let i = 1; i <= numPages2; i++) {
          const page = await pdf2.getPage(i);
          const scale = 1.5;
          const viewport = page.getViewport({ scale });
          
          const canvas = document.createElement('canvas');
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          canvas.className = 'pdf-preview-page';
          
          const context = canvas.getContext('2d')!;
          await page.render({ canvasContext: context, viewport }).promise;
          
          pdf2CanvasElements.push(canvas);
        }
        
        setPdf1Pages(pdf1CanvasElements);
        setPdf2Pages(pdf2CanvasElements);
      } catch (error) {
        console.error('PDF render hatası:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    // PDF sayfalarını render et
    renderPdfPages();
    
    // Component kaldırıldığında temizle
    return () => {
      // Canvas elementlerini temizle
      setPdf1Pages([]);
      setPdf2Pages([]);
    };
  }, [result]);
  
  // PDF'ler yüklendiğinde otomatik kaydırma
  useEffect(() => {
    if (!isLoading && comparisonResultsRef.current) {
      comparisonResultsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [isLoading]);

  // PDF yapı karşılaştırma tablosunu oluştur
  const renderPdfStructureDiffTable = () => {
    // Sayfa farkını hesapla
    const pageDiff = result.pageCount2 - result.pageCount1;
    // Boyut farkını hesapla
    const sizeDiff = result.file2Size - result.file1Size;

    const rows = [
      {
        label: 'Sayfa',
        value1: result.pageCount1,
        value2: result.pageCount2,
        diff: Math.abs(pageDiff),
        isDiffZero: pageDiff === 0
      },
      {
        label: 'Boyut',
        value1: formatFileSize(result.file1Size),
        value2: formatFileSize(result.file2Size),
        diff: formatFileSize(Math.abs(sizeDiff)),
        isDiffZero: sizeDiff === 0
      }
    ];

    return <StructureDiffTable rows={rows} />;
  };

  // PDF görüntüleme alanlarını senkronize et (sadece metin modunda)
  useEffect(() => {
    // Sadece metin karşılaştırma modunda senkronizasyon aktif
    if (compareMode !== CompareMode.TEXT) {
      return;
    }

    let isScrolling = false; // Sonsuz döngüyü engellemek için

    const syncScroll = (e: Event) => {
      if (isScrolling) return; // Eğer programmatik kaydırma yapılıyorsa işlemi durdur
      
      if (pdf1ContainerRef.current && pdf2ContainerRef.current) {
        const target = e.currentTarget as HTMLDivElement;
        isScrolling = true; // Programmatik kaydırma başlatılıyor
        
        if (target === pdf1ContainerRef.current) {
          pdf2ContainerRef.current.scrollTop = target.scrollTop;
        } else if (target === pdf2ContainerRef.current) {
          pdf1ContainerRef.current.scrollTop = target.scrollTop;
        }
        
        // Kısa bir gecikme sonrası flag'i sıfırla
        setTimeout(() => {
          isScrolling = false;
        }, 10);
      }
    };
    
    // Scroll event listener'ları ekle
    const pdf1Container = pdf1ContainerRef.current;
    const pdf2Container = pdf2ContainerRef.current;
    
    if (pdf1Container) {
      pdf1Container.addEventListener('scroll', syncScroll);
    }
    
    if (pdf2Container) {
      pdf2Container.addEventListener('scroll', syncScroll);
    }
    
    // Cleanup
    return () => {
      if (pdf1Container) {
        pdf1Container.removeEventListener('scroll', syncScroll);
      }
      
      if (pdf2Container) {
        pdf2Container.removeEventListener('scroll', syncScroll);
      }
    };
  }, [pdf1Pages, pdf2Pages, compareMode]);

  // Sayfa detaylarına tıklama olayını yönet (metin modu için)
  const handlePageDetailsClick = (pageNumber: number) => {
    // Sadece metin modunda çalışır
    if (compareMode !== CompareMode.TEXT) return;
    
    const pdf1PageWrapper = pdf1PageRefs.current[pageNumber - 1];
    const pdf2PageWrapper = pdf2PageRefs.current[pageNumber - 1];

    if (pdf1PageWrapper && pdf1ContainerRef.current) {
      const pdf1PageNumberElement = pdf1PageWrapper.querySelector('.pdf-page-number') as HTMLDivElement;
      if (pdf1PageNumberElement) {
        const containerRect = pdf1ContainerRef.current.getBoundingClientRect();
        const elementRect = pdf1PageNumberElement.getBoundingClientRect();
        // Sayfa başlığını container'ın en üstüne getirmek için kaydırma miktarını hesapla
        pdf1ContainerRef.current.scrollTop += (elementRect.top - containerRect.top);
      }
    }
    if (pdf2PageWrapper && pdf2ContainerRef.current) {
      const pdf2PageNumberElement = pdf2PageWrapper.querySelector('.pdf-page-number') as HTMLDivElement;
      if (pdf2PageNumberElement) {
        const containerRect = pdf2ContainerRef.current.getBoundingClientRect();
        const elementRect = pdf2PageNumberElement.getBoundingClientRect();
        // Sayfa başlığını container'ın en üstüne getirmek için kaydırma miktarını hesapla
        pdf2ContainerRef.current.scrollTop += (elementRect.top - containerRect.top);
      }
    }
  };

  // Görsel karşılaştırma için sayfa yönlendirme
  const handleVisualPageClick = (pageNumber: number) => {
    // Sadece görsel modunda çalışır
    if (compareMode !== CompareMode.VISUAL) return;
    
    if (overlayContainerRef.current) {
      // Overlay container'daki ilgili sayfayı bul
      const overlayPages = overlayContainerRef.current.querySelectorAll('.pdf-canvas-container');
      const targetPage = overlayPages[pageNumber - 1] as HTMLElement;
      
      if (targetPage) {
        const containerRect = overlayContainerRef.current.getBoundingClientRect();
        const elementRect = targetPage.getBoundingClientRect();
        
        // Sayfayı container'ın üstüne getir
        overlayContainerRef.current.scrollTop += (elementRect.top - containerRect.top - 20);
      }
    }
  };

  // Görsel karşılaştırma işlevi
  const handleVisualCompare = async () => {
    if (!result.pdf1Key || !result.pdf2Key) {
      console.error('PDF anahtarları bulunamadı');
      return;
    }
    
    setIsComparingVisually(true);
    try {
      const visualResults = await PdfCompareService.compareVisually(result.pdf1Key, result.pdf2Key);
      setVisualResults(visualResults);
      
      // Overlay canvas'ları ayıkla
      const overlayCanvases = visualResults.map(vr => vr.overlayCanvas).filter(Boolean) as HTMLCanvasElement[];
      setOverlayPages(overlayCanvases);
    } catch (error) {
      console.error('Görsel karşılaştırma hatası:', error);
    } finally {
      setIsComparingVisually(false);
    }
  };

  // Karşılaştırma modunu değiştir
  const handleModeChange = (mode: CompareMode) => {
    // Scroll pozisyonlarını sıfırla
    if (pdf1ContainerRef.current) {
      pdf1ContainerRef.current.scrollTop = 0;
    }
    if (pdf2ContainerRef.current) {
      pdf2ContainerRef.current.scrollTop = 0;
    }
    if (overlayContainerRef.current) {
      overlayContainerRef.current.scrollTop = 0;
    }
    
    setCompareMode(mode);
    if (mode === CompareMode.VISUAL && visualResults.length === 0) {
      handleVisualCompare();
    }
  };

  // Excel'e aktarma işlevi
  const handleExportToExcel = () => {
    exportPdfCompareResults(result.pageResults);
  };

  // Görsel karşılaştırma sonuçlarını PDF'e aktarma işlevi
  const handleExportVisualToPdf = async () => {
    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      
      // Canvas görüntülerini ekle
      if (overlayPages.length > 0) {
        for (let i = 0; i < overlayPages.length; i++) {
          const canvas = overlayPages[i];
          const visualResult = visualResults[i];
          
          if (visualResult && visualResult.hasVisualDifferences) {
            if (i > 0) {
              pdf.addPage();
            }
            
            // Canvas'ı PDF'e ekle
            const imgData = canvas.toDataURL('image/jpeg', 0.8);
            const imgWidth = pageWidth - 20;
            const imgHeight = (canvas.height * imgWidth) / canvas.width;
            
            // Sayfaya sığacak şekilde boyutlandır
            const maxHeight = pageHeight - 30;
            const finalHeight = Math.min(imgHeight, maxHeight);
            const finalWidth = (canvas.width * finalHeight) / canvas.height;
            
            const x = (pageWidth - finalWidth) / 2;
            pdf.addImage(imgData, 'JPEG', x, 15, finalWidth, finalHeight);
            
            // Sayfa bilgisi
            pdf.setFontSize(10);
            pdf.text(`Sayfa ${visualResult.pageNumber} - Farklılık: %${visualResult.differencePercentage.toFixed(2)}`, 10, pageHeight - 10);
          }
        }
      }
      
      // PDF'i kaydet
      pdf.save('gorsel_karsilastirma_raporu.pdf');
    } catch (error) {
      console.error('PDF export hatası:', error);
      alert('PDF oluşturulurken bir hata oluştu.');
    }
  };


  return (
        <div className="compare-layout">
          <div className="preview-section">
            {calculateTotalDiffCount() === 0 && !isLoading && compareMode === CompareMode.TEXT ? (
                <NoDiffMessage />
            ) : compareMode === CompareMode.VISUAL && visualResults.length > 0 && 
                visualResults.filter(vr => vr.hasVisualDifferences).length === 0 && !isLoading && !isComparingVisually ? (
                <NoDiffMessage message="Dosyalar arasında görsel fark bulunamadı." />
            ) : (
              <div className="pdf-previews">
                {compareMode === CompareMode.TEXT ? (
                  <>
                    <div className="pdf-preview-container">
                      <div className="pdf-preview-header">
                        <h3>{result.file1Name}</h3>
                        <span>{result.pageCount1} sayfa</span>
                      </div>
                      <div 
                        className="pdf-preview-pages"
                        ref={pdf1ContainerRef}
                      >
                        {isLoading ? (
                          <div className="pdf-preview-loading">Yükleniyor...</div>
                        ) : (
                          pdf1Pages.map((canvas, index) => (
                            <div key={`pdf1-page-${index}`} ref={el => pdf1PageRefs.current[index] = el}>
                              <div className="pdf-page-number">Sayfa {index + 1}</div>
                              <div 
                                className="pdf-canvas-container"
                                ref={el => {
                                  if (el && !el.firstChild) {
                                    el.appendChild(canvas);
                                  }
                                }}
                              />
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                    
                    <div className="pdf-preview-container">
                      <div className="pdf-preview-header">
                        <h3>{result.file2Name}</h3>
                        <span>{result.pageCount2} sayfa</span>
                      </div>
                      <div 
                        className="pdf-preview-pages"
                        ref={pdf2ContainerRef}
                      >
                        {isLoading ? (
                          <div className="pdf-preview-loading">Yükleniyor...</div>
                        ) : (
                          pdf2Pages.map((canvas, index) => (
                            <div key={`pdf2-page-${index}`} ref={el => pdf2PageRefs.current[index] = el}>
                              <div className="pdf-page-number">Sayfa {index + 1}</div>
                              <div 
                                className="pdf-canvas-container"
                                ref={el => {
                                  if (el && !el.firstChild) {
                                    el.appendChild(canvas);
                                  }
                                }}
                              />
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="pdf-preview-container single-preview">
                    <div className="pdf-preview-header">
                      <h3>Görsel Karşılaştırma</h3>
                      <span>Üst üste bindirme</span>
                    </div>
                    <div 
                      className="pdf-preview-pages"
                      ref={overlayContainerRef}
                    >
                      {isLoading || isComparingVisually ? (
                        <div className="pdf-preview-loading">
                          {isComparingVisually ? 'Görsel karşılaştırma yapılıyor...' : 'Yükleniyor...'}
                        </div>
                      ) : (
                        overlayPages.map((canvas, index) => (
                          <div key={`overlay-page-${index}`}>
                            <div className="pdf-page-number">Sayfa {index + 1}</div>
                            <div 
                              className="pdf-canvas-container"
                              ref={el => {
                                if (el && !el.firstChild) {
                                  el.appendChild(canvas);
                                }
                              }}
                            />
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          
          <div className="summary-section" ref={comparisonResultsRef}>
            <div className="result-header">
              <h2>PDF Karşılaştırma Sonucu</h2>
              <div className="compare-mode-buttons">
                <button 
                  className={`mode-button ${compareMode === CompareMode.TEXT ? 'active' : ''}`}
                  onClick={() => handleModeChange(CompareMode.TEXT)}
                >
                  Metin Karşılaştırma
                </button>
                <button 
                  className={`mode-button ${compareMode === CompareMode.VISUAL ? 'active' : ''}`}
                  onClick={() => handleModeChange(CompareMode.VISUAL)}
                  disabled={isComparingVisually}
                >
                  Görsel Karşılaştırma
                </button>
              </div>
              <div className="summary-info">
                <div className="summary-item">
                  <span>Toplam Fark Sayısı:</span>
                  <span className={calculateTotalDiffCount() > 0 ? 'diff-high' : 'diff-none'}>
                    {calculateTotalDiffCount()}
                  </span>
                </div>
                {renderPdfStructureDiffTable()}
              </div>
            </div>

            {compareMode === CompareMode.VISUAL && visualResults.filter(vr => vr.hasVisualDifferences).length > 0 && (
              <ExportButton 
                onClick={handleExportVisualToPdf}
                label="Rapor İndir"
              />
            )}
            
            {compareMode === CompareMode.TEXT && calculateTotalDiffCount() > 0 && (
              <>
                <ExportButton onClick={handleExportToExcel} />
                <div className="all-pages-details">
                  {result.pageResults.map((page, pageIndex) => {
                    const pageDifferences = page.differences.filter(diff => diff.added || diff.removed);
                    let pageDiffCount = 0;
                    let i = 0;
                    while (i < pageDifferences.length) {
                      const currentDiff = pageDifferences[i];
                      if (currentDiff.removed && pageDifferences[i + 1] && pageDifferences[i + 1].added) {
                        pageDiffCount += 1; // Değişiklik olarak say (silindi + eklendi)
                        i += 2; // Bir sonraki çifti kontrol et
                      } else {
                        pageDiffCount += 1; // Tekli ekleme veya silme olarak say
                        i += 1; // Bir sonraki farkı kontrol et
                      }
                    }
                    
                    if (pageDiffCount === 0) return null; // Fark yoksa sayfayı gösterme

                    return (
                      <div 
                        key={pageIndex}
                        className="page-details"
                        onClick={() => handlePageDetailsClick(page.pageNumber)}
                      >
                        <h3>Sayfa {page.pageNumber} <span className="diff-count">({pageDiffCount} fark)</span></h3>
                        <div className="text-comparison">
                          <div className="text-diff">
                            {page.differences
                              .filter(diff => diff.added || diff.removed)
                              .map((diff, i) => (
                                <div 
                                  key={i} 
                                  className={diff.added ? 'added-line' : 'removed-line'}
                                >
                                  <span className="diff-prefix">{diff.added ? '+' : '-'}</span>
                                  <span className="diff-content">{diff.value}</span>
                                </div>
                              ))}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            {compareMode === CompareMode.VISUAL && visualResults.length > 0 && (
              <div className="visual-results">
                {visualResults.map((vResult, index) => (
                  vResult.hasVisualDifferences && (
                    <div 
                      key={index} 
                      className="visual-page-result"
                      onClick={() => handleVisualPageClick(vResult.pageNumber)}
                    >
                      <h4>Sayfa {vResult.pageNumber}</h4>
                      <p>Görsel Farklılık: %{vResult.differencePercentage.toFixed(2)}</p>
                    </div>
                  )
                ))}
                {visualResults.filter(vr => vr.hasVisualDifferences).length === 0 && (
                  <p className="no-visual-diff">Görsel farklılık tespit edilmedi.</p>
                )}
              </div>
            )}
          </div>
        </div>

  );
};

export default PdfCompareResult;