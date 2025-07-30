import React, { useState } from 'react';
import FileUpload from '../components/FileUpload';
import TextCompareResult from '../components/TextCompareResult';
import { compareTextFiles, TextCompareResult as TextCompareResultType } from '../services/TextCompareService';
import '../style/PageStyles.css';

const TextCompare: React.FC = () => {
  const [compareResult, setCompareResult] = useState<TextCompareResultType | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  const allowedTextTypes = ['.txt', '.md', '.json', '.xml', '.html', '.css', '.js', '.jsx', '.ts', '.tsx', '.yaml', '.yml', '.ini', '.conf', '.csv'];
  
  const handleCompare = async (file1: File, file2: File) => {
    try {
      setIsLoading(true);
      setError(null);
      
      console.log('Metin dosyaları karşılaştırılıyor:', file1.name, file2.name);
      
      const result = await compareTextFiles(file1, file2);
      setCompareResult(result);
    } catch (error) {
      console.error('Karşılaştırma hatası:', error);
      setError('Dosyalar karşılaştırılırken bir hata oluştu.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="page-content">
      <h1>Metin Karşılaştırma</h1>
      <p className="page-description">
        Metin Karşılaştırma aracı ile iki metin dosyasının içeriğini kolayca karşılaştırın. 
        Yüklediğiniz belgelerdeki metin farklılıkları anında tespit edilir.
      </p>

      <FileUpload 
        onCompare={handleCompare} 
        pageType="text" 
        allowedFileTypes={allowedTextTypes}
      />
      
      {isLoading && (
        <div className="loading-container">
          <p>Dosyalar karşılaştırılıyor...</p>
        </div>
      )}
      
      {error && (
        <div className="error-container">
          <p>{error}</p>
        </div>
      )}
      
      {compareResult && !isLoading && !error && (
        <TextCompareResult result={compareResult} />
      )}
    </div>
  );
};

export default TextCompare;
