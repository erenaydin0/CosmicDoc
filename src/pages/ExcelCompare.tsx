import React, { useState } from 'react';
import FileUpload from '../components/FileUpload';
import ExcelCompareResult from '../components/ExcelCompareResult';
import { ExcelCompareService } from '../services/ExcelCompareService';
import { ExcelCompareResult as ExcelCompareResultType } from '../types/ExcelTypes';

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
