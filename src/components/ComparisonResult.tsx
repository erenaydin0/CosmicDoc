import React from 'react';
import '../App.css';

// Export düğmesi için prop tipleri
interface ExportButtonProps {
  onClick: () => void;
  label?: string;
  disabled?: boolean;
}

/**
 * Rapor indirme düğmesi bileşeni
 */
export const ExportButton: React.FC<ExportButtonProps> = ({ 
  onClick, 
  label = "Rapor İndir", 
  disabled = false 
}) => {
  return (
    <button 
      className="export-button"
      onClick={onClick}
      disabled={disabled}
    >
      {label}
    </button>
  );
};

// Yapı karşılaştırma tablosu için satır tipi
interface StructureDiffRow {
  label: string;
  value1: string | number;
  value2: string | number;
  diff: string | number;
  isDiffZero: boolean;
}

// Ana düzen için prop tipleri
interface ComparisonLayoutProps {
  previewContent: React.ReactNode;
  summaryContent: React.ReactNode;
  noDifference?: boolean;
  noDifferenceMessage?: string;
  isLoading?: boolean;
}

// Sonuç düzeni için prop tipleri
interface ComparisonResultLayoutProps {
  title: string;
  fileName1: string;
  fileName2: string;
  totalDiffCount: number;
  structureDiffRows: StructureDiffRow[];
  additionalSummaryItems?: React.ReactNode;
  exportButton?: React.ReactNode;
  children?: React.ReactNode;
}

// Sonuç içeriği bileşeni
export const ComparisonResultLayout: React.FC<ComparisonResultLayoutProps> = ({
  title,
  fileName1,
  fileName2,
  totalDiffCount,
  structureDiffRows,
  additionalSummaryItems,
  exportButton,
  children
}) => {
  return (
    <>
      <div className="result-header">
        <h2>{title}</h2>
        <div className="summary-info">
          <div className="summary-item">
            <span>Dosya 1:</span>
            <span>{fileName1}</span>
          </div>
          <div className="summary-item">
            <span>Dosya 2:</span>
            <span>{fileName2}</span>
          </div>
          <div className="summary-item">
            <span>Toplam Fark Sayısı:</span>
            <span className={totalDiffCount > 0 ? 'diff-high' : 'diff-none'}>
              {totalDiffCount}
            </span>
          </div>
          
          {/* Yapı karşılaştırma tablosu */}
          <div className="structure-diff-table">
            <div className="structure-diff-header">
              <div className="structure-diff-cell header-cell"></div>
              <div className="structure-diff-cell header-cell">Dosya 1</div>
              <div className="structure-diff-cell header-cell">Dosya 2</div>
              <div className="structure-diff-cell header-cell">Fark</div>
            </div>
            {structureDiffRows.map((row, index) => (
              <div className="structure-diff-row" key={index}>
                <div className="structure-diff-cell header-cell">{row.label}</div>
                <div className="structure-diff-cell">{row.value1}</div>
                <div className="structure-diff-cell">{row.value2}</div>
                <div className={`structure-diff-cell ${row.isDiffZero ? 'diff-none' : 'diff-high'}`}>
                  {row.diff}
                </div>
              </div>
            ))}
          </div>
          
          {/* Ek özet öğeleri */}
          {additionalSummaryItems}
        </div>
      </div>

      {/* Dışa aktarma düğmesi */}
      {exportButton}

      {/* Ek içerik */}
      {children}
    </>
  );
};

// Ana karşılaştırma düzeni bileşeni
const ComparisonLayout: React.FC<ComparisonLayoutProps> = ({
  previewContent,
  summaryContent,
  noDifference = false,
  noDifferenceMessage = "Dosyalar arasında fark bulunamadı.",
  isLoading = false
}) => {
  return (
    <div className="result-container">
      {isLoading ? (
        <div className="loading-container full-page">
          <div className="loading-spinner"></div>
        </div>
      ) : (
        <div className="compare-layout">
          <div className="preview-section">
            {noDifference ? (
              <p className="no-diff-message">{noDifferenceMessage}</p>
            ) : (
              previewContent
            )}
          </div>
          <div className="summary-section">
            {summaryContent}
          </div>
        </div>
      )}
    </div>
  );
};

export default ComparisonLayout;