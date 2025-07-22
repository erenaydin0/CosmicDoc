import React, { useState, useRef } from 'react';
import '../style/FileUpload.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUpload, faCheck, faExclamationTriangle, faTimes, faExchangeAlt, faFileAlt } from '@fortawesome/free-solid-svg-icons';

interface FileUploadProps {
  onCompare: (file1: File, file2: File) => void;
  pageType?: 'excel' | 'pdf' | 'text' | 'convert';
  allowedFileTypes?: string[];
}

const FileUpload: React.FC<FileUploadProps> = ({ onCompare, pageType = 'text', allowedFileTypes }) => {
  const [file1, setFile1] = useState<File | null>(null);
  const [file2, setFile2] = useState<File | null>(null);
  const [isDragging1, setIsDragging1] = useState(false);
  const [isDragging2, setIsDragging2] = useState(false);
  const [error1, setError1] = useState<string | null>(null);
  const [error2, setError2] = useState<string | null>(null);

  const inputRef1 = useRef<HTMLInputElement>(null);
  const inputRef2 = useRef<HTMLInputElement>(null);

  const getDefaultAllowedTypes = () => {
    switch (pageType) {
      case 'excel':
        return ['.xlsx', '.xls', '.csv'];
      case 'pdf':
        return ['.pdf'];
      case 'text':
        return ['.txt', '.md', '.json', '.xml', '.html', '.css', '.js', '.ts'];
      case 'convert':
        return [];
      default:
        return [];
    }
  };

  const effectiveAllowedTypes = allowedFileTypes || getDefaultAllowedTypes();

  const validateFileType = (file: File): boolean => {
    if (!effectiveAllowedTypes.length) return true;
    
    const extension = '.' + file.name.split('.').pop()?.toLowerCase();
    return effectiveAllowedTypes.includes(extension);
  };

  const handleDragEnter = (e: React.DragEvent, isDraggingSetter: React.Dispatch<React.SetStateAction<boolean>>) => {
    e.preventDefault();
    e.stopPropagation();
    isDraggingSetter(true);
  };

  const handleDragLeave = (e: React.DragEvent, isDraggingSetter: React.Dispatch<React.SetStateAction<boolean>>) => {
    // Sadece hedef, tam olarak drop-zone elementinin kendisiyse isDragging'i false yap
    // Bu, iç elementlere giriş/çıkışta tetiklenmeyi önler
    if (e.currentTarget === e.target) {
      e.preventDefault();
      e.stopPropagation();
      isDraggingSetter(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleDrop = (
    e: React.DragEvent, 
    setFile: React.Dispatch<React.SetStateAction<File | null>>, 
    isDraggingSetter: React.Dispatch<React.SetStateAction<boolean>>,
    setError: React.Dispatch<React.SetStateAction<string | null>>
  ) => {
    e.preventDefault();
    e.stopPropagation();
    isDraggingSetter(false);
    setError(null);
    
    try {
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        const file = e.dataTransfer.files[0];
        console.log('Dosya bırakıldı:', file.name);
        
        if (validateFileType(file)) {
          setFile(file);
        } else {
          setError(`Desteklenmeyen dosya türü. İzin verilen türler: ${effectiveAllowedTypes.join(', ')}`);
          setFile(null);
        }
        e.dataTransfer.clearData();
      } else {
        console.log('Bırakılan dosya bulunamadı');
      }
    } catch (err) {
      console.error('Dosya sürükle bırak hatası:', err);
      setError('Dosya yüklenirken bir hata oluştu. Lütfen tekrar deneyin.');
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement>, 
    setFile: React.Dispatch<React.SetStateAction<File | null>>,
    setError: React.Dispatch<React.SetStateAction<string | null>>
  ) => {
    setError(null);
    try {
      if (e.target.files && e.target.files.length > 0) {
        const file = e.target.files[0];
        console.log('Dosya seçildi:', file.name);
        
        if (validateFileType(file)) {
          setFile(file);
        } else {
          setError(`Desteklenmeyen dosya türü. İzin verilen türler: ${effectiveAllowedTypes.join(', ')}`);
          setFile(null);
          e.target.value = '';
        }
      }
    } catch (err) {
      console.error('Dosya seçme hatası:', err);
      setError('Dosya yüklenirken bir hata oluştu. Lütfen tekrar deneyin.');
    }
  };

  const handleCompareClick = () => {
    if (file1 && file2) {
      onCompare(file1, file2);
    }
  };

  const handleClearFile = (
    e: React.MouseEvent,
    setFile: React.Dispatch<React.SetStateAction<File | null>>
  ) => {
    e.stopPropagation();
    setFile(null);
    if (inputRef1.current && setFile === setFile1) inputRef1.current.value = '';
    if (inputRef2.current && setFile === setFile2) inputRef2.current.value = '';
  };

  // Dosya boyutunu daha okunabilir formata dönüştür
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    else return (bytes / 1048576).toFixed(1) + ' MB';
  };

  const createDropZone = (
    file: File | null, 
    setFile: React.Dispatch<React.SetStateAction<File | null>>, 
    isDragging: boolean, 
    isDraggingSetter: React.Dispatch<React.SetStateAction<boolean>>, 
    inputRef: React.RefObject<HTMLInputElement>, 
    placeholder: string,
    error: string | null,
    setError: React.Dispatch<React.SetStateAction<string | null>>
  ) => (
    <div
      className={`drop-zone ${isDragging ? 'drag-over' : ''} ${file ? 'file-uploaded' : ''} ${error ? 'file-error' : ''}`}
      onDragEnter={(e) => handleDragEnter(e, isDraggingSetter)}
      onDragLeave={(e) => handleDragLeave(e, isDraggingSetter)}
      onDragOver={handleDragOver}
      onDrop={(e) => handleDrop(e, setFile, isDraggingSetter, setError)}
      onClick={() => inputRef.current?.click()}
      data-tauri-drag-region
      tabIndex={0}
      role="button"
      aria-label={`${file ? 'Dosya seçildi: ' + file.name : placeholder}`}
    >
      <input
        type="file"
        ref={inputRef}
        style={{ display: 'none' }}
        onChange={(e) => handleChange(e, setFile, setError)}
        accept={effectiveAllowedTypes.join(',')}
      />
      
      {file && (
        <button 
          className="clear-file-button" 
          onClick={(e) => handleClearFile(e, setFile)}
          title="Dosyayı Kaldır"
        >
          <FontAwesomeIcon icon={faTimes} />
        </button>
      )}
      
      <div className="drop-zone-body">
        {file ? (
          <div className="file-info">
            <FontAwesomeIcon 
              icon={faCheck} 
              size="2x" 
              className="success-icon" 
            />
            <p className="file-name" title={file.name}>{file.name}</p>
            <p className="file-size">{formatFileSize(file.size)}</p>
          </div>
        ) : (
          <div className="drop-zone-content">
            {error ? (
              <>
                <FontAwesomeIcon 
                  icon={faExclamationTriangle} 
                  size="2x" 
                  className="error-icon" 
                />
                <p className="error-message" title={error}>{error}</p>
              </>
            ) : isDragging ? (
              <>
                <FontAwesomeIcon 
                  icon={faFileAlt} 
                  size="2x" 
                  className="upload-icon drop-ready" 
                />
                <p className="drop-hint">Dosyayı bırakın</p>
              </>
            ) : (
              <>
                <FontAwesomeIcon 
                  icon={faUpload} 
                  size="2x" 
                  className="upload-icon" 
                />
                <p>{placeholder}</p>
                <p className="file-types-hint" title={`İzin verilen dosya türleri: ${effectiveAllowedTypes.join(', ')}`}>
                  İzin verilen türler: {effectiveAllowedTypes.slice(0, 3).join(', ')}
                  {effectiveAllowedTypes.length > 3 ? ' ve diğer ' + (effectiveAllowedTypes.length - 3) + ' tür' : ''}
                </p>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="file-upload-container" data-tauri-drag-region>
      {createDropZone(file1, setFile1, isDragging1, setIsDragging1, inputRef1, 'Dosya 1: Sürükle ve bırak veya seçmek için tıkla', error1, setError1)}
      <button
        className="compare-button"
        onClick={handleCompareClick}
        disabled={!file1 || !file2}
      >
        <FontAwesomeIcon icon={faExchangeAlt} className="button-icon" />
        Karşılaştır
      </button>
      {createDropZone(file2, setFile2, isDragging2, setIsDragging2, inputRef2, 'Dosya 2: Sürükle ve bırak veya seçmek için tıkla', error2, setError2)}
    </div>
  );
};

export default FileUpload;
