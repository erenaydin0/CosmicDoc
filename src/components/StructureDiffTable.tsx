import React from 'react';

interface StructureDiffRow {
  label: string;
  value1: number | string;
  value2: number | string;
  diff: number | string;
  isDiffZero?: boolean;
}

interface StructureDiffTableProps {
  rows: StructureDiffRow[];
}

/**
 * Dosya yapısal farklılıklarını gösteren tablo bileşeni
 * Sayfa, satır, sütun, boyut gibi yapısal farklılıkları göstermek için kullanılır
 */
const StructureDiffTable: React.FC<StructureDiffTableProps> = ({ rows }) => {
  return (
    <div className="structure-diff-table">
      <div className="structure-diff-header">
        <div className="structure-diff-cell header-cell"></div>
        <div className="structure-diff-cell header-cell">Dosya 1</div>
        <div className="structure-diff-cell header-cell">Dosya 2</div>
        <div className="structure-diff-cell header-cell">Fark</div>
      </div>
      
      {rows.map((row, index) => (
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
  );
};

export default StructureDiffTable;