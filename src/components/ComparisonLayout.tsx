import React from 'react';
import '../style/Components.css';

interface ComparisonLayoutProps {
  previewContent: React.ReactNode;
  summaryContent: React.ReactNode;
  noDifference?: boolean;
  noDifferenceMessage?: string;
  isLoading?: boolean;
  loadingMessage?: string;
  error?: string;
  onRetry?: () => void;
}

const ComparisonLayout: React.FC<ComparisonLayoutProps> = ({
  previewContent,
  summaryContent,
  noDifference = false,
  noDifferenceMessage = "Dosyalar arasında fark bulunamadı.",
  isLoading = false,
  loadingMessage = "Yükleniyor...",
  error,
  onRetry
}) => {
  return (
    <div className="result-container">
      {isLoading ? (
        <div className="loading-container full-page">
          <div className="loading-spinner"></div>
          <p className="loading-message">{loadingMessage}</p>
        </div>
      ) : error ? (
        <div className="error-container full-page">
          <p className="error-message">{error}</p>
          {onRetry && (
            <button onClick={onRetry} className="retry-button">Tekrar Dene</button>
          )}
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