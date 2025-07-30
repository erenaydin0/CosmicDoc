import React, { useState, useMemo, useEffect, useRef } from 'react';
import { ExcelCompareResult as ExcelCompareResultType } from '../types/ExcelTypes';
import * as XLSX from 'xlsx';
import '../style/ExcelCompareResult.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSort, faSortUp, faSortDown, faFilter, faTimes, faChevronLeft, faChevronRight } from '@fortawesome/free-solid-svg-icons';

interface ExcelCompareResultProps {
  result: ExcelCompareResultType;
}

const ExcelCompareResult: React.FC<ExcelCompareResultProps> = ({ result }) => {
  const [activeSheetIndex, setActiveSheetIndex] = useState<number>(0);
  const [filters, setFilters] = useState<{ [key: string]: Set<any> }>({}); // Kolon index'ine göre seçili değerler
  const [sortConfig, setSortConfig] = useState<{ key: string | null; direction: 'ascending' | 'descending' | null }>({ key: null, direction: null });
  const [showFilterDropdown, setShowFilterDropdown] = useState<string | null>(null); // Hangi kolonun filtresi açık
  const [filterSearchTerms, setFilterSearchTerms] = useState<{ [key: string]: string }>({}); // Her filtre için arama terimi
  const [cachedFilterValues, setCachedFilterValues] = useState<{ [key: string]: any[] }>({}); // Önbelleğe alınmış filtre değerleri
  
  // Pagination state'leri
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(100); // Sayfa başına gösterilecek satır sayısı

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

  // Aktif sayfa değiştiğinde filtre değerlerini önbelleğe al
  useEffect(() => {
    if (result.sheetResults.length > 0) {
      const activeSheet = result.sheetResults[activeSheetIndex];
      const newCachedValues: { [key: string]: any[] } = {};
      
      const columnKeys = ['row', 'col', 'value1', 'value2'];
      
      columnKeys.forEach(columnKey => {
        const uniqueValues = Array.from(new Set(activeSheet.differences.map((diff: any) => diff[columnKey])));
        newCachedValues[columnKey] = uniqueValues.sort((a, b) => {
          // Null değerleri sona koy
          if (a === null && b !== null) return 1;
          if (a !== null && b === null) return -1;
          if (a === null && b === null) return 0;
          
          // Sayısal değerleri sayısal olarak sırala
          if (typeof a === 'number' && typeof b === 'number') {
            return a - b;
          }
          
          // String olarak sırala
          return String(a).localeCompare(String(b));
        });
      });
      
      setCachedFilterValues(newCachedValues);
    }
  }, [result.sheetResults, activeSheetIndex]);

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
              setCurrentPage(1); // Sayfa değişince pagination'ı sıfırla
              setFilterSearchTerms({}); // Sayfa değişince arama terimlerini sıfırla
              setCachedFilterValues({}); // Cache'i temizle, yeni sayfa için yeniden hesaplanacak
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

  // Filtre arama terimini güncelle
  const updateFilterSearchTerm = (columnKey: string, searchTerm: string) => {
    setFilterSearchTerms(prev => ({
      ...prev,
      [columnKey]: searchTerm
    }));
    
    // Arama terimi varsa, filters'a da ekle (boş bir Set ile)
    if (searchTerm.trim()) {
      setFilters(prev => ({
        ...prev,
        [columnKey]: prev[columnKey] || new Set()
      }));
    }
  };

  // Filtre için gerekli değerleri cache'den al
  const getFilterValues = (columnKey: string) => {
    return cachedFilterValues[columnKey] || [];
  };

  // Filtrelenmiş değerleri hesapla (arama terimi ile)
  const getFilteredValues = (columnKey: string) => {
    const allValues = getFilterValues(columnKey);
    const searchTerm = filterSearchTerms[columnKey]?.toLowerCase() || '';
    
    if (!searchTerm) return allValues;
    
    return allValues.filter(value => {
      const displayValue = columnKey === 'col' 
        ? convertColumnIndexToLetter(value) 
        : String(value === null ? '(boş)' : value);
      return displayValue.toLowerCase().includes(searchTerm);
    });
  };

  // Gösterilecek farkları filtrele ve sırala (Pagination ile)
  const filteredAndSortedDifferences = useMemo(() => {
    if (result.sheetResults.length === 0) return [];

    let currentDifferences = [...result.sheetResults[activeSheetIndex].differences];

    // Filtreleme (hem seçili değerler hem de arama terimleri)
    Object.keys(filters).forEach(columnKey => {
      const selectedValues = filters[columnKey];
      const searchTerm = filterSearchTerms[columnKey]?.toLowerCase() || '';
      
      if (selectedValues.size > 0 || searchTerm) {
        currentDifferences = currentDifferences.filter(diff => {
          let valueToCompare: any;
          let displayValue: string;
          
          switch (columnKey) {
            case 'row':
              valueToCompare = diff.row;
              displayValue = String(valueToCompare);
              break;
            case 'col':
              valueToCompare = diff.col;
              displayValue = convertColumnIndexToLetter(valueToCompare);
              break;
            case 'value1':
              valueToCompare = diff.value1;
              displayValue = String(valueToCompare === null ? '(boş)' : valueToCompare);
              break;
            case 'value2':
              valueToCompare = diff.value2;
              displayValue = String(valueToCompare === null ? '(boş)' : valueToCompare);
              break;
            default:
              return true; // Bilinmeyen kolon anahtarı, filtreleme yok
          }
          
          // Arama terimi kontrolü
          const matchesSearch = !searchTerm || displayValue.toLowerCase().includes(searchTerm);
          
          // Seçili değerler kontrolü (eğer hiç seçili değer yoksa veya arama terimi varsa, tüm değerleri kabul et)
          const matchesSelection = selectedValues.size === 0 || selectedValues.has(valueToCompare);
          
          return matchesSearch && matchesSelection;
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
  }, [result.sheetResults, activeSheetIndex, filters, sortConfig, filterSearchTerms]);

  // Pagination hesaplamaları
  const totalItems = filteredAndSortedDifferences.length;
  const totalPages = Math.ceil(totalItems / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);
  const currentPageData = filteredAndSortedDifferences.slice(startIndex, endIndex);

  // Sayfa numarası değiştiğinde
  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  // Sayfa boyutu değiştiğinde
  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize);
    setCurrentPage(1); // İlk sayfaya dön
  };

  // Pagination kontrollerini render et
  const renderPaginationControls = () => {
    if (totalItems === 0) return null;

    const maxVisiblePages = 5;
    const startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    const endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    return (
      <div className="pagination-controls">
        <div className="pagination-info">
          <span>
            {startIndex + 1}-{endIndex} / {totalItems} sonuç gösteriliyor
          </span>
          <select 
            value={pageSize} 
            onChange={(e) => handlePageSizeChange(Number(e.target.value))}
            className="page-size-selector"
          >
            <option value={50}>50</option>
            <option value={100}>100</option>
            <option value={250}>250</option>
            <option value={500}>500</option>
          </select>
          <span>satır/sayfa</span>
        </div>
        
        <div className="pagination-buttons">
          <button 
            onClick={() => handlePageChange(1)} 
            disabled={currentPage === 1}
            className="pagination-button"
          >
            <FontAwesomeIcon icon={faChevronLeft} />
            <FontAwesomeIcon icon={faChevronLeft} />
          </button>
          <button 
            onClick={() => handlePageChange(currentPage - 1)} 
            disabled={currentPage === 1}
            className="pagination-button"
          >
            <FontAwesomeIcon icon={faChevronLeft} />
          </button>
          
          {Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage + i).map(pageNum => (
            <button
              key={pageNum}
              onClick={() => handlePageChange(pageNum)}
              className={`pagination-button ${currentPage === pageNum ? 'active' : ''}`}
            >
              {pageNum}
            </button>
          ))}
          
          <button 
            onClick={() => handlePageChange(currentPage + 1)} 
            disabled={currentPage === totalPages}
            className="pagination-button"
          >
            <FontAwesomeIcon icon={faChevronRight} />
          </button>
          <button 
            onClick={() => handlePageChange(totalPages)} 
            disabled={currentPage === totalPages}
            className="pagination-button"
          >
            <FontAwesomeIcon icon={faChevronRight} />
            <FontAwesomeIcon icon={faChevronRight} />
          </button>
        </div>
      </div>
    );
  };

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
                        <div className="filter-dropdown" ref={filterDropdownRef}>
                          <div className="filter-dropdown-header">
                            <input
                              type="text"
                              placeholder="Ara..."
                              value={filterSearchTerms[col.key] || ''}
                              onChange={(e) => updateFilterSearchTerm(col.key, e.target.value)}
                              className="filter-search-input"
                              onClick={(e) => e.stopPropagation()}
                            />
                            <FontAwesomeIcon icon={faTimes} className="close-filter-icon" onClick={() => setShowFilterDropdown(null)} />
                          </div>
                          <div className="filter-actions">
                            <button onClick={() => {
                              const allValues = getFilterValues(col.key);
                              const searchTerm = filterSearchTerms[col.key]?.toLowerCase() || '';
                              const filteredValues = searchTerm 
                                ? allValues.filter(value => {
                                    const displayValue = col.key === 'col' ? convertColumnIndexToLetter(value) : String(value === null ? '(boş)' : value);
                                    return displayValue.toLowerCase().includes(searchTerm);
                                  })
                                : allValues;
                              const currentSelected = filters[col.key] || new Set();
                              const selectedFilteredCount = filteredValues.filter(value => currentSelected.has(value)).length;
                              
                              if (selectedFilteredCount === filteredValues.length) {
                                // Filtrelenmiş seçeneklerin hepsi seçiliyse, tümünü temizle
                                const newFilters = new Set(currentSelected);
                                filteredValues.forEach(value => newFilters.delete(value));
                                setFilters(prev => ({ ...prev, [col.key]: newFilters }));
                              } else {
                                // Filtrelenmiş seçeneklerin tamamı veya bir kısmı seçili değilse, tümünü seç
                                const newFilters = new Set(currentSelected);
                                filteredValues.forEach(value => newFilters.add(value));
                                setFilters(prev => ({ ...prev, [col.key]: newFilters }));
                              }
                            }}>
                              {(() => {
                                const filteredValues = getFilteredValues(col.key);
                                const currentSelected = filters[col.key] || new Set();
                                const selectedFilteredCount = filteredValues.filter(value => currentSelected.has(value)).length;
                                return selectedFilteredCount === filteredValues.length ? 'Tümünü Kaldır' : 'Tümünü Seç';
                              })()}
                            </button>
                          </div>
                          <div className="filter-options">
                            {cachedFilterValues[col.key] ? (
                              getFilteredValues(col.key).map((value, idx) => (
                                <label key={idx}>
                                  <input 
                                    type="checkbox" 
                                    checked={filters[col.key]?.has(value) || false}
                                    onChange={(e) => handleFilterChange(col.key, value, e.target.checked)}
                                  />
                                  {col.key === 'col' ? convertColumnIndexToLetter(value) : String(value === null ? '(boş)' : value)}
                                </label>
                              ))
                            ) : (
                              <div className="filter-loading">
                                <div className="filter-spinner"></div>
                                <span>Yükleniyor...</span>
                              </div>
                            )}
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
              {currentPageData.map((diff, index) => (
                <tr key={startIndex + index}>
                  {columnHeaders.map(col => (
                    <td key={`${startIndex + index}-${col.key}`}
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
        {renderPaginationControls()}
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
        <div className="structure-diff-row">
          <div className="structure-diff-cell header-cell">Boyut</div>
          <div className="structure-diff-cell">{formatFileSize(result.file1Size)}</div>
          <div className="structure-diff-cell">{formatFileSize(result.file2Size)}</div>
          <div className={`structure-diff-cell ${Math.abs(result.file1Size - result.file2Size) === 0 ? 'diff-zero' : 'diff-nonzero'}`}>
            {formatFileSize(Math.abs(result.file1Size - result.file2Size))}
          </div>
        </div>
      </div>
    );
  };

  // Performans uyarısını render et
  const renderPerformanceWarning = () => {
    // Uyarı kaldırıldı
    return null;
  };

  return (
    <div className="excel-compare-result">
      <div className="excel-result-container">
        <div className="excel-compare-layout">
          <div className="excel-preview-section">
            {renderPerformanceWarning()}
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