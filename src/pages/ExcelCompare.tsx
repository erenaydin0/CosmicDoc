import React from 'react';
import FileUpload from '../components/FileUpload';

const ExcelCompare: React.FC = () => {
  const allowedExcelTypes = ['.xlsx', '.xls', '.xlsm', '.xlsb', '.csv'];
  
  const handleCompare = (file1: File, file2: File) => {
    console.log('Comparing Excel files:', file1.name, file2.name);
    // Karşılaştırma mantığı buraya eklenecek
  };

  return (
    <div className="page-content">
      <FileUpload 
        onCompare={handleCompare} 
        pageType="excel" 
        allowedFileTypes={allowedExcelTypes}
      />
    </div>
  );
};

export default ExcelCompare;
