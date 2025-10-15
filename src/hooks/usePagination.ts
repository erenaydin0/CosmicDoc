import { useState, useMemo } from 'react';
import { PAGINATION } from '../constants/comparison';

/**
 * Pagination işlemleri için hook
 */
export interface UsePaginationOptions {
  defaultPageSize?: number;
  initialPage?: number;
}

export interface UsePaginationReturn<T> {
  // Pagination state
  currentPage: number;
  pageSize: number;
  totalPages: number;
  totalItems: number;
  startIndex: number;
  endIndex: number;
  
  // Sayfalanmış veri
  currentPageData: T[];
  
  // Kontrol fonksiyonları
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
  nextPage: () => void;
  previousPage: () => void;
  firstPage: () => void;
  lastPage: () => void;
  canGoNext: boolean;
  canGoPrevious: boolean;
  
  // Sayfa numaraları
  visiblePageNumbers: number[];
  
  // Reset
  resetPagination: () => void;
}

export const usePagination = <T,>(
  items: T[],
  options: UsePaginationOptions = {}
): UsePaginationReturn<T> => {
  const {
    defaultPageSize = PAGINATION.DEFAULT_PAGE_SIZE,
    initialPage = 1
  } = options;

  const [currentPage, setCurrentPage] = useState<number>(initialPage);
  const [pageSize, setPageSize] = useState<number>(defaultPageSize);

  // Toplam öğe ve sayfa sayısı
  const totalItems = items.length;
  const totalPages = Math.ceil(totalItems / pageSize);

  // İndeks hesaplamaları
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);

  // Sayfalanmış veri
  const currentPageData = useMemo(() => {
    return items.slice(startIndex, endIndex);
  }, [items, startIndex, endIndex]);

  // Sayfa değiştirme fonksiyonları
  const setPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const nextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const previousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const firstPage = () => {
    setCurrentPage(1);
  };

  const lastPage = () => {
    setCurrentPage(totalPages);
  };

  // Sayfa boyutu değiştiğinde ilk sayfaya dön
  const handleSetPageSize = (size: number) => {
    setPageSize(size);
    setCurrentPage(1);
  };

  // Navigation kontrolü
  const canGoNext = currentPage < totalPages;
  const canGoPrevious = currentPage > 1;

  // Görünür sayfa numaraları (örn: 1, 2, 3, 4, 5)
  const visiblePageNumbers = useMemo(() => {
    const maxVisiblePages = 5;
    const startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    const endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    // Eğer sondan başladıysak, başı ayarla
    const adjustedStartPage = Math.max(1, endPage - maxVisiblePages + 1);
    
    const pages: number[] = [];
    for (let i = adjustedStartPage; i <= endPage; i++) {
      pages.push(i);
    }
    
    return pages;
  }, [currentPage, totalPages]);

  // Pagination'ı sıfırla
  const resetPagination = () => {
    setCurrentPage(initialPage);
    setPageSize(defaultPageSize);
  };

  return {
    currentPage,
    pageSize,
    totalPages,
    totalItems,
    startIndex,
    endIndex,
    currentPageData,
    setPage,
    setPageSize: handleSetPageSize,
    nextPage,
    previousPage,
    firstPage,
    lastPage,
    canGoNext,
    canGoPrevious,
    visiblePageNumbers,
    resetPagination
  };
};

