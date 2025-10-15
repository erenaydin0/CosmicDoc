import React, { useState, useMemo, useEffect, useRef } from 'react';
import FileUpload from '../components/FileUpload';
import { ExcelCompareService } from '../services/ExcelCompareService';
import { ExcelCompareResult as ExcelCompareResultType } from '../types/ExcelTypes';
import { saveExcelFile } from '../services/IndexedDBService';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSort, faSortUp, faSortDown, faFilter, faTimes } from '@fortawesome/free-solid-svg-icons';
import { formatFileSize } from '../utils/formatters';
import { exportExcelCompareResults } from '../utils/exportUtils';
import { calculateExcelDiffCount } from '../utils/diffUtils';
import ComparisonLayout, { ComparisonResultLayout, ExportButton } from '../components/ComparisonResult';
import CosmicSpinner from '../components/CosmicSpinner';
import { useComparisonLoading } from '../hooks/useLoadingState';
import { useTranslation } from 'react-i18next';
import { ALLOWED_FILE_TYPES } from '../constants/fileTypes';
import { convertColumnIndexToLetter } from '../utils/columnUtils';
import { saveFilesParallel } from '../utils/fileUtils';
import { usePagination } from '../hooks/usePagination';
import { PaginationControls } from '../components/PaginationControls';

const ExcelCompare: React.FC = () => {
  const { t } = useTranslation();
  const allowedExcelTypes = [...ALLOWED_FILE_TYPES.EXCEL] as string[];
  const [compareResult, setCompareResult] = useState<ExcelCompareResultType | null>(null);
  const [matchColumns, setMatchColumns] = useState<boolean>(false);
  const [showHeaders, setShowHeaders] = useState<boolean>(true);
  const { startComparison, finishComparison, createLoadingResult } = useComparisonLoading();

  
  const handleCompare = async (file1: File, file2: File) => {
    try {
      setCompareResult(null);
      startComparison(file1, file2);
      
      console.log('Excel dosyaları karşılaştırılıyor:', file1.name, file2.name);
      
      // Yükleme durumunu göster
      setCompareResult(createLoadingResult(file1, file2, {
        sheetCount1: 0,
        sheetCount2: 0,
        sheetCountDiffers: false,
        sheetResults: [],
        overallDiffPercentage: 0,
        missingSheets1: [],
        missingSheets2: [],
        file1MaxRows: 0,
        file2MaxRows: 0,
        file1MaxCols: 0,
        file2MaxCols: 0
      }));
      
      // Excel dosyalarını paralel olarak IndexedDB'ye kaydet
      await saveFilesParallel(
        [
          { file: file1, key: 'excel1DataUrl' },
          { file: file2, key: 'excel2DataUrl' }
        ],
        saveExcelFile
      );
      
      // Excel dosyalarını karşılaştır
      const result = await ExcelCompareService.compareExcelFiles(file1, file2, matchColumns, true);
      console.log('Karşılaştırma sonucu:', result);
      
      // Sonuçları ayarla
      setCompareResult(finishComparison(result));
    } catch (err) {
      console.error('Excel karşılaştırma hatası:', err);
      setCompareResult(null);
    }
  };

  // Excel karşılaştırma sonuçlarını gösteren bileşen
  const ExcelCompareResult: React.FC<{result: ExcelCompareResultType}> = ({ result }) => {
    const [activeSheetIndex, setActiveSheetIndex] = useState<number>(0);
    const [filters, setFilters] = useState<{ [key: string]: Set<any> }>({}); // Kolon index'ine göre seçili değerler
    const [sortConfig, setSortConfig] = useState<{ key: string | null; direction: 'ascending' | 'descending' | null }>({ key: null, direction: null });
    const [showFilterDropdown, setShowFilterDropdown] = useState<string | null>(null); // Hangi kolonun filtresi açık
    const [filterSearchTerms, setFilterSearchTerms] = useState<{ [key: string]: string }>({}); // Her filtre için arama terimi
    
    // Eğer result yükleme durumundaysa cosmic spinner göster
    if ((result as any).isLoading) {
      return <CosmicSpinner fullscreen size="xl" message="Excel dosyaları karşılaştırılıyor..." />;
    }
  
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
  
    // Bileşen yüklendiğinde
    useEffect(() => {
      // Veri hazırlama işlemi için kısa bir gecikme ekleyelim
      const timer = setTimeout(() => {
        // Component loading tamamlandı
      }, 500);
      
      return () => clearTimeout(timer);
    }, []);
  
  
    // Toplam fark sayısını hesapla
    const calculateTotalDiffCount = () => {
      return calculateExcelDiffCount(result);
    };
    
    // Excel'e aktarma işlevi
    const handleExportToExcel = async () => {
      await exportExcelCompareResults(
        result.sheetResults,
        result.missingSheets1,
        result.missingSheets2,
        convertColumnIndexToLetter
      );
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
                pagination.resetPagination(); // Sayfa değişince pagination'ı sıfırla
                setFilterSearchTerms({}); // Sayfa değişince arama terimlerini sıfırla
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
  
    // Filtre durumunu değiştir - Akıllı filtreleme ile
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
        
        // Eğer bu filtrede hiç seçili değer kalmadıysa, diğer filtrelerdeki geçersiz seçimleri temizle
        if (newFilters[columnKey].size === 0) {
          // Diğer kolonlardaki filtreleri kontrol et ve geçersiz olanları temizle
          Object.keys(newFilters).forEach(otherColumnKey => {
            if (otherColumnKey === columnKey) return;
            
            const otherSelectedValues = newFilters[otherColumnKey];
            if (otherSelectedValues && otherSelectedValues.size > 0) {
              // Bu kolonun mevcut filtrelenmiş değerlerini al
              const validValues = getSmartFilterValues(otherColumnKey);
              const validValuesSet = new Set(validValues);
              
              // Geçersiz seçimleri temizle
              const cleanedValues = new Set();
              otherSelectedValues.forEach(selectedValue => {
                if (validValuesSet.has(selectedValue)) {
                  cleanedValues.add(selectedValue);
                }
              });
              
              newFilters[otherColumnKey] = cleanedValues;
            }
          });
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
  
    // Arama kutusunu temizle
    const clearFilterSearch = (columnKey: string) => {
      setFilterSearchTerms(prev => ({
        ...prev,
        [columnKey]: ''
      }));
    };
  

    // Akıllı filtreleme: Diğer filtrelerin etkisini hesaba katarak mevcut değerleri hesapla
    const getSmartFilterValues = (columnKey: string) => {
      if (result.sheetResults.length === 0) return [];
      
      let currentDifferences = [...result.sheetResults[activeSheetIndex].differences];
      
      // Mevcut filtrelenmiş verileri al (sadece diğer kolonların filtrelerini uygula)
      Object.keys(filters).forEach(otherColumnKey => {
        if (otherColumnKey === columnKey) return; // Kendi kolonunu atla
        
        const selectedValues = filters[otherColumnKey];
        const searchTerm = filterSearchTerms[otherColumnKey]?.toLowerCase() || '';
        
        if (selectedValues.size > 0 || searchTerm) {
          currentDifferences = currentDifferences.filter(diff => {
            let valueToCompare: any;
            let displayValue: string;
            
            switch (otherColumnKey) {
              case 'row':
                valueToCompare = diff.row;
                displayValue = String(valueToCompare);
                break;
              case 'col':
                valueToCompare = diff.col;
                displayValue = convertColumnIndexToLetter(valueToCompare);
                break;
              case 'columnName':
                valueToCompare = diff.columnName;
                displayValue = String(valueToCompare || '-');
                break;
              case 'rowName':
                valueToCompare = diff.rowName;
                displayValue = String(valueToCompare || '-');
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
                return true;
            }
            
            const matchesSearch = !searchTerm || displayValue.toLowerCase().includes(searchTerm);
            const matchesSelection = selectedValues.size === 0 || selectedValues.has(valueToCompare);
            
            return matchesSearch && matchesSelection;
          });
        }
      });
      
      // Şimdi bu filtrelenmiş verilerden hedef kolonun değerlerini çıkar
      const uniqueValues = Array.from(new Set(currentDifferences.map((diff: any) => diff[columnKey])));
      
      return uniqueValues.sort((a, b) => {
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
    };
  
    // Filtrelenmiş değerleri hesapla (arama terimi ile) - Akıllı filtreleme kullan
    const getFilteredValues = (columnKey: string) => {
      const allValues = getSmartFilterValues(columnKey);
      const searchTerm = filterSearchTerms[columnKey]?.toLowerCase() || '';
      
      if (!searchTerm) return allValues;
      
      return allValues.filter(value => {
        let displayValue: string;
        if (columnKey === 'col') {
          displayValue = convertColumnIndexToLetter(value);
        } else if (columnKey === 'columnName' || columnKey === 'rowName') {
          displayValue = String(value || '-');
        } else {
          displayValue = String(value === null ? '(boş)' : value);
        }
        return displayValue.toLowerCase().includes(searchTerm);
      });
    };
  
    // Gösterilecek farkları filtrele ve sırala
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
              case 'columnName':
                valueToCompare = diff.columnName;
                displayValue = String(valueToCompare || '-');
                break;
              case 'rowName':
                valueToCompare = diff.rowName;
                displayValue = String(valueToCompare || '-');
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
  
    // Pagination hook kullan
    const pagination = usePagination(filteredAndSortedDifferences);
    const { currentPageData } = pagination;
  
    // Aktif sayfanın farklarını göster
    const renderActiveDifferences = () => {
      if (result.sheetResults.length === 0) return <p>{t('excel.results.noCommonSheets')}</p>;
      
      const activeSheet = result.sheetResults[activeSheetIndex];
      
      if (activeSheet.differences.length === 0) {
        return <p className="no-diff-message">{t('excel.results.noDifference')}</p>;
      }
      
      // Sütun başlıklarını ve bunlara karşılık gelen CellDiff anahtarlarını tanımla
      const columnHeaders = showHeaders 
        ? [
            { label: t('excel.results.columns.column'), key: 'col' },
            { label: t('excel.results.columns.columnHeader'), key: 'columnName' },
            { label: t('excel.results.columns.row'), key: 'row' },
            { label: t('excel.results.columns.rowHeader'), key: 'rowName' },
            { label: t('excel.results.columns.file1Value'), key: 'value1' },
            { label: t('excel.results.columns.file2Value'), key: 'value2' },
          ]
        : [
            { label: t('excel.results.columns.column'), key: 'col' },
            { label: t('excel.results.columns.row'), key: 'row' },
            { label: t('excel.results.columns.file1Value'), key: 'value1' },
            { label: t('excel.results.columns.file2Value'), key: 'value2' },
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
                              <div className="filter-search-container">
                                <input
                                  type="text"
                                  placeholder="Ara..."
                                  value={filterSearchTerms[col.key] || ''}
                                  onChange={(e) => updateFilterSearchTerm(col.key, e.target.value)}
                                  className="filter-search-input"
                                  onClick={(e) => e.stopPropagation()}
                                />
                                {filterSearchTerms[col.key] && (
                                  <FontAwesomeIcon 
                                    icon={faTimes} 
                                    className="clear-search-icon" 
                                    onClick={() => clearFilterSearch(col.key)}
                                    title="Aramayı temizle"
                                  />
                                )}
                              </div>
                            </div>
                            <div className="filter-actions">
                              <button onClick={() => {
                                const allValues = getSmartFilterValues(col.key);
                                const searchTerm = filterSearchTerms[col.key]?.toLowerCase() || '';
                                const filteredValues = searchTerm 
                                  ? allValues.filter(value => {
                                      const displayValue = col.key === 'col' 
                                        ? convertColumnIndexToLetter(value) 
                                        : (col.key === 'columnName' || col.key === 'rowName')
                                        ? String(value || '-')
                                        : String(value === null ? '(boş)' : value);
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
                              {getFilteredValues(col.key).map((value, idx) => (
                                <label key={idx}>
                                  <input 
                                    type="checkbox" 
                                    checked={filters[col.key]?.has(value) || false}
                                    onChange={(e) => handleFilterChange(col.key, value, e.target.checked)}
                                  />
                                  {col.key === 'col' 
                                    ? convertColumnIndexToLetter(value) 
                                    : (col.key === 'columnName' || col.key === 'rowName')
                                    ? String(value || '-')
                                    : String(value === null ? '(boş)' : value)}
                                </label>
                              ))}
                              {getFilteredValues(col.key).length === 0 && (
                                <div className="no-filter-options">
                                  <span>Bu filtre için mevcut seçenek yok</span>
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
                  <tr key={pagination.startIndex + index}>
                    {columnHeaders.map(col => (
                      <td key={`${pagination.startIndex + index}-${col.key}`}
                        className={
                          col.key === 'value1' ? 'diff-value diff-high' :
                          col.key === 'value2' ? 'diff-value diff-none' :
                          ''
                        }
                      >
                        {col.key === 'col' && convertColumnIndexToLetter(diff.col)}
                        {col.key === 'columnName' && (diff.columnName || <span className="empty-value">-</span>)}
                        {col.key === 'row' && diff.row}
                        {col.key === 'rowName' && (diff.rowName || <span className="empty-value">-</span>)}
                        {col.key === 'value1' && (diff.value1 !== null ? String(diff.value1) : <span className="empty-value">(boş)</span>)}
                        {col.key === 'value2' && (diff.value2 !== null ? String(diff.value2) : <span className="empty-value">(boş)</span>)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <PaginationControls
            {...pagination}
            onPageChange={pagination.setPage}
            onPageSizeChange={pagination.setPageSize}
            onFirstPage={pagination.firstPage}
            onLastPage={pagination.lastPage}
            onNextPage={pagination.nextPage}
            onPreviousPage={pagination.previousPage}
          />
        </div>
      );
    };
  
     return (
       <ComparisonLayout
         noDifference={calculateTotalDiffCount() === 0}
        previewContent={
          <>
            {renderSheetTabs()}
            {renderActiveDifferences()}
          </>
        }
        summaryContent={
          <ComparisonResultLayout
            title="Excel Karşılaştırma Sonucu"
            fileName1={result.file1Name}
            fileName2={result.file2Name}
            totalDiffCount={calculateTotalDiffCount()}
            structureDiffRows={[
              {
                label: 'Sayfa',
                value1: result.sheetCount1,
                value2: result.sheetCount2,
                diff: Math.abs(result.sheetCount2 - result.sheetCount1),
                isDiffZero: result.sheetCount2 - result.sheetCount1 === 0
              },
              {
                label: 'Sütun',
                value1: result.file1MaxCols,
                value2: result.file2MaxCols,
                diff: Math.abs(result.file2MaxCols - result.file1MaxCols),
                isDiffZero: result.file2MaxCols - result.file1MaxCols === 0
              },
              {
                label: 'Satır',
                value1: result.file1MaxRows,
                value2: result.file2MaxRows,
                diff: Math.abs(result.file2MaxRows - result.file1MaxRows),
                isDiffZero: result.file2MaxRows - result.file1MaxRows === 0
              },
              {
                label: 'Boyut',
                value1: formatFileSize(result.file1Size),
                value2: formatFileSize(result.file2Size),
                diff: formatFileSize(Math.abs(result.file2Size - result.file1Size)),
                isDiffZero: result.file2Size - result.file1Size === 0
              }
            ]}
            additionalSummaryItems={
              <>
                {result.missingSheets1.length > 0 && (
                  <div className="summary-item diff-high">
                    <span>Dosya 1'de Eksik Sayfalar:</span>
                    <span>{result.missingSheets1.join(', ')}</span>
                  </div>
                )}
                {result.missingSheets2.length > 0 && (
                  <div className="summary-item diff-high">
                    <span>Dosya 2'de Eksik Sayfalar:</span>
                    <span>{result.missingSheets2.join(', ')}</span>
                  </div>
                )}
              </>
            }
            exportButton={calculateTotalDiffCount() > 0 ? <ExportButton onClick={handleExportToExcel} /> : undefined}
          />
        }
      />
    );
  };

  return (
    <div className="page-content">
      <h1>{t('excel.title')}</h1>
      <p className="page-description">
        {t('excel.description')}
      </p>
      
      
      
      <FileUpload 
        onCompare={handleCompare} 
        pageType="excel" 
        allowedFileTypes={allowedExcelTypes}
      />
<div className="comparison-options">
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={showHeaders}
            onChange={(e) => setShowHeaders(e.target.checked)}
          />
          <span>{t('excel.options.showHeaders')}</span>
          <small className="option-description">
            {t('excel.options.showHeadersDesc')}
          </small>
        </label>
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={matchColumns}
            onChange={(e) => setMatchColumns(e.target.checked)}
          />
          <span>{t('excel.options.matchColumns')}</span>
          <small className="option-description">
            {t('excel.options.matchColumnsDesc')}
          </small>
        </label>
      </div>
      {compareResult && (
        <ExcelCompareResult result={compareResult} />
      )}
    </div>
  );
};

export default ExcelCompare;
