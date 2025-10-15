/**
 * Karşılaştırma işlemleri için sabitler
 */

// Chunk processing sabitleri
export const CHUNK_SIZE = 1000;

// Görsel karşılaştırma sabitleri
export const VISUAL_COMPARISON = {
  SCALE: 1.5,
  PIXEL_THRESHOLD: 30,
  DIFFERENCE_THRESHOLD: 0.1 // %0.1
} as const;

// Sayısal karşılaştırma sabitleri
export const NUMERIC_COMPARISON = {
  EPSILON: 0.0001 // Küçük sayısal farkları yok say
} as const;

// Pagination sabitleri
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 100,
  PAGE_SIZE_OPTIONS: [50, 100, 250, 500]
} as const;

