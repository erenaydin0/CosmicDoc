/**
 * IndexedDB servisi - Büyük dosyaları ve verileri depolamak için
 */

// Veritabanı adı ve sürümü
const DB_NAME = 'CosmicDocDB';
const DB_VERSION = 1;

// Nesne depoları (object stores)
const STORES = {
  PDF_FILES: 'pdfFiles',
  EXCEL_FILES: 'excelFiles'
};

// IndexedDB bağlantısını açar
const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = (event) => {
      reject(`Veritabanı açılırken hata oluştu: ${(event.target as IDBOpenDBRequest).error}`);
    };

    request.onsuccess = (event) => {
      resolve((event.target as IDBOpenDBRequest).result);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      
      // PDF dosyaları için depo oluştur
      if (!db.objectStoreNames.contains(STORES.PDF_FILES)) {
        db.createObjectStore(STORES.PDF_FILES, { keyPath: 'id' });
      }
      
      // Excel dosyaları için depo oluştur
      if (!db.objectStoreNames.contains(STORES.EXCEL_FILES)) {
        db.createObjectStore(STORES.EXCEL_FILES, { keyPath: 'id' });
      }
    };
  });
};

// Dosya kaydetme fonksiyonu
export const saveFile = async (
  storeName: string, 
  id: string, 
  data: string | ArrayBuffer | Blob,
  metadata: Record<string, any> = {}
): Promise<void> => {
  try {
    const db = await openDB();
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    
    const fileObject = {
      id,
      data,
      metadata,
      timestamp: new Date().getTime()
    };
    
    return new Promise((resolve, reject) => {
      const request = store.put(fileObject);
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
      
      transaction.oncomplete = () => db.close();
    });
  } catch (error) {
    console.error('Dosya kaydedilirken hata:', error);
    throw error;
  }
};

// PDF dosyası kaydetme yardımcı fonksiyonu
export const savePdfFile = (id: string, data: string | ArrayBuffer | Blob, metadata = {}): Promise<void> => {
  return saveFile(STORES.PDF_FILES, id, data, metadata);
};

// Excel dosyası kaydetme yardımcı fonksiyonu
export const saveExcelFile = (id: string, data: string | ArrayBuffer | Blob, metadata = {}): Promise<void> => {
  return saveFile(STORES.EXCEL_FILES, id, data, metadata);
};

// Dosya getirme fonksiyonu
export const getFile = async <T>(storeName: string, id: string): Promise<T | null> => {
  try {
    const db = await openDB();
    const transaction = db.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);
    
    return new Promise((resolve, reject) => {
      const request = store.get(id);
      
      request.onsuccess = () => {
        resolve(request.result || null);
      };
      
      request.onerror = () => {
        reject(request.error);
      };
      
      transaction.oncomplete = () => db.close();
    });
  } catch (error) {
    console.error('Dosya alınırken hata:', error);
    throw error;
  }
};

// PDF dosyası getirme yardımcı fonksiyonu
export const getPdfFile = <T>(id: string): Promise<T | null> => {
  return getFile<T>(STORES.PDF_FILES, id);
};

// Excel dosyası getirme yardımcı fonksiyonu
export const getExcelFile = <T>(id: string): Promise<T | null> => {
  return getFile<T>(STORES.EXCEL_FILES, id);
};

// Dosya silme fonksiyonu
export const deleteFile = async (storeName: string, id: string): Promise<void> => {
  try {
    const db = await openDB();
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    
    return new Promise((resolve, reject) => {
      const request = store.delete(id);
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
      
      transaction.oncomplete = () => db.close();
    });
  } catch (error) {
    console.error('Dosya silinirken hata:', error);
    throw error;
  }
};

// PDF dosyası silme yardımcı fonksiyonu
export const deletePdfFile = (id: string): Promise<void> => {
  return deleteFile(STORES.PDF_FILES, id);
};

// Excel dosyası silme yardımcı fonksiyonu
export const deleteExcelFile = (id: string): Promise<void> => {
  return deleteFile(STORES.EXCEL_FILES, id);
};

// Tüm dosyaları getirme fonksiyonu
export const getAllFiles = async <T>(storeName: string): Promise<T[]> => {
  try {
    const db = await openDB();
    const transaction = db.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);
    
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      
      request.onsuccess = () => {
        resolve(request.result || []);
      };
      
      request.onerror = () => {
        reject(request.error);
      };
      
      transaction.oncomplete = () => db.close();
    });
  } catch (error) {
    console.error('Dosyalar alınırken hata:', error);
    throw error;
  }
};

// Tüm PDF dosyalarını getirme yardımcı fonksiyonu
export const getAllPdfFiles = <T>(): Promise<T[]> => {
  return getAllFiles<T>(STORES.PDF_FILES);
};

// Tüm Excel dosyalarını getirme yardımcı fonksiyonu
export const getAllExcelFiles = <T>(): Promise<T[]> => {
  return getAllFiles<T>(STORES.EXCEL_FILES);
};

// Veritabanını temizleme fonksiyonu
export const clearStore = async (storeName: string): Promise<void> => {
  try {
    const db = await openDB();
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    
    return new Promise((resolve, reject) => {
      const request = store.clear();
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
      
      transaction.oncomplete = () => db.close();
    });
  } catch (error) {
    console.error('Depo temizlenirken hata:', error);
    throw error;
  }
};

// PDF deposunu temizleme yardımcı fonksiyonu
export const clearPdfStore = (): Promise<void> => {
  return clearStore(STORES.PDF_FILES);
};

// Excel deposunu temizleme yardımcı fonksiyonu
export const clearExcelStore = (): Promise<void> => {
  return clearStore(STORES.EXCEL_FILES);
};

// Veritabanı bağlantısını kontrol etme
export const checkDatabaseConnection = async (): Promise<boolean> => {
  try {
    const db = await openDB();
    db.close();
    return true;
  } catch (error) {
    console.error('Veritabanı bağlantısı kontrol edilirken hata:', error);
    return false;
  }
}; 