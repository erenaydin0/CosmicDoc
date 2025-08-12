import React, { useState, useEffect, useRef } from 'react';
import FileUpload from '../components/FileUpload';
import { PdfCompareService } from '../services/PdfCompareService';
import { PdfCompareResult as PdfCompareResultType, CompareMode, VisualCompareResult } from '../types/PdfTypes';
import { savePdfFile, clearPdfStore, getPdfFile } from '../services/IndexedDBService';
import '../style/PageStyles.css';
import * as pdfjsLib from 'pdfjs-dist';
import jsPDF from 'jspdf';
import { formatFileSize } from '../utils/formatters';
import { exportPdfCompareResults } from '../utils/exportUtils';
import { calculatePdfDiffCount, calculatePageDiffCount } from '../utils/diffUtils';
import ComparisonLayout, { ComparisonResultLayout, ExportButton } from '../components/ComparisonResult';
import { useTranslation } from 'react-i18next';

// Worker yolunu doğru şekilde ayarlayalım
pdfjsLib.GlobalWorkerOptions.workerSrc = window.location.origin + '/js/pdf.worker.js';


const PdfCompare: React.FC = () => {
  const { t } = useTranslation();
  const allowedPdfTypes = ['.pdf'];
  const [compareResult, setCompareResult] = useState<PdfCompareResultType | null>(null);
  
  // Component ilk yüklendiğinde verileri temizle
  useEffect(() => {
    // Tüm eski PDF verilerini temizle
    clearPdfStore().catch(err => console.error('PDF deposu temizlenirken hata:', err));
    
    return () => {
      // Component kaldırıldığında da temizleme işlemi yapabilirsiniz
    };
  }, []);
  
  const handleCompare = async (file1: File, file2: File) => {
    setCompareResult(null);
    
    try {
      // Yeni bir timestamp oluştur
      const timestamp = Date.now();
      
      // Önceki verileri temizle
      await clearPdfStore();
      
      // Her yeni PDF karşılaştırması için benzersiz anahtarlar oluştur
      const pdf1Key = `pdf1_${timestamp}`;
      const pdf2Key = `pdf2_${timestamp}`;
      
      // PDF dosyalarını IndexedDB'ye kaydet
      const saveFileToIndexedDB = async (file: File, key: string) => {
        return new Promise<void>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = async (e) => {
            try {
              const dataUrl = e.target?.result;
              if (dataUrl) {
                // Dosyayı IndexedDB'ye kaydet
                await savePdfFile(key, dataUrl, {
                  fileName: file.name,
                  fileType: file.type,
                  lastModified: file.lastModified,
                  timestamp: timestamp
                });
                resolve();
              } else {
                reject(new Error('Dosya okunamadı'));
              }
            } catch (err) {
              reject(err);
            }
          };
          reader.onerror = (e) => reject(e);
          reader.readAsDataURL(file);
        });
      };

      // PDF dosyalarını paralel olarak kaydet
      await Promise.all([
        saveFileToIndexedDB(file1, pdf1Key),
        saveFileToIndexedDB(file2, pdf2Key)
      ]);
      
      const result = await PdfCompareService.comparePdfFiles(file1, file2);
      // Karşılaştırma sonucuna timestamp ekle
      const resultWithTimestamp = {
        ...result,
        timestamp: timestamp,
        pdf1Key,
        pdf2Key
      };
      setCompareResult(resultWithTimestamp);
    } catch (error) {
      console.error('PDF karşılaştırma hatası:', error);
    }
  };

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
      return calculatePdfDiffCount(result.pageResults);
    };
  
    // PDF sayfalarını oluştur
    useEffect(() => {
      const renderPdfPages = async () => {
        try {
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
  
    const noDifference = 
      (compareMode === CompareMode.TEXT && calculateTotalDiffCount() === 0) || 
      (compareMode === CompareMode.VISUAL && 
       visualResults.length > 0 && 
       visualResults.filter(vr => vr.hasVisualDifferences).length === 0);

    const previewContent = (
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
                {pdf1Pages.map((canvas, index) => (
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
                ))}
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
                {pdf2Pages.map((canvas, index) => (
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
                ))}
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
              {overlayPages.map((canvas, index) => (
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
              ))}
            </div>
          </div>
        )}
      </div>
    );
  
    const summaryContent = (
      <>
      <div className="compare-mode-buttons">
            <button 
              className={`mode-button ${compareMode === CompareMode.TEXT ? 'active' : ''}`}
              onClick={() => handleModeChange(CompareMode.TEXT)}
            >
              {t('pdf.modes.text')}
            </button>
            <button 
              className={`mode-button ${compareMode === CompareMode.VISUAL ? 'active' : ''}`}
              onClick={() => handleModeChange(CompareMode.VISUAL)}
              disabled={isComparingVisually}
            >
              {t('pdf.modes.visual')}
            </button>
          </div>
        <div ref={comparisonResultsRef}>
          <ComparisonResultLayout
            title={t('pdf.results.title')}
            fileName1={result.file1Name}
            fileName2={result.file2Name}
            totalDiffCount={calculateTotalDiffCount()}
            structureDiffRows={[
              {
                label: t('pdf.results.summary.page'),
                value1: result.pageCount1,
                value2: result.pageCount2,
                diff: Math.abs(result.pageCount2 - result.pageCount1),
                isDiffZero: result.pageCount2 - result.pageCount1 === 0
              },
              {
                label: t('pdf.results.summary.size'),
                value1: formatFileSize(result.file1Size),
                value2: formatFileSize(result.file2Size),
                diff: formatFileSize(Math.abs(result.file2Size - result.file1Size)),
                isDiffZero: result.file2Size - result.file1Size === 0
              }
            ]}
            exportButton={
              compareMode === CompareMode.VISUAL && visualResults.filter(vr => vr.hasVisualDifferences).length > 0 ? (
                <ExportButton onClick={handleExportVisualToPdf} label={t('pdf.exportReport')} />
              ) : compareMode === CompareMode.TEXT && calculateTotalDiffCount() > 0 ? (
                <ExportButton onClick={handleExportToExcel} />
              ) : undefined
            }
          />
        </div>
        
        {compareMode === CompareMode.TEXT && calculateTotalDiffCount() > 0 && (
          <div className="all-pages-details">
            {result.pageResults.map((page, pageIndex) => {
              const pageDifferences = page.differences.filter(diff => diff.added || diff.removed);
              const pageDiffCount = calculatePageDiffCount(pageDifferences);
              
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
          </div>
        )}
      </>
    );
  
    return (
      <ComparisonLayout
        noDifference={noDifference && !isLoading && !isComparingVisually}
        isLoading={isLoading || isComparingVisually}
        previewContent={previewContent}
        summaryContent={summaryContent}
      />
    );
  };

  return (
    <div className="page-content">
      <h1>{t('pdf.title')}</h1>
      <p className="page-description">
        {t('pdf.description')}
      </p>
      
      <FileUpload 
        onCompare={handleCompare} 
        pageType="pdf" 
        allowedFileTypes={allowedPdfTypes}
      />
      
      {compareResult && <PdfCompareResult result={compareResult} />}
    </div>
  );
};

export default PdfCompare;
