import React from 'react';

interface NoDiffMessageProps {
  message?: string;
}

/**
 * Dosyalar arasında fark olmadığında gösterilen mesaj bileşeni
 */
const NoDiffMessage: React.FC<NoDiffMessageProps> = ({ 
  message = "Dosyalar arasında fark bulunamadı." 
}) => {
  return (
      <p className="no-diff-message">{message}</p>
  );
};

export default NoDiffMessage;