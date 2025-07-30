import React, { useState, useEffect } from 'react';
import FileUpload from '../components/FileUpload';
import PdfCompareResult from '../components/PdfCompareResult';
import { PdfCompareService } from '../services/PdfCompareService';
import { PdfCompareResult as PdfCompareResultType } from '../types/PdfTypes';
import { savePdfFile, clearPdfStore } from '../services/IndexedDBService';
import '../style/PageStyles.css';
import '../style/PdfCompareResult.css';

const PdfCompare: React.FC = () => {
  const allowedPdfTypes = ['.pdf'];
  const [isComparing, setIsComparing] = useState(false);
  const [compareResult, setCompareResult] = useState<PdfCompareResultType | null>(null);
  const [compareError, setCompareError] = useState<string | null>(null);
  
  // Component ilk yüklendiğinde verileri temizle
  useEffect(() => {
    // Tüm eski PDF verilerini temizle
    clearPdfStore().catch(err => console.error('PDF deposu temizlenirken hata:', err));
    
    return () => {
      // Component kaldırıldığında da temizleme işlemi yapabilirsiniz
    };
  }, []);
  
  const handleCompare = async (file1: File, file2: File) => {
    setIsComparing(true);
    setCompareResult(null);
    setCompareError(null);
    
    try {
      // Yeni bir timestamp oluştur
      const timestamp = Date.now();
      
      // Önceki verileri temizle
      await clearPdfStore();
      
      // Her yeni PDF karşılaştırması için benzersiz anahtarlar oluştur
      const pdf1Key = `pdf1_${timestamp}`;
      const pdf2Key = `pdf2_${timestamp}`;
      
      // PDF dosyalarını IndexedDB'ye kaydet
      const saveFileToIndexedDB = async (file: File, key: string) => {
        return new Promise<void>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = async (e) => {
            try {
              const dataUrl = e.target?.result;
              if (dataUrl) {
                // Dosyayı IndexedDB'ye kaydet
                await savePdfFile(key, dataUrl, {
                  fileName: file.name,
                  fileType: file.type,
                  lastModified: file.lastModified,
                  timestamp: timestamp
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

      // PDF dosyalarını paralel olarak kaydet
      await Promise.all([
        saveFileToIndexedDB(file1, pdf1Key),
        saveFileToIndexedDB(file2, pdf2Key)
      ]);
      
      const result = await PdfCompareService.comparePdfFiles(file1, file2);
      // Karşılaştırma sonucuna timestamp ekle
      const resultWithTimestamp = {
        ...result,
        timestamp: timestamp,
        pdf1Key,
        pdf2Key
      };
      setCompareResult(resultWithTimestamp);
    } catch (error) {
      console.error('PDF karşılaştırma hatası:', error);
      setCompareError(error instanceof Error ? error.message : 'PDF karşılaştırılırken bir hata oluştu');
    } finally {
      setIsComparing(false);
    }
  };

  return (
    <div className="page-content">
      <h1>PDF Karşılaştırma</h1>
      <p className="page-description">
        PDF Karşılaştırma aracı ile iki PDF dosyasının içeriğini kolayca karşılaştırın. 
        Yüklediğiniz belgelerdeki metin farklılıkları anında tespit edilir.
      </p>
      
      <FileUpload 
        onCompare={handleCompare} 
        pageType="pdf" 
        allowedFileTypes={allowedPdfTypes}
      />
      
      {isComparing && (
        <div className="loading-message">
          <p>PDF dosyaları karşılaştırılıyor, lütfen bekleyiniz...</p>
          <div className="loader"></div>
        </div>
      )}
      
      {compareError && (
        <div className="error-message">
          <p>Hata: {compareError}</p>
        </div>
      )}
      
      {compareResult && <PdfCompareResult result={compareResult} />}
    </div>
  );
};

export default PdfCompare;
