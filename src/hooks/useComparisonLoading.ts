import { useState, useCallback } from 'react';

interface UseComparisonLoadingProps {
  initialLoading?: boolean;
}

interface UseComparisonLoadingReturn {
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  startComparison: (file1: File, file2: File) => void;
  finishComparison: (result: any) => any;
  createLoadingResult: (file1: File, file2: File, additionalProps?: any) => any;
}

export const useComparisonLoading = ({ 
  initialLoading = false 
}: UseComparisonLoadingProps = {}): UseComparisonLoadingReturn => {
  const [isLoading, setIsLoading] = useState(initialLoading);

  const startComparison = useCallback((_file1: File, _file2: File) => {
    setIsLoading(true);
  }, []);

  const finishComparison = useCallback((result: any) => {
    setIsLoading(false);
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
    isLoading,
    setIsLoading,
    startComparison,
    finishComparison,
    createLoadingResult
  };
};
