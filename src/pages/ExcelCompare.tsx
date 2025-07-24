import React, { useState } from 'react';
import FileUpload from '../components/FileUpload';
import ExcelCompareResult from '../components/ExcelCompareResult';
import { ExcelCompareService } from '../services/ExcelCompareService';
import { ExcelCompareResult as ExcelCompareResultType } from '../types/ExcelTypes';
import { saveExcelFile } from '../services/IndexedDBService';
import '../style/PageStyles.css';

const ExcelCompare: React.FC = () => {
  const allowedExcelTypes = ['.xlsx', '.xls', '.xlsm', '.xlsb', '.csv'];
  const [compareResult, setCompareResult] = useState<ExcelCompareResultType | null>(null);
  const [isComparing, setIsComparing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  const handleCompare = async (file1: File, file2: File) => {
    try {
      setIsComparing(true);
      setError(null);
      setCompareResult(null); // Yeni karşılaştırma başlamadan önce önceki sonucu temizle
      console.log('Excel dosyaları karşılaştırılıyor:', file1.name, file2.name);
      
      // Excel dosyalarını IndexedDB'ye kaydet
      const saveFileToIndexedDB = async (file: File, key: string) => {
        return new Promise<void>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = async (e) => {
            try {
              const dataUrl = e.target?.result;
              if (dataUrl) {
                // Dosyayı IndexedDB'ye kaydet
                await saveExcelFile(key, dataUrl, {
                  fileName: file.name,
                  fileType: file.type,
                  lastModified: file.lastModified
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

      // Excel dosyalarını paralel olarak kaydet
      await Promise.all([
        saveFileToIndexedDB(file1, 'excel1DataUrl'),
        saveFileToIndexedDB(file2, 'excel2DataUrl')
      ]);
      
      // Excel dosyalarını karşılaştır
      const result = await ExcelCompareService.compareExcelFiles(file1, file2);
      console.log('Karşılaştırma sonucu:', result);
      
      // Sonuçları ayarla
      setCompareResult(result);
    } catch (err) {
      console.error('Excel karşılaştırma hatası:', err);
      setError(`Excel karşılaştırması başarısız oldu: ${err instanceof Error ? err.message : 'Bilinmeyen bir hata oluştu'}`);
      setCompareResult(null);
    } finally {
      setIsComparing(false);
    }
  };

  return (
    <div className="page-content">
      <h1>Excel Karşılaştırma</h1>
      <p className="page-description">
        Excel Karşılaştırma Aracı ile iki Excel dosyasının içeriğini kolayca karşılaştırın.
        Yüklediğiniz tablolardaki veri farklılıkları anında tespit edilir.
      </p>
      
      <FileUpload 
        onCompare={handleCompare} 
        pageType="excel" 
        allowedFileTypes={allowedExcelTypes}
      />
      
      {isComparing && (
        <div className="comparing-indicator">
          <p>Excel dosyaları karşılaştırılıyor...</p>
          <div className="spinner"></div>
        </div>
      )}
      
      {error && (
        <div className="error-message">
          <p>{error}</p>
          <button onClick={() => setError(null)}>Tamam</button>
        </div>
      )}
      
      {compareResult && (
        <ExcelCompareResult result={compareResult} />
      )}
    </div>
  );
};

export default ExcelCompare;
