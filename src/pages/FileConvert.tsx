import React from 'react';
import { useTranslation } from 'react-i18next';

const FileConvert: React.FC = () => {
  const { t } = useTranslation();
  
  return (
    <div className="page-content">
      <h1>{t('convert.title')}</h1>
      <p className="page-description">{t('convert.description')}</p>
    </div>
  );
};

export default FileConvert;
