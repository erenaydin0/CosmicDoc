import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSun, faMoon } from '@fortawesome/free-solid-svg-icons';
import '../style/Header.css';

const THEME_STORAGE_KEY = 'crossdoc-theme-preference';

interface HeaderProps {
  toggleTheme: () => void;
}

const Header: React.FC<HeaderProps> = ({ toggleTheme }) => {
  const location = useLocation();
  const pathnames = location.pathname.split('/').filter((x) => x);
  const [currentTheme, setCurrentTheme] = useState<'light' | 'dark'>(
    () => {
      // Önce localStorage'dan tema tercihini kontrol et
      const savedTheme = localStorage.getItem(THEME_STORAGE_KEY) as 'light' | 'dark';
      if (savedTheme) {
        return savedTheme;
      }
      
      // Eğer localStorage'da tema yoksa, HTML data-theme özelliğini kontrol et
      const htmlTheme = document.documentElement.getAttribute('data-theme') as 'light' | 'dark';
      if (htmlTheme) {
        return htmlTheme;
      }
      
      // Hiçbir tercih bulunamadıysa varsayılan olarak 'light' tema kullan
      return 'light';
    }
  );
  const [isRotating, setIsRotating] = useState(false);

  // Tema değişikliklerini izle
  useEffect(() => {
    const handleStorageChange = () => {
      const savedTheme = localStorage.getItem(THEME_STORAGE_KEY) as 'light' | 'dark';
      if (savedTheme && savedTheme !== currentTheme) {
        setCurrentTheme(savedTheme);
      }
    };

    // Storage event'ini dinle (farklı sekmelerde senkronizasyon için)
    window.addEventListener('storage', handleStorageChange);
    
    // Cleanup
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [currentTheme]);

  const handleThemeToggle = () => {
    setIsRotating(true);
    setTimeout(() => {
      toggleTheme();
      setCurrentTheme(prevTheme => {
        const newTheme = prevTheme === 'light' ? 'dark' : 'light';
        return newTheme;
      });
      setTimeout(() => {
        setIsRotating(false);
      }, 300); // Animasyon bittikten sonra rotating durumunu sıfırla
    }, 300); // Dönme animasyonu tamamlandığında tema değişimi yap
  };

  const getPageName = (path: string) => {
    switch (path) {
      case 'excel-compare':
        return 'Excel Karşılaştırma';
      case 'pdf-compare':
        return 'PDF Karşılaştırma';
      case 'text-compare':
        return 'Metin Karşılaştırma';
      case 'file-convert':
        return 'Dosya Dönüştür';
      default:
        return '';
    }
  };

  return (
    <header className="app-header">
      <div className="logo-container">
        <Link to="/" className="logo-link">
          <div className="logo">CROSSDOC</div>
        </Link>
        <div className="breadcrumbs">
          {pathnames.map((value, index) => {
            const to = `/${pathnames.slice(0, index + 1).join('/')}`;
            const pageName = getPageName(value);
            return (
              <span key={to}>
                <Link to={to}>{'> ' + pageName}</Link>
              </span>
            );
          })}
        </div>
      </div>
      <button 
        onClick={handleThemeToggle} 
        className={`theme-toggle-button ${isRotating ? 'rotating' : ''}`}
        aria-label={currentTheme === 'light' ? 'Karanlık temaya geç' : 'Aydınlık temaya geç'}
      >
        <FontAwesomeIcon 
          icon={currentTheme === 'light' ? faSun : faMoon} 
          className="theme-icon" 
        />
      </button>
    </header>
  );
};

export default Header;
