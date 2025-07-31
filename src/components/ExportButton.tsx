import React from 'react';

interface ExportButtonProps {
  onClick: () => void;
  label?: string;
  disabled?: boolean;
}

/**
 * Rapor indirme düğmesi bileşeni
 */
const ExportButton: React.FC<ExportButtonProps> = ({ 
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

export default ExportButton;