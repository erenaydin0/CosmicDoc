import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFile, faFilePdf, faFileExcel } from '@fortawesome/free-solid-svg-icons';
import { useTranslation } from 'react-i18next';
import '../style/PageStyles.css';

interface RippleStyles {
  left: number;
  top: number;
  height: number;
  width: number;
}

const Home: React.FC = () => {
  const { t } = useTranslation();
  const [ripples, setRipples] = useState<Record<string, RippleStyles[]>>({
    excel: [],
    pdf: [],
    text: []
  });

  // Ripple efekti için yardımcı fonksiyon
  const createRipple = (e: React.MouseEvent<HTMLAnchorElement>, cardType: string) => {
    const button = e.currentTarget;
    const diameter = Math.max(button.clientWidth, button.clientHeight);
    const radius = diameter / 2;
    
    const rect = button.getBoundingClientRect();
    
    const ripple: RippleStyles = {
      width: diameter,
      height: diameter,
      left: e.clientX - rect.left - radius,
      top: e.clientY - rect.top - radius
    };
    
    setRipples(prev => {
      // Yeni ripple ekleyip, 800ms sonra kaldıracak şekilde ayarla
      const newRipples = { ...prev };
      newRipples[cardType] = [...prev[cardType], ripple];
      
      setTimeout(() => {
        setRipples(current => {
          const updated = { ...current };
          updated[cardType] = current[cardType].filter(r => r !== ripple);
          return updated;
        });
      }, 800); // ripple animasyon süresiyle aynı olmalı
      
      return newRipples;
    });
  };

  return (
    <div className="page-content">
      <h1 className="page-title">{t('home.title')}</h1>
      <p className="page-description">{t('home.subtitle')}</p>
      
      <div className="card-container">
        <Link 
          to="/excel-compare" 
          className="card"
          onClick={e => createRipple(e, 'excel')}
        >
          {ripples.excel.map((style, i) => (
            <span key={i} className="ripple" style={style}></span>
          ))}
          <div className="icon-container excel-icon">
            <FontAwesomeIcon icon={faFileExcel} size="2x" />
          </div>
          <h2>{t('home.features.excel.title')}</h2>
          <p>{t('home.features.excel.description')}</p>
        </Link>
        
        <Link 
          to="/pdf-compare" 
          className="card"
          onClick={e => createRipple(e, 'pdf')}
        >
          {ripples.pdf.map((style, i) => (
            <span key={i} className="ripple" style={style}></span>
          ))}
          <div className="icon-container pdf-icon">
            <FontAwesomeIcon icon={faFilePdf} size="2x" />
          </div>
          <h2>{t('home.features.pdf.title')}</h2>
          <p>{t('home.features.pdf.description')}</p>
        </Link>
        
        <Link 
          to="/text-compare" 
          className="card"
          onClick={e => createRipple(e, 'text')}
        >
          {ripples.text.map((style, i) => (
            <span key={i} className="ripple" style={style}></span>
          ))}
          <div className="icon-container text-icon">
            <FontAwesomeIcon icon={faFile} size="2x" />
          </div>
          <h2>{t('home.features.text.title')}</h2>
          <p>{t('home.features.text.description')}</p>
        </Link>
        
      </div>
    </div>
  );
};

export default Home;
