import React from 'react';
import FileUpload from '../components/FileUpload';

const TextCompare: React.FC = () => {
  const allowedTextTypes = ['.txt', '.md', '.json', '.xml', '.html', '.css', '.js', '.jsx', '.ts', '.tsx', '.yaml', '.yml', '.ini', '.conf', '.csv'];
  
  const handleCompare = (file1: File, file2: File) => {
    console.log('Comparing text files:', file1.name, file2.name);
    // Karşılaştırma mantığı buraya eklenecek
  };

  return (
    <div className="page-content">
      <FileUpload 
        onCompare={handleCompare} 
        pageType="text" 
        allowedFileTypes={allowedTextTypes}
      />
    </div>
  );
};

export default TextCompare;
