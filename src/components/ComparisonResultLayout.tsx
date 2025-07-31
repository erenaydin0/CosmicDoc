import React from 'react';
import '../style/Components.css';

interface StructureDiffRow {
  label: string;
  value1: string | number;
  value2: string | number;
  diff: string | number;
  isDiffZero: boolean;
}

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

const ComparisonResultLayout: React.FC<ComparisonResultLayoutProps> = ({
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

export default ComparisonResultLayout;