import React, { useState, useMemo, useEffect } from 'react';
import FileUpload from '../components/FileUpload';
import { compareTextFiles, TextCompareResult as TextCompareResultType } from '../services/TextCompareService';
import '../style/PageStyles.css';
import { formatFileSize } from '../utils/formatters';
import { exportTextCompareResults } from '../utils/exportUtils';
import { calculateTextDiffCount } from '../utils/diffUtils';
import ComparisonLayout, { ComparisonResultLayout, ExportButton } from '../components/ComparisonResult';

const TextCompare: React.FC = () => {
  const [compareResult, setCompareResult] = useState<TextCompareResultType | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  const allowedTextTypes = ['.txt', '.md', '.json', '.xml', '.html', '.css', '.js', '.jsx', '.ts', '.tsx', '.yaml', '.yml', '.ini', '.conf', '.csv'];
  
  const handleCompare = async (file1: File, file2: File) => {
    try {
      setIsLoading(true);
      setError(null);
      
      console.log('Metin dosyaları karşılaştırılıyor:', file1.name, file2.name);
      
      const result = await compareTextFiles(file1, file2);
      setCompareResult(result);
    } catch (error) {
      console.error('Karşılaştırma hatası:', error);
      setError('Dosyalar karşılaştırılırken bir hata oluştu.');
    } finally {
      setIsLoading(false);
    }
  };

  // Metin karşılaştırma sonuçlarını gösteren bileşen
  const TextCompareResult: React.FC<{result: TextCompareResultType}> = ({ result }) => {
    const [componentIsLoading, setComponentIsLoading] = useState<boolean>(true);

    // Bileşen yüklendiğinde
    useEffect(() => {
      // Veri hazırlama işlemi için kısa bir gecikme ekleyelim
      const timer = setTimeout(() => {
        setComponentIsLoading(false);
      }, 500);
      
      return () => clearTimeout(timer);
    }, []);

    // Toplam fark sayısını hesapla
    const calculateTotalDiffCount = () => {
      return calculateTextDiffCount(result);
    };

    // Toplam satır sayılarını hesapla
    const { file1LineCount, file2LineCount } = useMemo(() => {
      let file1Lines = 0;
      let file2Lines = 0;

      result.differences.forEach(diff => {
        const lines = diff.value.split('\n');
        const actualLines = lines.length > 0 && lines[lines.length - 1] === '' ? lines.slice(0, -1) : lines;

        if (!diff.added) {
          // Dosya 1'e ait (normal veya silinen)
          file1Lines += actualLines.length;
        }
        
        if (!diff.removed) {
          // Dosya 2'ye ait (normal veya eklenen)
          file2Lines += actualLines.length;
        }
      });

      return { file1LineCount: file1Lines, file2LineCount: file2Lines };
    }, [result.differences]);

    // Excel'e aktarma işlevi
    const handleExportToExcel = () => {
      exportTextCompareResults(result.differences);
    };

    // Satır numaralarını tutmak için mutable sayaçlar
    let file1DisplayLineCounter = 1;
    let file2DisplayLineCounter = 1;

    return (
      <ComparisonLayout
        isLoading={componentIsLoading}
        loadingMessage="Dosyalar karşılaştırılıyor"
        noDifference={calculateTotalDiffCount() === 0}
        previewContent={
          <div className="text-files-previews">
            <div className="text-file text-file-1">
              <div className="text-file-header">
                <h3>{result.file1Name}</h3>
                <span>{formatFileSize(result.file1Size)}</span>
              </div>
              <div className="text-content">
                {result.differences.map((diff, index) => {
                  const lines = diff.value.split('\n');
                  // Son boş satırı atla (eğer varsa)
                  const actualLines = lines.length > 0 && lines[lines.length - 1] === '' ? lines.slice(0, -1) : lines;

                  // Eğer dosya 1'den kaldırılmamışsa veya common ise göster
                  if (!diff.added) {
                    return actualLines.map((line, lineIndex) => {
                      const currentLineNumber = file1DisplayLineCounter++;
                      return (
                        <div key={`file1-${index}-${lineIndex}`}
                          className={`line-wrapper ${diff.removed ? 'removed-line' : ''}`}
                        >
                          <span className="line-number">{currentLineNumber}</span>
                          {diff.removed && <span className="diff-prefix">-</span>}
                          <div className="line-content">{line}</div>
                        </div>
                      );
                    });
                  }
                  return null;
                })}
              </div>
            </div>
            
            <div className="text-file text-file-2">
              <div className="text-file-header">
                <h3>{result.file2Name}</h3>
                <span>{formatFileSize(result.file2Size)}</span>
              </div>
              <div className="text-content">
                {result.differences.map((diff, index) => {
                  const lines = diff.value.split('\n');
                  // Son boş satırı atla (eğer varsa)
                  const actualLines = lines.length > 0 && lines[lines.length - 1] === '' ? lines.slice(0, -1) : lines;

                  // Eğer dosya 2'ye eklenmemişse veya common ise göster
                  if (!diff.removed) {
                    return actualLines.map((line, lineIndex) => {
                      const currentLineNumber = file2DisplayLineCounter++;
                      return (
                        <div key={`file2-${index}-${lineIndex}`}
                          className={`line-wrapper ${diff.added ? 'added-line' : ''}`}
                        >
                          <span className="line-number">{currentLineNumber}</span>
                          {diff.added && <span className="diff-prefix">+</span>}
                          <div className="line-content">{line}</div>
                        </div>
                      );
                    });
                  }
                  return null;
                })}
              </div>
            </div>
          </div>
        }
        summaryContent={
          <ComparisonResultLayout
            title="Metin Karşılaştırma Sonucu"
            fileName1={result.file1Name}
            fileName2={result.file2Name}
            totalDiffCount={calculateTotalDiffCount()}
            structureDiffRows={[
              {
                label: 'Satır',
                value1: file1LineCount,
                value2: file2LineCount,
                diff: Math.abs(file2LineCount - file1LineCount),
                isDiffZero: file2LineCount - file1LineCount === 0
              },
              {
                label: 'Boyut',
                value1: formatFileSize(result.file1Size),
                value2: formatFileSize(result.file2Size),
                diff: formatFileSize(Math.abs(result.file2Size - result.file1Size)),
                isDiffZero: result.file2Size - result.file1Size === 0
              }
            ]}
            exportButton={calculateTotalDiffCount() > 0 ? <ExportButton onClick={handleExportToExcel} /> : undefined}
          />
        }
      />
    );
  };

  return (
    <div className="page-content">
      <h1>Metin Karşılaştırma</h1>
      <p className="page-description">
        Metin Karşılaştırma aracı ile iki metin dosyasının içeriğini kolayca karşılaştırın. 
        Yüklediğiniz belgelerdeki metin farklılıkları anında tespit edilir.
      </p>

      <FileUpload 
        onCompare={handleCompare} 
        pageType="text" 
        allowedFileTypes={allowedTextTypes}
      />
      {compareResult && !isLoading && !error && (
        <TextCompareResult result={compareResult} />
      )}
    </div>
  );
};

export default TextCompare;
