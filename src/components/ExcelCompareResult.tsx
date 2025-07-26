import React, { useState, useMemo, useEffect, useRef } from 'react';
import { ExcelCompareResult as ExcelCompareResultType, CellDiff } from '../types/ExcelTypes';
import * as XLSX from 'xlsx';
import '../style/ExcelCompareResult.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSort, faSortUp, faSortDown, faFilter, faTimes } from '@fortawesome/free-solid-svg-icons';

interface ExcelCompareResultProps {
  result: ExcelCompareResultType;
}

const ExcelCompareResult: React.FC<ExcelCompareResultProps> = ({ result }) => {
  const [activeSheetIndex, setActiveSheetIndex] = useState<number>(0);
  const [filters, setFilters] = useState<{ [key: string]: Set<any> }>({}); // Kolon index'ine göre seçili değerler
  const [sortConfig, setSortConfig] = useState<{ key: string | null; direction: 'ascending' | 'descending' | null }>({ key: null, direction: null });
  const [showFilterDropdown, setShowFilterDropdown] = useState<string | null>(null); // Hangi kolonun filtresi açık

  const filterDropdownRef = useRef<HTMLDivElement>(null); // Filtre dropdown'ı için referans

  // Filtre durumunu başlat veya güncelle
  useEffect(() => {
    if (showFilterDropdown && !filters[showFilterDropdown]) {
      // Eğer bir filtre dropdown açıldıysa ve o filtre için henüz bir seçim yapılmamışsa, tümünü seç
      const allValues = Array.from(new Set(result.sheetResults[activeSheetIndex].differences.map((diff: any) => diff[showFilterDropdown!])));
      setFilters(prev => ({ ...prev, [showFilterDropdown!]: new Set(allValues) }));
    }

    const handleClickOutside = (event: MouseEvent) => {
      // Eğer filtre dropdown açıksa ve tıklama dropdown içinde veya ikonu üzerinde değilse kapat
      const target = event.target as Node;
      if (filterDropdownRef.current && !filterDropdownRef.current.contains(target) &&
          !(target as Element).closest('.filter-icon')) { // filter-icon da tıklama alanı dışında sayılmaz
        setShowFilterDropdown(null);
      }
    };

    if (showFilterDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showFilterDropdown, activeSheetIndex, result.sheetResults]); // result.sheetResults bağımlılık olarak eklendi

  // Toplam fark sayısını hesapla
  const calculateTotalDiffCount = () => {
    return result.sheetResults.reduce((acc, sheet) => acc + sheet.differences.length, 0);
  };

  // Dosya boyutunu okunabilir formata dönüştür
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    else if (bytes < 1048576) return (bytes / 1024).toFixed(2) + ' KB';
    else if (bytes < 1073741824) return (bytes / 1048576).toFixed(2) + ' MB';
    else return (bytes / 1073741824).toFixed(2) + ' GB';
  };

  // Sütun indeksini Excel harfine dönüştür (1 -> A, 2 -> B, ...)
  const convertColumnIndexToLetter = (colIndex: number): string => {
    let letter = '';
    let tempColIndex = colIndex;
    while (tempColIndex > 0) {
      const remainder = (tempColIndex - 1) % 26;
      letter = String.fromCharCode(65 + remainder) + letter;
      tempColIndex = Math.floor((tempColIndex - 1) / 26);
    }
    return letter;
  };
  
  // Excel'e aktarma işlevi
  const handleExportToExcel = () => {
    const allRows: any[] = [];
    
    // Tüm sayfalardaki tüm farkları birleştir
    result.sheetResults.forEach(sheet => {
      sheet.differences.forEach(diff => {
        allRows.push({
          'Sayfa': sheet.sheetName,
          'Satır': diff.row,
          'Sütun': convertColumnIndexToLetter(diff.col), // Sütun numarasını harfe çevir
          'Dosya 1 Değeri': diff.value1 !== null ? String(diff.value1) : '(boş)',
          'Dosya 2 Değeri': diff.value2 !== null ? String(diff.value2) : '(boş)',
        });
      });
    });
    
    // Eksik sayfaları raporla
    result.missingSheets1.forEach(sheetName => {
      allRows.push({
        'Sayfa': sheetName,
        'Satır': '-',
        'Sütun': '-',
        'Dosya 1 Değeri': '(sayfa yok)',
        'Dosya 2 Değeri': 'Sayfa mevcut',
      });
    });
    
    result.missingSheets2.forEach(sheetName => {
      allRows.push({
        'Sayfa': sheetName,
        'Satır': '-',
        'Sütun': '-',
        'Dosya 1 Değeri': 'Sayfa mevcut',
        'Dosya 2 Değeri': '(sayfa yok)',
      });
    });

    // Excel dosyasını oluştur ve indir
    const ws = XLSX.utils.json_to_sheet(allRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Excel Farkları');
    XLSX.writeFile(wb, 'excel_fark_raporu.xlsx');
  };

  // Sayfa sekmesi için kod
  const renderSheetTabs = () => {
    if (result.sheetResults.length === 0) return null;
    
    return (
      <div className="sheet-tabs">
        {result.sheetResults.map((sheet, index) => (
          <button
            key={index}
            className={`sheet-tab ${activeSheetIndex === index ? 'active' : ''}`}
            onClick={() => {
              setActiveSheetIndex(index);
              setFilters({}); // Sayfa değişince filtreleri sıfırla
              setSortConfig({ key: null, direction: null }); // Sayfa değişince sıralamayı sıfırla
              setShowFilterDropdown(null);
            }}
          >
            {sheet.sheetName} 
            {sheet.differences.length > 0 && 
              <span className="diff-badge">{sheet.differences.length}</span>
            }
          </button>
        ))}
      </div>
    );
  };

  // Sıralama işlemini yönet
  const requestSort = (key: string) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    } else if (sortConfig.key === key && sortConfig.direction === 'descending') {
      direction = 'ascending'; // Üçüncü tıklamada sıralamayı kaldır
      setSortConfig({ key: null, direction: null });
      return;
    }
    setSortConfig({ key, direction });
  };

  // Filtre durumunu değiştir
  const handleFilterChange = (columnKey: string, value: any, isChecked: boolean) => {
    setFilters(prevFilters => {
      const newFilters = { ...prevFilters };
      if (!newFilters[columnKey]) {
        newFilters[columnKey] = new Set();
      }
      if (isChecked) {
        newFilters[columnKey].add(value);
      } else {
        newFilters[columnKey].delete(value);
      }
      return newFilters;
    });
  };

  // Filtre dropdown'ını göster/gizle
  const toggleFilterDropdown = (columnKey: string) => {
    setShowFilterDropdown(prev => (prev === columnKey ? null : columnKey));
  };

  // Gösterilecek farkları filtrele ve sırala
  const filteredAndSortedDifferences = useMemo(() => {
    if (result.sheetResults.length === 0) return [];

    let currentDifferences = [...result.sheetResults[activeSheetIndex].differences];

    // Filtreleme
    Object.keys(filters).forEach(columnKey => {
      const selectedValues = filters[columnKey];
      if (selectedValues.size > 0) {
        currentDifferences = currentDifferences.filter(diff => {
          let valueToCompare: any;
          switch (columnKey) {
            case 'row':
              valueToCompare = diff.row;
              break;
            case 'col':
              valueToCompare = diff.col;
              break;
            case 'value1':
              valueToCompare = diff.value1;
              break;
            case 'value2':
              valueToCompare = diff.value2;
              break;
            default:
              return true; // Bilinmeyen kolon anahtarı, filtreleme yok
          }
          return selectedValues.has(valueToCompare);
        });
      }
    });

    // Sıralama
    if (sortConfig.key) {
      currentDifferences.sort((a, b) => {
        const aValue = (a as any)[sortConfig.key!];
        const bValue = (b as any)[sortConfig.key!];

        if (aValue < bValue) {
          return sortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'ascending' ? 1 : -1;
        }
        return 0;
      });
    }

    return currentDifferences;
  }, [result.sheetResults, activeSheetIndex, filters, sortConfig]);

  // Aktif sayfanın farklarını göster
  const renderActiveDifferences = () => {
    if (result.sheetResults.length === 0) return <p>Karşılaştırılacak ortak sayfa bulunamadı.</p>;
    
    const activeSheet = result.sheetResults[activeSheetIndex];
    
    if (activeSheet.differences.length === 0) {
      return <p className="no-diff-message">Bu sayfada fark bulunamadı.</p>;
    }
    
    // Sütun başlıklarını ve bunlara karşılık gelen CellDiff anahtarlarını tanımla
    const columnHeaders = [
      { label: 'Sütun', key: 'col' },
      { label: 'Satır', key: 'row' },
      { label: 'Dosya 1 Değeri', key: 'value1' },
      { label: 'Dosya 2 Değeri', key: 'value2' },
    ];

    return (
      <div className="differences-table-wrapper">
        <table className="differences-table-header">
          <thead>
            <tr>
              {columnHeaders.map(col => (
                <th key={col.key}>
                  <div className="column-header-content">
                    <span onClick={() => requestSort(col.key)}>
                      {col.label}
                      {sortConfig.key === col.key && sortConfig.direction === 'ascending' && <FontAwesomeIcon icon={faSortUp} className="sort-icon" />}
                      {sortConfig.key === col.key && sortConfig.direction === 'descending' && <FontAwesomeIcon icon={faSortDown} className="sort-icon" />}
                      {sortConfig.key !== col.key && <FontAwesomeIcon icon={faSort} className="sort-icon default-sort" />}
                    </span>
                    <div className="filter-container">
                      <FontAwesomeIcon 
                        icon={faFilter} 
                        className={`filter-icon ${filters[col.key] && filters[col.key].size > 0 ? 'filter-active' : ''}`}
                        onClick={() => toggleFilterDropdown(col.key)}
                      />
                      {showFilterDropdown === col.key && (
                        <div className="filter-dropdown" ref={filterDropdownRef}> {/* Ref eklendi */}
                          <div className="filter-dropdown-header">
                            <button onClick={() => {
                              const allValues = Array.from(new Set(activeSheet.differences.map((diff: any) => diff[col.key])));
                              const currentSelected = filters[col.key] || new Set();
                              if (currentSelected.size === allValues.length) {
                                // Hepsi seçiliyse, tümünü temizle
                                setFilters(prev => ({ ...prev, [col.key]: new Set() }));
                              } else {
                                // Tamamı veya bir kısmı seçili değilse, tümünü seç
                                setFilters(prev => ({ ...prev, [col.key]: new Set(allValues) }));
                              }
                            }}>
                              {filters[col.key]?.size === Array.from(new Set(activeSheet.differences.map((diff: any) => diff[col.key]))).length ? 'Tümünü Kaldır' : 'Tümünü Seç'}
                            </button>
                            <FontAwesomeIcon icon={faTimes} className="close-filter-icon" onClick={() => setShowFilterDropdown(null)} />
                          </div>
                          <div className="filter-options">
                            {Array.from(new Set(activeSheet.differences.map((diff: any) => diff[col.key]))).map((value, idx) => (
                              <label key={idx}>
                                <input 
                                  type="checkbox" 
                                  checked={filters[col.key]?.has(value) || false}
                                  onChange={(e) => handleFilterChange(col.key, value, e.target.checked)}
                                />
                                {col.key === 'col' ? convertColumnIndexToLetter(value) : String(value === null ? '(boş)' : value)}
                              </label>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
        </table>
        <div className="differences-table-body-scroll">
          <table className="differences-table">
            <tbody>
              {filteredAndSortedDifferences.map((diff, index) => (
                <tr key={index}>
                  {columnHeaders.map(col => (
                    <td key={`${index}-${col.key}`}
                      className={
                        col.key === 'value1' ? 'diff-value diff-removed' :
                        col.key === 'value2' ? 'diff-value diff-added' :
                        ''
                      }
                    >
                      {col.key === 'col' && convertColumnIndexToLetter(diff.col)}
                      {col.key === 'row' && diff.row}
                      {col.key === 'value1' && (diff.value1 !== null ? String(diff.value1) : <span className="empty-value">(boş)</span>)}
                      {col.key === 'value2' && (diff.value2 !== null ? String(diff.value2) : <span className="empty-value">(boş)</span>)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // Sayfa, Satır, Sütun karşılaştırma özet tablosu
  const renderStructureDiffTable = () => {
    // Satır farkını hesapla
    const rowDiff = result.file2MaxRows - result.file1MaxRows;
    // Sütun farkını hesapla
    const colDiff = result.file2MaxCols - result.file1MaxCols;
    // Sayfa farkını hesapla
    const sheetDiff = result.sheetCount2 - result.sheetCount1;

    return (
      <div className="structure-diff-table">
        <div className="structure-diff-header">
          <div className="structure-diff-cell header-cell"></div>
          <div className="structure-diff-cell header-cell">Dosya 1</div>
          <div className="structure-diff-cell header-cell">Dosya 2</div>
          <div className="structure-diff-cell header-cell">Fark</div>
        </div>
        <div className="structure-diff-row">
          <div className="structure-diff-cell header-cell">Sayfa</div>
          <div className="structure-diff-cell">{result.sheetCount1}</div>
          <div className="structure-diff-cell">{result.sheetCount2}</div>
          <div className={`structure-diff-cell ${sheetDiff === 0 ? 'diff-zero' : 'diff-nonzero'}`}>
            {Math.abs(sheetDiff)}
          </div>
        </div>
        <div className="structure-diff-row">
          <div className="structure-diff-cell header-cell">Sütun</div>
          <div className="structure-diff-cell">{result.file1MaxCols}</div>
          <div className="structure-diff-cell">{result.file2MaxCols}</div>
          <div className={`structure-diff-cell ${colDiff === 0 ? 'diff-zero' : 'diff-nonzero'}`}>
            {Math.abs(colDiff)}
          </div>
        </div>
        <div className="structure-diff-row">
          <div className="structure-diff-cell header-cell">Satır</div>
          <div className="structure-diff-cell">{result.file1MaxRows}</div>
          <div className="structure-diff-cell">{result.file2MaxRows}</div>
          <div className={`structure-diff-cell ${rowDiff === 0 ? 'diff-zero' : 'diff-nonzero'}`}>
            {Math.abs(rowDiff)}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="excel-compare-result">
      <div className="excel-result-container">
        <div className="excel-compare-layout">
          <div className="excel-preview-section">
            {renderSheetTabs()}
            {renderActiveDifferences()}
          </div>
          <div className="excel-summary-section">
            <div className="excel-result-header">
              <h2>Excel Karşılaştırma Sonucu</h2>
              <div className="excel-summary-info">
                <div className="excel-summary-item">
                  <span>Toplam Fark Sayısı:</span>
                  <span className={calculateTotalDiffCount() > 0 ? 'excel-diff-high' : 'excel-diff-none'}>
                    {calculateTotalDiffCount()}
                  </span>
                </div>
                <div className="excel-summary-item">
                  <span>Boyut Farkı:</span>
                  <span>
                    {formatFileSize(Math.abs(result.file1Size - result.file2Size))}
                  </span>
                </div>
                <span>Yapısal Farklar</span>
                {renderStructureDiffTable()}
                {result.missingSheets1.length > 0 && (
                  <div className="excel-summary-item excel-diff-high">
                    <span>Dosya 1'de Eksik Sayfalar:</span>
                    <span>{result.missingSheets1.join(', ')}</span>
                  </div>
                )}
                {result.missingSheets2.length > 0 && (
                  <div className="excel-summary-item excel-diff-high">
                    <span>Dosya 2'de Eksik Sayfalar:</span>
                    <span>{result.missingSheets2.join(', ')}</span>
                  </div>
                )}
              </div>
            </div>

            {calculateTotalDiffCount() > 0 && (
              <button 
                className="excel-export-button"
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

export default ExcelCompareResult; 