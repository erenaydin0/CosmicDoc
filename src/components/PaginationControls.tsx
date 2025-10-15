import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronLeft, faChevronRight } from '@fortawesome/free-solid-svg-icons';
import { PAGINATION } from '../constants/comparison';
import '../style/Components.css';

export interface PaginationControlsProps {
  currentPage: number;
  totalItems: number;
  startIndex: number;
  endIndex: number;
  pageSize: number;
  visiblePageNumbers: number[];
  canGoNext: boolean;
  canGoPrevious: boolean;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  onFirstPage: () => void;
  onLastPage: () => void;
  onNextPage: () => void;
  onPreviousPage: () => void;
  pageSizeOptions?: number[];
  showInfo?: boolean;
  showPageSizeSelector?: boolean;
}

/**
 * Yeniden kullanılabilir pagination kontrol bileşeni
 */
export const PaginationControls: React.FC<PaginationControlsProps> = ({
  currentPage,
  totalItems,
  startIndex,
  endIndex,
  pageSize,
  visiblePageNumbers,
  canGoNext,
  canGoPrevious,
  onPageChange,
  onPageSizeChange,
  onFirstPage,
  onLastPage,
  onNextPage,
  onPreviousPage,
  pageSizeOptions = PAGINATION.PAGE_SIZE_OPTIONS,
  showInfo = true,
  showPageSizeSelector = true
}) => {
  if (totalItems === 0) return null;

  return (
    <div className="pagination-controls">
      {showInfo && (
        <div className="pagination-info">
          <span>
            {startIndex + 1}-{endIndex} / {totalItems} sonuç gösteriliyor
          </span>
          {showPageSizeSelector && (
            <>
              <select 
                value={pageSize} 
                onChange={(e) => onPageSizeChange(Number(e.target.value))}
                className="page-size-selector"
              >
                {pageSizeOptions.map(size => (
                  <option key={size} value={size}>{size}</option>
                ))}
              </select>
              <span>satır</span>
            </>
          )}
        </div>
      )}
      
      <div className="pagination-buttons">
        <button 
          onClick={onFirstPage} 
          disabled={!canGoPrevious}
          className="pagination-button"
          aria-label="İlk sayfa"
        >
          <FontAwesomeIcon icon={faChevronLeft} />
          <FontAwesomeIcon icon={faChevronLeft} />
        </button>
        
        <button 
          onClick={onPreviousPage} 
          disabled={!canGoPrevious}
          className="pagination-button"
          aria-label="Önceki sayfa"
        >
          <FontAwesomeIcon icon={faChevronLeft} />
        </button>
        
        {visiblePageNumbers.map(pageNum => (
          <button
            key={pageNum}
            onClick={() => onPageChange(pageNum)}
            className={`pagination-button ${currentPage === pageNum ? 'active' : ''}`}
            aria-label={`Sayfa ${pageNum}`}
            aria-current={currentPage === pageNum ? 'page' : undefined}
          >
            {pageNum}
          </button>
        ))}
        
        <button 
          onClick={onNextPage} 
          disabled={!canGoNext}
          className="pagination-button"
          aria-label="Sonraki sayfa"
        >
          <FontAwesomeIcon icon={faChevronRight} />
        </button>
        
        <button 
          onClick={onLastPage} 
          disabled={!canGoNext}
          className="pagination-button"
          aria-label="Son sayfa"
        >
          <FontAwesomeIcon icon={faChevronRight} />
          <FontAwesomeIcon icon={faChevronRight} />
        </button>
      </div>
    </div>
  );
};

