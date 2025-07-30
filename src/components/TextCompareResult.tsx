import React, { useMemo } from 'react';
import { TextCompareResult as TextCompareResultType } from '../services/TextCompareService';
import * as XLSX from 'xlsx';
import '../style/TextCompareResult.css';

interface TextCompareResultProps {
  result: TextCompareResultType;
}

const TextCompareResult: React.FC<TextCompareResultProps> = ({ result }) => {
  // Toplam fark sayısını hesapla
  const calculateTotalDiffCount = () => {
    return result.differences.filter(diff => diff.added || diff.removed).length;
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

  // Dosya boyutunu okunabilir formata dönüştür
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    else if (bytes < 1048576) return (bytes / 1024).toFixed(2) + ' KB';
    else if (bytes < 1073741824) return (bytes / 1048576).toFixed(2) + ' MB';
    else return (bytes / 1073741824).toFixed(2) + ' GB';
  };

  // Excel'e aktarma işlevi
  const handleExportToExcel = () => {
    const allRows: any[] = [];

    // Satır numaralarını yeniden hesapla (fonksiyon scope'u için)
    const file1ExportLineNumbers: number[] = [];
    const file2ExportLineNumbers: number[] = [];
    let currentFile1Line = 1;
    let currentFile2Line = 1;

    result.differences.forEach(diff => {
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

    result.differences
      .forEach(diff => {
        const lines = diff.value.split('\n');
        const actualLines = lines.length > 0 && lines[lines.length - 1] === '' ? lines.slice(0, -1) : lines;
        
        actualLines.forEach(line => {
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

    const ws = XLSX.utils.json_to_sheet(allRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Metin Farkları');
    XLSX.writeFile(wb, 'metin_fark_raporu.xlsx');
  };

  // Satır numaralarını tutmak için mutable sayaçlar
  let file1DisplayLineCounter = 1;
  let file2DisplayLineCounter = 1;

  const renderTextStructureDiffTable = () => {
    const rowDiff = file2LineCount - file1LineCount;
    const sizeDiff = result.file2Size - result.file1Size;

    return (
      <div className="structure-diff-table">
        <div className="structure-diff-header">
          <div className="structure-diff-cell header-cell"></div>
          <div className="structure-diff-cell header-cell">Dosya 1</div>
          <div className="structure-diff-cell header-cell">Dosya 2</div>
          <div className="structure-diff-cell header-cell">Fark</div>
        </div>
        <div className="structure-diff-row">
          <div className="structure-diff-cell header-cell">Satır</div>
          <div className="structure-diff-cell">{file1LineCount}</div>
          <div className="structure-diff-cell">{file2LineCount}</div>
          <div className={`structure-diff-cell ${rowDiff === 0 ? 'diff-none' : 'diff-high'}`}>
            {Math.abs(rowDiff)}
          </div>
        </div>
        <div className="structure-diff-row">
          <div className="structure-diff-cell header-cell">Boyut</div>
          <div className="structure-diff-cell">{formatFileSize(result.file1Size)}</div>
          <div className="structure-diff-cell">{formatFileSize(result.file2Size)}</div>
          <div className={`structure-diff-cell ${sizeDiff === 0 ? 'diff-none' : 'diff-high'}`}>
            {formatFileSize(Math.abs(sizeDiff))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="text-compare-result">
      <div className="result-container">
        <div className="text-files-container">
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
          
          <div className="comparison-results">
            <div className="result-header">
              <h2>Metin Karşılaştırma Sonucu</h2>
              <div className="summary-info">
                <div className="summary-item">
                  <span>Toplam Fark Sayısı:</span>
                  <span className={calculateTotalDiffCount() > 0 ? 'diff-high' : 'diff-none'}>
                    {calculateTotalDiffCount()}
                  </span>
                </div>
                {renderTextStructureDiffTable()}
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
          </div>
        </div>
      </div>
    </div>
  );
};

export default TextCompareResult; 