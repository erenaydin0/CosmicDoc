import { useState, useCallback } from 'react';

/**
 * Loading state yönetimi için hook
 */
export interface UseLoadingStateOptions {
  initialLoading?: boolean;
  onStart?: () => void;
  onFinish?: () => void;
  onError?: (error: Error) => void;
}

export interface UseLoadingStateReturn {
  // State
  isLoading: boolean;
  error: Error | null;
  
  // Kontrol fonksiyonları
  startLoading: () => void;
  finishLoading: () => void;
  setError: (error: Error | null) => void;
  reset: () => void;
  
  // Async wrapper
  executeAsync: <T>(asyncFn: () => Promise<T>) => Promise<T>;
}

export const useLoadingState = (
  options: UseLoadingStateOptions = {}
): UseLoadingStateReturn => {
  const {
    initialLoading = false,
    onStart,
    onFinish,
    onError
  } = options;

  const [isLoading, setIsLoading] = useState<boolean>(initialLoading);
  const [error, setErrorState] = useState<Error | null>(null);

  const startLoading = useCallback(() => {
    setIsLoading(true);
    setErrorState(null);
    onStart?.();
  }, [onStart]);

  const finishLoading = useCallback(() => {
    setIsLoading(false);
    onFinish?.();
  }, [onFinish]);

  const setError = useCallback((err: Error | null) => {
    setErrorState(err);
    setIsLoading(false);
    if (err && onError) {
      onError(err);
    }
  }, [onError]);

  const reset = useCallback(() => {
    setIsLoading(initialLoading);
    setErrorState(null);
  }, [initialLoading]);

  /**
   * Async fonksiyonu otomatik loading state yönetimiyle çalıştırır
   */
  const executeAsync = useCallback(async <T,>(asyncFn: () => Promise<T>): Promise<T> => {
    startLoading();
    try {
      const result = await asyncFn();
      finishLoading();
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      throw error;
    }
  }, [startLoading, finishLoading, setError]);

  return {
    isLoading,
    error,
    startLoading,
    finishLoading,
    setError,
    reset,
    executeAsync
  };
};

/**
 * Çoklu loading state'leri yönetmek için hook
 */
export interface UseMultipleLoadingStateReturn {
  loadingStates: Record<string, boolean>;
  isAnyLoading: boolean;
  isAllLoading: boolean;
  startLoading: (key: string) => void;
  finishLoading: (key: string) => void;
  resetLoading: (key?: string) => void;
}

export const useMultipleLoadingState = (
  keys: string[]
): UseMultipleLoadingStateReturn => {
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>(
    keys.reduce((acc, key) => ({ ...acc, [key]: false }), {})
  );

  const startLoading = useCallback((key: string) => {
    setLoadingStates(prev => ({ ...prev, [key]: true }));
  }, []);

  const finishLoading = useCallback((key: string) => {
    setLoadingStates(prev => ({ ...prev, [key]: false }));
  }, []);

  const resetLoading = useCallback((key?: string) => {
    if (key) {
      setLoadingStates(prev => ({ ...prev, [key]: false }));
    } else {
      setLoadingStates(keys.reduce((acc, k) => ({ ...acc, [k]: false }), {}));
    }
  }, [keys]);

  const isAnyLoading = Object.values(loadingStates).some(loading => loading);
  const isAllLoading = Object.values(loadingStates).every(loading => loading);

  return {
    loadingStates,
    isAnyLoading,
    isAllLoading,
    startLoading,
    finishLoading,
    resetLoading
  };
};

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
  isLoading: boolean;
  error: Error | null;
  setIsLoading: (loading: boolean) => void;
  startComparison: (file1: File, file2: File) => void;
  finishComparison: (result: any) => any;
  createLoadingResult: (file1: File, file2: File, additionalProps?: any) => any;
  executeComparison: <T>(comparisonFn: () => Promise<T>) => Promise<T>;
  reset: () => void;
}

export const useComparisonLoading = (
  options: UseComparisonLoadingOptions = {}
): UseComparisonLoadingReturn => {
  const {
    initialLoading = false,
    onStart,
    onFinish,
    onError
  } = options;

  const { isLoading, error, startLoading, finishLoading, reset, executeAsync } = useLoadingState({
    initialLoading,
    onStart,
    onFinish,
    onError
  });

  const startComparison = useCallback((_file1: File, _file2: File) => {
    startLoading();
  }, [startLoading]);

  const finishComparison = useCallback((result: any) => {
    finishLoading();
    return {
      ...result,
      isLoading: false
    };
  }, [finishLoading]);

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

  const setIsLoading = useCallback((loading: boolean) => {
    if (loading) {
      startLoading();
    } else {
      finishLoading();
    }
  }, [startLoading, finishLoading]);

  const executeComparison = useCallback(async <T,>(comparisonFn: () => Promise<T>): Promise<T> => {
    return executeAsync(comparisonFn);
  }, [executeAsync]);

  return {
    isLoading,
    error,
    setIsLoading,
    startComparison,
    finishComparison,
    createLoadingResult,
    executeComparison,
    reset
  };
};
