import React, { useState, useEffect, useRef } from 'react';
import FileUpload from '../components/FileUpload';
import { PdfCompareService } from '../services/PdfCompareService';
import { PdfCompareResult as PdfCompareResultType, CompareMode, VisualCompareResult } from '../types/PdfTypes';
import { savePdfFile, clearPdfStore } from '../services/IndexedDBService';
import * as pdfjsLib from 'pdfjs-dist';
import jsPDF from 'jspdf';
import { formatFileSize } from '../utils/formatters';
import { exportPdfCompareResults } from '../utils/exportUtils';
import { calculatePdfDiffCount, calculatePageDiffCount } from '../utils/diffUtils';
import ComparisonLayout, { ComparisonResultLayout, ExportButton } from '../components/ComparisonResult';
import CosmicSpinner from '../components/CosmicSpinner';
import { useComparisonLoading } from '../hooks/useLoadingState';
import { useTranslation } from 'react-i18next';
import { ALLOWED_FILE_TYPES } from '../constants/fileTypes';
import { saveBinaryFilesParallel, generateFileKey } from '../utils/fileUtils';
import { createDiffOverlay } from '../utils/canvasUtils';

pdfjsLib.GlobalWorkerOptions.workerSrc = window.location.origin + '/js/pdf.worker.js';

interface PdfCompareResultProps {
  result: PdfCompareResultType & {
    timestamp?: number;
    pdf1Key?: string;
    pdf2Key?: string;
  };
}

interface RenderedPageSet {
  canvas1: HTMLCanvasElement | null;
  canvas2: HTMLCanvasElement | null;
  overlay: HTMLCanvasElement | null;
  withDiff1: HTMLCanvasElement | null;
  withDiff2: HTMLCanvasElement | null;
  visual: VisualCompareResult | null;
}

const attachCanvas = (el: HTMLDivElement | null, canvas: HTMLCanvasElement | null) => {
  if (!el) return;
  el.replaceChildren();
  if (canvas) {
    el.appendChild(canvas);
  }
};

const PdfCompareResult: React.FC<PdfCompareResultProps> = ({ result }) => {
  const { t } = useTranslation();
  const [pdf1Doc, setPdf1Doc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [pdf2Doc, setPdf2Doc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [renderedPage, setRenderedPage] = useState<RenderedPageSet | null>(null);
  const [compareMode, setCompareMode] = useState<CompareMode>(CompareMode.TEXT);
  const [visualResults, setVisualResults] = useState<VisualCompareResult[]>([]);
  const [isDocsLoading, setIsDocsLoading] = useState(true);
  const [isPageRendering, setIsPageRendering] = useState(false);
  const [isVisualScanning, setIsVisualScanning] = useState(false);
  const [visualScanProgress, setVisualScanProgress] = useState({ current: 0, total: 0 });
  const [loadError, setLoadError] = useState<string | null>(null);

  const pdf1ContainerRef = useRef<HTMLDivElement>(null);
  const pdf2ContainerRef = useRef<HTMLDivElement>(null);
  const overlayContainerRef = useRef<HTMLDivElement>(null);
  const comparisonResultsRef = useRef<HTMLDivElement>(null);
  const visualScanStartedRef = useRef(false);
  const visualScanCancelRef = useRef(false);

  const maxPages = Math.max(result.pageCount1, result.pageCount2, 1);

  const calculateTotalDiffCount = () => {
    return calculatePdfDiffCount(result.pageResults);
  };

  useEffect(() => {
    let isCancelled = false;

    const loadDocuments = async () => {
      setIsDocsLoading(true);
      setLoadError(null);

      try {
        const pdf1Key = result.pdf1Key || `pdf1_${result.timestamp}`;
        const pdf2Key = result.pdf2Key || `pdf2_${result.timestamp}`;
        const [doc1, doc2] = await Promise.all([
          PdfCompareService.loadPdfDocument(pdf1Key),
          PdfCompareService.loadPdfDocument(pdf2Key)
        ]);

        if (isCancelled) return;
        setPdf1Doc(doc1);
        setPdf2Doc(doc2);
      } catch (error) {
        if (!isCancelled) {
          console.error('PDF belgesi yüklenirken hata:', error);
          setLoadError(t('pdf.error.loadError'));
        }
      } finally {
        if (!isCancelled) {
          setIsDocsLoading(false);
        }
      }
    };

    loadDocuments();

    return () => {
      isCancelled = true;
    };
  }, [result.timestamp, result.pdf1Key, result.pdf2Key, t]);

  useEffect(() => {
    if (!pdf1Doc || !pdf2Doc) return;

    let isCancelled = false;

    const renderCurrentPage = async () => {
      setIsPageRendering(true);

      try {
        const [canvas1, canvas2] = await Promise.all([
          PdfCompareService.renderPage(pdf1Doc, currentPage),
          PdfCompareService.renderPage(pdf2Doc, currentPage)
        ]);

        if (isCancelled) return;

        const visual = PdfCompareService.buildVisualResultFromCanvases(canvas1, canvas2, currentPage);

        const overlay = visual.overlayCanvas || null;
        const withDiff1 = canvas1
          ? createDiffOverlay(canvas1, overlay || canvas1, Boolean(visual.hasVisualDifferences && overlay))
          : null;
        const withDiff2 = canvas2
          ? createDiffOverlay(canvas2, overlay || canvas2, Boolean(visual.hasVisualDifferences && overlay))
          : null;

        setRenderedPage({
          canvas1,
          canvas2,
          overlay,
          withDiff1,
          withDiff2,
          visual
        });
      } catch (error) {
        if (!isCancelled) {
          console.error('PDF sayfa render hatası:', error);
        }
      } finally {
        if (!isCancelled) {
          setIsPageRendering(false);
        }
      }
    };

    renderCurrentPage();

    return () => {
      isCancelled = true;
    };
  }, [pdf1Doc, pdf2Doc, currentPage]);

  useEffect(() => {
    return () => {
      visualScanCancelRef.current = true;
    };
  }, []);

  useEffect(() => {
    if (compareMode !== CompareMode.VISUAL || !pdf1Doc || !pdf2Doc || visualScanStartedRef.current) {
      return;
    }

    visualScanStartedRef.current = true;
    setIsVisualScanning(true);

    PdfCompareService.scanVisualDifferences(pdf1Doc, pdf2Doc, {
      shouldCancel: () => visualScanCancelRef.current,
      onProgress: (current, total) => {
        if (!visualScanCancelRef.current) {
          setVisualScanProgress({ current, total });
        }
      }
    })
      .then(results => {
        if (!visualScanCancelRef.current) {
          setVisualResults(results);
        }
      })
      .catch(error => {
        console.error('Görsel tarama hatası:', error);
        visualScanStartedRef.current = false;
      })
      .finally(() => {
        if (!visualScanCancelRef.current) {
          setIsVisualScanning(false);
        }
      });
  }, [compareMode, pdf1Doc, pdf2Doc]);

  useEffect(() => {
    if (!isDocsLoading && comparisonResultsRef.current) {
      comparisonResultsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [isDocsLoading]);

  useEffect(() => {
    if (compareMode !== CompareMode.TEXT) {
      return;
    }

    let isScrolling = false;

    const syncScroll = (e: Event) => {
      if (isScrolling) return;

      if (pdf1ContainerRef.current && pdf2ContainerRef.current) {
        const target = e.currentTarget as HTMLDivElement;
        isScrolling = true;

        if (target === pdf1ContainerRef.current) {
          pdf2ContainerRef.current.scrollTop = target.scrollTop;
        } else if (target === pdf2ContainerRef.current) {
          pdf1ContainerRef.current.scrollTop = target.scrollTop;
        }

        setTimeout(() => {
          isScrolling = false;
        }, 10);
      }
    };

    const pdf1Container = pdf1ContainerRef.current;
    const pdf2Container = pdf2ContainerRef.current;

    if (pdf1Container) {
      pdf1Container.addEventListener('scroll', syncScroll);
    }

    if (pdf2Container) {
      pdf2Container.addEventListener('scroll', syncScroll);
    }

    return () => {
      if (pdf1Container) {
        pdf1Container.removeEventListener('scroll', syncScroll);
      }

      if (pdf2Container) {
        pdf2Container.removeEventListener('scroll', syncScroll);
      }
    };
  }, [renderedPage, compareMode]);

  const goToPage = (pageNumber: number) => {
    const nextPage = Math.min(Math.max(pageNumber, 1), maxPages);
    setCurrentPage(nextPage);
  };

  const handlePageDetailsClick = (pageNumber: number) => {
    if (compareMode !== CompareMode.TEXT) return;
    goToPage(pageNumber);
  };

  const handleVisualPageClick = (pageNumber: number) => {
    if (compareMode !== CompareMode.VISUAL) return;
    goToPage(pageNumber);
  };

  const handleModeChange = (mode: CompareMode) => {
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
  };

  const handleExportToExcel = async () => {
    await exportPdfCompareResults(result.pageResults);
  };

  const handleExportVisualToPdf = async () => {
    if (!pdf1Doc || !pdf2Doc) return;

    try {
      const pagesToExport = visualResults.filter(visualResult => visualResult.hasVisualDifferences);
      if (pagesToExport.length === 0) return;

      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      for (let i = 0; i < pagesToExport.length; i++) {
        const visualResult = pagesToExport[i];
        const pageCompare = await PdfCompareService.comparePageVisually(
          pdf1Doc,
          pdf2Doc,
          visualResult.pageNumber,
          true
        );
        const canvas = pageCompare.overlayCanvas;
        if (!canvas) continue;

        if (i > 0) {
          pdf.addPage();
        }

        const imgData = canvas.toDataURL('image/jpeg', 0.8);
        const imgWidth = pageWidth - 20;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        const maxHeight = pageHeight - 30;
        const finalHeight = Math.min(imgHeight, maxHeight);
        const finalWidth = (canvas.width * finalHeight) / canvas.height;
        const x = (pageWidth - finalWidth) / 2;

        pdf.addImage(imgData, 'JPEG', x, 15, finalWidth, finalHeight);
        pdf.setFontSize(10);
        pdf.text(
          `Sayfa ${visualResult.pageNumber} - Farklılık: %${visualResult.differencePercentage.toFixed(2)}`,
          10,
          pageHeight - 10
        );
      }

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
      visualResults.filter(vr => vr.hasVisualDifferences).length === 0 &&
      !isVisualScanning);

  const renderPageNavigation = () => (
    <div className="pdf-page-nav">
      <button type="button" disabled={currentPage <= 1} onClick={() => goToPage(currentPage - 1)}>
        {t('common.previous')}
      </button>
      <span>{t('pdf.pageOf', { current: currentPage, total: maxPages })}</span>
      <button type="button" disabled={currentPage >= maxPages} onClick={() => goToPage(currentPage + 1)}>
        {t('common.next')}
      </button>
    </div>
  );

  const previewContent = (
    <div className="pdf-previews">
      {compareMode === CompareMode.TEXT ? (
        <>
          <div className="pdf-preview-container">
            <div className="pdf-preview-header">
              <h3>{result.file1Name}</h3>
              <span>{result.pageCount1} sayfa</span>
            </div>
            {renderPageNavigation()}
            <div className="pdf-preview-pages" ref={pdf1ContainerRef}>
              {isPageRendering ? (
                <div className="pdf-preview-page-loading">{t('pdf.renderingPage')}</div>
              ) : (
                <div>
                  <div className="pdf-page-number">Sayfa {currentPage}</div>
                  <div
                    className="pdf-canvas-container"
                    ref={el => attachCanvas(el, renderedPage?.withDiff1 || renderedPage?.canvas1 || null)}
                  />
                </div>
              )}
            </div>
          </div>

          <div className="pdf-preview-container">
            <div className="pdf-preview-header">
              <h3>{result.file2Name}</h3>
              <span>{result.pageCount2} sayfa</span>
            </div>
            {renderPageNavigation()}
            <div className="pdf-preview-pages" ref={pdf2ContainerRef}>
              {isPageRendering ? (
                <div className="pdf-preview-page-loading">{t('pdf.renderingPage')}</div>
              ) : (
                <div>
                  <div className="pdf-page-number">Sayfa {currentPage}</div>
                  <div
                    className="pdf-canvas-container"
                    ref={el => attachCanvas(el, renderedPage?.withDiff2 || renderedPage?.canvas2 || null)}
                  />
                </div>
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
          {renderPageNavigation()}
          <div className="pdf-preview-pages" ref={overlayContainerRef}>
            {isPageRendering ? (
              <div className="pdf-preview-page-loading">{t('pdf.renderingPage')}</div>
            ) : (
              <div>
                <div className="pdf-page-number">Sayfa {currentPage}</div>
                <div
                  className="pdf-canvas-container"
                  ref={el => attachCanvas(el, renderedPage?.overlay || renderedPage?.canvas1 || renderedPage?.canvas2 || null)}
                />
              </div>
            )}
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

            if (pageDiffCount === 0) return null;

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

      {compareMode === CompareMode.VISUAL && (
        <div className="visual-results">
          {isVisualScanning && (
            <p>
              {t('pdf.visualScanning', {
                current: visualScanProgress.current,
                total: visualScanProgress.total || maxPages
              })}
            </p>
          )}
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

  if (isDocsLoading) {
    return <CosmicSpinner fullscreen size="xl" message={t('pdf.comparing')} />;
  }

  if (loadError) {
    return <p className="pdf-compare-error">{loadError}</p>;
  }

  return (
    <ComparisonLayout
      noDifference={noDifference}
      isLoading={false}
      previewContent={previewContent}
      summaryContent={summaryContent}
    />
  );
};

const PdfCompare: React.FC = () => {
  const { t } = useTranslation();
  const allowedPdfTypes = [...ALLOWED_FILE_TYPES.PDF] as string[];
  const [compareResult, setCompareResult] = useState<PdfCompareResultType | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { startComparison, finishComparison, createLoadingResult } = useComparisonLoading();

  useEffect(() => {
    clearPdfStore().catch(err => console.error('PDF deposu temizlenirken hata:', err));
  }, []);

  const handleCompare = async (file1: File, file2: File) => {
    try {
      setError(null);
      startComparison(file1, file2);
      setCompareResult(createLoadingResult(file1, file2, {
        pageCount1: 0,
        pageCount2: 0,
        pageCountDiffers: false,
        pageResults: [],
        overallDiffPercentage: 0
      }));

      const timestamp = Date.now();
      await clearPdfStore();

      const pdf1Key = generateFileKey('pdf1', timestamp);
      const pdf2Key = generateFileKey('pdf2', timestamp);

      await saveBinaryFilesParallel(
        [
          { file: file1, key: pdf1Key, metadata: { timestamp } },
          { file: file2, key: pdf2Key, metadata: { timestamp } }
        ],
        savePdfFile
      );

      const result = await PdfCompareService.comparePdfFilesFromDB(pdf1Key, pdf2Key);
      if (!result) {
        throw new Error('PDF karşılaştırılırken hata oluştu');
      }
      setCompareResult(finishComparison({
        ...result,
        timestamp,
        pdf1Key,
        pdf2Key,
        file1Size: file1.size,
        file2Size: file2.size
      }));
    } catch (compareError) {
      console.error('PDF karşılaştırma hatası:', compareError);
      const message = compareError instanceof Error ? compareError.message : '';
      const isQuotaError = /quota|memory|allocation|maximum/i.test(message);
      setError(isQuotaError ? t('pdf.error.tooLarge') : t('pdf.error.compareError'));
      setCompareResult(null);
    }
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

      {error && <p className="pdf-compare-error">{error}</p>}

      {compareResult && !error && (
        (compareResult as PdfCompareResultType).isLoading ? (
          <CosmicSpinner fullscreen size="xl" message={t('pdf.comparing')} />
        ) : (
          <PdfCompareResult result={compareResult} />
        )
      )}
    </div>
  );
};

export default PdfCompare;
