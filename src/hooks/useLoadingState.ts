import { useCallback } from 'react';

/**
 * Dosya karşılaştırma işlemleri için özelleştirilmiş loading state hook'u
 */
export interface UseComparisonLoadingOptions {
  initialLoading?: boolean;
  onStart?: () => void;
  onFinish?: () => void;
  onError?: (error: Error) => void;
}

export interface UseComparisonLoadingReturn {
  startComparison: (file1: File, file2: File) => void;
  finishComparison: (result: any) => any;
  createLoadingResult: (file1: File, file2: File, additionalProps?: any) => any;
}

export const useComparisonLoading = (
  _options: UseComparisonLoadingOptions = {}
): UseComparisonLoadingReturn => {
  const startComparison = useCallback((_file1: File, _file2: File) => {
    // Karşılaştırma başlatma işlemleri
  }, []);

  const finishComparison = useCallback((result: any) => {
    return {
      ...result,
      isLoading: false
    };
  }, []);

  const createLoadingResult = useCallback((file1: File, file2: File, additionalProps: any = {}) => {
    return {
      file1Name: file1.name,
      file2Name: file2.name,
      file1Size: file1.size,
      file2Size: file2.size,
      isLoading: true,
      ...additionalProps
    };
  }, []);

  return {
    startComparison,
    finishComparison,
    createLoadingResult
  };
};
