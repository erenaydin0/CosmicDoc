/**
 * Dosya işlemleri için yardımcı fonksiyonlar
 */

/**
 * Dosyayı IndexedDB'ye kaydetmek için FileReader kullanır
 * @param file Kaydedilecek dosya
 * @param saveFunction IndexedDB kaydetme fonksiyonu
 * @param key Dosya anahtarı
 * @param metadata Ek metadata
 */
export const saveFileToIndexedDB = async (
  file: File,
  saveFunction: (key: string, data: string | ArrayBuffer | Blob, metadata: any) => Promise<void>,
  key: string,
  metadata: Record<string, any> = {}
): Promise<void> => {
  return new Promise<void>((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = async (e) => {
      try {
        const dataUrl = e.target?.result;
        if (dataUrl) {
          await saveFunction(key, dataUrl, {
            fileName: file.name,
            fileType: file.type,
            lastModified: file.lastModified,
            ...metadata
          });
          resolve();
        } else {
          reject(new Error('Dosya okunamadı'));
        }
      } catch (err) {
        reject(err);
      }
    };
    
    reader.onerror = (e) => reject(e);
    reader.readAsDataURL(file);
  });
};

/**
 * Birden fazla dosyayı paralel olarak IndexedDB'ye kaydeder
 * @param files Kaydedilecek dosyalar ve anahtarları
 * @param saveFunction IndexedDB kaydetme fonksiyonu
 */
export const saveFilesParallel = async (
  files: Array<{ file: File; key: string; metadata?: Record<string, any> }>,
  saveFunction: (key: string, data: string | ArrayBuffer | Blob, metadata: any) => Promise<void>
): Promise<void> => {
  await Promise.all(
    files.map(({ file, key, metadata }) => 
      saveFileToIndexedDB(file, saveFunction, key, metadata)
    )
  );
};

/**
 * PDF gibi büyük dosyaları base64 şişirmeden ArrayBuffer olarak kaydeder
 */
export const saveBinaryFilesParallel = async (
  files: Array<{ file: File; key: string; metadata?: Record<string, any> }>,
  saveFunction: (key: string, data: string | ArrayBuffer | Blob, metadata: any) => Promise<void>
): Promise<void> => {
  await Promise.all(
    files.map(async ({ file, key, metadata }) => {
      const data = await file.arrayBuffer();
      await saveFunction(key, data, {
        fileName: file.name,
        fileType: file.type,
        lastModified: file.lastModified,
        ...metadata
      });
    })
  );
};

/**
 * Benzersiz timestamp-based anahtar oluşturur
 * @param prefix Anahtar öneki
 * @param timestamp Zaman damgası (opsiyonel)
 */
export const generateFileKey = (prefix: string, timestamp?: number): string => {
  const ts = timestamp || Date.now();
  return `${prefix}_${ts}`;
};

