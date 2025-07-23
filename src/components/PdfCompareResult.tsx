import React, { useState, useEffect, useRef } from 'react';
import { PdfCompareResult as PdfCompareResultType } from '../types/PdfTypes';
import * as pdfjsLib from 'pdfjs-dist';
import * as XLSX from 'xlsx';
import '../style/PdfCompareResult.css';

// Worker yolunu doğru şekilde ayarlayalım
pdfjsLib.GlobalWorkerOptions.workerSrc = window.location.origin + '/js/pdf.worker.js';

interface PdfCompareResultProps {
  result: PdfCompareResultType;
}

const PdfCompareResult: React.FC<PdfCompareResultProps> = ({ result }) => {
  const [pdf1Pages, setPdf1Pages] = useState<HTMLCanvasElement[]>([]);
  const [pdf2Pages, setPdf2Pages] = useState<HTMLCanvasElement[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  
  const pdf1ContainerRef = useRef<HTMLDivElement>(null);
  const pdf2ContainerRef = useRef<HTMLDivElement>(null);

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

  // Dosya boyutunu okunabilir formata dönüştür
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    else if (bytes < 1048576) return (bytes / 1024).toFixed(2) + ' KB';
    else if (bytes < 1073741824) return (bytes / 1048576).toFixed(2) + ' MB';
    else return (bytes / 1073741824).toFixed(2) + ' GB';
  };
  
  // PDF sayfalarını oluştur
  useEffect(() => {
    const renderPdfPages = async () => {
      try {
        setIsLoading(true);
        
        // PDF veri URL'lerini oluştur (normalde FileReader kullanırdık ama burada veri simüle ediyoruz)
        const file1DataUrl = localStorage.getItem('pdf1DataUrl');
        const file2DataUrl = localStorage.getItem('pdf2DataUrl');
        
        if (!file1DataUrl || !file2DataUrl) {
          console.error('PDF veri URL\'leri bulunamadı');
          setIsLoading(false);
          return;
        }
        
        console.log('PDF worker yolu:', pdfjsLib.GlobalWorkerOptions.workerSrc);
        
        // PDF dokümanlarını yükle
        const loadDocument1 = pdfjsLib.getDocument(file1DataUrl).promise;
        const loadDocument2 = pdfjsLib.getDocument(file2DataUrl).promise;
        
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
  }, [result]);
  
  // PDF görüntüleme alanlarını senkronize et
  useEffect(() => {
    const syncScroll = (e: Event) => {
      if (pdf1ContainerRef.current && pdf2ContainerRef.current) {
        const target = e.currentTarget as HTMLDivElement;
        if (target === pdf1ContainerRef.current) {
          pdf2ContainerRef.current.scrollTop = target.scrollTop;
        } else if (target === pdf2ContainerRef.current) {
          pdf1ContainerRef.current.scrollTop = target.scrollTop;
        }
      }
    };
    
    // Scroll event listener'ları ekle
    if (pdf1ContainerRef.current) {
      pdf1ContainerRef.current.addEventListener('scroll', syncScroll);
    }
    
    if (pdf2ContainerRef.current) {
      pdf2ContainerRef.current.addEventListener('scroll', syncScroll);
    }
    
    // Cleanup
    return () => {
      if (pdf1ContainerRef.current) {
        pdf1ContainerRef.current.removeEventListener('scroll', syncScroll);
      }
      
      if (pdf2ContainerRef.current) {
        pdf2ContainerRef.current.removeEventListener('scroll', syncScroll);
      }
    };
  }, [pdf1Pages, pdf2Pages]);

  // Sayfa detaylarına tıklama olayını yönet
  const handlePageDetailsClick = (pageNumber: number) => {
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

  // Excel'e aktarma işlevi
  const handleExportToExcel = () => {
    const allRows: any[] = [];

    result.pageResults.forEach(page => {
      const pageNumber = page.pageNumber;
      const differences = page.differences.filter(diff => diff.added || diff.removed); // Sadece gerçek farkları dikkate al

      let i = 0;
      while (i < differences.length) {
        const currentDiff = differences[i];

        if (currentDiff.removed && differences[i + 1] && differences[i + 1].added) {
          // Bir çift bulundu: silineni eklenen takip ediyor (bir değişiklik)
          const nextDiff = differences[i + 1];
          allRows.push({
            Sayfa: pageNumber,
            'Dosya 1': currentDiff.value,
            'Dosya 2': nextDiff.value,
          });
          i += 2; // Hem mevcut hem de bir sonraki farkı atla
        } else {
          // Tek bir eklenen veya silinen fark
          allRows.push({
            Sayfa: pageNumber,
            'Dosya 1': currentDiff.removed ? currentDiff.value : '',
            'Dosya 2': currentDiff.added ? currentDiff.value : '',
          });
          i += 1; // Bir sonraki farka geç
        }
      }
    });

    const ws = XLSX.utils.json_to_sheet(allRows); // allRows kullan
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'PDF Farkları');
    XLSX.writeFile(wb, 'pdf_fark_raporu.xlsx');
  };

  return (
    <div className="pdf-compare-result">
      <div className="result-container">
        <div className="pdf-previews">
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
        </div>
        
        <div className="comparison-results">
          <div className="result-header">
            <h2>PDF Karşılaştırma Sonucu</h2>
            <div className="summary-info">
              <div className="summary-item">
                <span>Toplam Fark Sayısı:</span>
                <span className={calculateTotalDiffCount() > 0 ? 'diff-high' : 'diff-none'}>
                  {calculateTotalDiffCount()}
                </span>
              </div>
              <div className="summary-item">
                <span>Boyut Farkı:</span>
                <span>
                  {formatFileSize(Math.abs(result.file1Size - result.file2Size))}
                </span>
              </div>
              <div className="summary-item">
                <span>Dosya 1 Sayfa:</span>
                <span>{result.pageCount1}</span>
              </div>
              <div className="summary-item">
                <span>Dosya 2 Sayfa:</span>
                <span>{result.pageCount2}</span>
              </div>
              <div className="summary-item">
                <span>Sayfa Sayısı Farklı:</span>
                <span className={result.pageCountDiffers ? 'diff-high' : 'diff-none'}>
                  {result.pageCountDiffers ? 'Evet' : 'Hayır'}
                </span>
              </div>
            </div>
          </div>

          {calculateTotalDiffCount() > 0 && (
            <button 
              className="export-button"
              onClick={handleExportToExcel}
            >
              Rapor İndir
            </button>
          )}

          {calculateTotalDiffCount() > 0 && (
            <div className="all-pages-details">
              {result.pageResults.map((page, pageIndex) => {
                const pageDiffCount = page.differences.filter(diff => diff.added || diff.removed).length;
                
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
        </div>
      </div>
    </div>
  );
};

export default PdfCompareResult; 