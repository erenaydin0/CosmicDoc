import React, { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFileExcel, faFilePdf, faFileAlt, faSyncAlt } from '@fortawesome/free-solid-svg-icons';
import '../style/PageStyles.css';

interface RippleStyles {
  left: number;
  top: number;
  height: number;
  width: number;
}

const Home: React.FC = () => {
  const [ripples, setRipples] = useState<Record<string, RippleStyles[]>>({
    excel: [],
    pdf: [],
    text: [],
    convert: []
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
      <h1 className="page-title">SynchDoc ile Dokümanlarınızı Yönetin</h1>
      <p className="page-description">Dosyalarınızı karşılaştırın ve dönüştürün</p>
      
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
            <FontAwesomeIcon icon={faFileExcel} size="3x" />
          </div>
          <h2>Excel Karşılaştırma</h2>
          <p>İki Excel dosyasını karşılaştırın ve farkları hızlıca tespit edin.</p>
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
            <FontAwesomeIcon icon={faFilePdf} size="3x" />
          </div>
          <h2>PDF Karşılaştırma</h2>
          <p>PDF dosyalarınızı yan yana karşılaştırarak değişiklikleri görün.</p>
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
            <FontAwesomeIcon icon={faFileAlt} size="3x" />
          </div>
          <h2>Metin Karşılaştırma</h2>
          <p>İki metin dosyasını satır satır karşılaştırıp farkları analiz edin.</p>
        </Link>
        
        <Link 
          to="/file-convert" 
          className="card"
          onClick={e => createRipple(e, 'convert')}
        >
          {ripples.convert.map((style, i) => (
            <span key={i} className="ripple" style={style}></span>
          ))}
          <div className="icon-container convert-icon">
            <FontAwesomeIcon icon={faSyncAlt} size="3x" />
          </div>
          <h2>Dosya Dönüştür</h2>
          <p>Dosyalarınızı farklı formatlara hızlı ve güvenli şekilde dönüştürün.</p>
        </Link>
      </div>
    </div>
  );
};

export default Home;
