import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSun, faMoon } from '@fortawesome/free-solid-svg-icons';
import '../style/Header.css';

const THEME_STORAGE_KEY = 'synchdoc-theme-preference';

interface HeaderProps {
  toggleTheme: () => void;
  isThemeTransitioning?: boolean;
}

const Header: React.FC<HeaderProps> = ({ toggleTheme, isThemeTransitioning = false }) => {
  // const location = useLocation(); // Kaldırıldı
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

    // Storage event'ini dinle (farklı sekmelarda senkronizasyon için)
    window.addEventListener('storage', handleStorageChange);
    
    // Cleanup
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [currentTheme]);

  const handleThemeToggle = () => {
    // Tema geçişi devam ediyorsa tıklamayı engelle
    if (isThemeTransitioning) return;
    
    setIsRotating(true);
    
    // Rotasyon animasyonunu başlat ve tema değişikliğini çağır
    setTimeout(() => {
      toggleTheme();
      setCurrentTheme(prevTheme => {
        const newTheme = prevTheme === 'light' ? 'dark' : 'light';
        return newTheme;
      });
      
      // Rotasyon animasyonunu bitir
      setTimeout(() => {
        setIsRotating(false);
      }, 400);
    }, 200);
  };

  return (
    <header className="app-header">
      <div className="logo-container">
        <Link to="/" className="logo-link">
          <div className="logo">SYNCHDOC</div>
        </Link>
      </div>
      <button 
        onClick={handleThemeToggle} 
        className={`theme-toggle-button ${isRotating ? 'rotating' : ''} ${isThemeTransitioning ? 'transitioning' : ''}`}
        disabled={isThemeTransitioning}
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
