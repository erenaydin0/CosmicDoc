import React from 'react';
import FileUpload from '../components/FileUpload';

const PdfCompare: React.FC = () => {
  const allowedPdfTypes = ['.pdf'];
  
  const handleCompare = (file1: File, file2: File) => {
    console.log('Comparing PDF files:', file1.name, file2.name);
    // Karşılaştırma mantığı buraya eklenecek
  };

  return (
    <div className="page-content">
      <FileUpload 
        onCompare={handleCompare} 
        pageType="pdf" 
        allowedFileTypes={allowedPdfTypes}
      />
    </div>
  );
};

export default PdfCompare;
