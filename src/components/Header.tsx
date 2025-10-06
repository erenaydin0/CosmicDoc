import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSun, faMoon, faCog, faGlobe, faDisplay, faChevronDown, faDesktop } from '@fortawesome/free-solid-svg-icons';
import { useTranslation } from 'react-i18next';
import CosmicLogo from './CosmicLogo';
import '../style/Header.css';

const THEME_STORAGE_KEY = 'synchdoc-theme-preference';

type ThemeOption = 'light' | 'dark' | 'system';

interface HeaderProps {}

const Header: React.FC<HeaderProps> = () => {
  const { t, i18n } = useTranslation();
  
  // Sistem temasını algıla
  const getSystemTheme = (): 'light' | 'dark' => {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  };

  const [themePreference, setThemePreference] = useState<ThemeOption>(
    () => {
      const savedTheme = localStorage.getItem(THEME_STORAGE_KEY) as ThemeOption;
      if (!savedTheme) {
        // İlk açılışta sistem temasını varsayılan olarak ayarla ve kaydet
        localStorage.setItem(THEME_STORAGE_KEY, 'system');
        return 'system';
      }
      return savedTheme;
    }
  );
  
  const [currentTheme, setCurrentTheme] = useState<'light' | 'dark'>(
    () => {
      const savedTheme = localStorage.getItem(THEME_STORAGE_KEY) as ThemeOption;
      if (!savedTheme) {
        // İlk açılışta sistem temasını uygula
        return getSystemTheme();
      }
      if (savedTheme === 'system') {
        return getSystemTheme();
      }
      return savedTheme as 'light' | 'dark';
    }
  );
  
  const [isRotating, setIsRotating] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isThemeMenuOpen, setIsThemeMenuOpen] = useState(false);
  const [currentLanguage, setCurrentLanguage] = useState<'tr' | 'en'>(i18n.language as 'tr' | 'en');
  const settingsRef = useRef<HTMLDivElement>(null);
  const themeRef = useRef<HTMLDivElement>(null);

  // İlk yüklemede HTML'e tema uygula
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', currentTheme);
    if (currentTheme === 'dark') {
      document.body.classList.add('dark');
    } else {
      document.body.classList.remove('dark');
    }
  }, [currentTheme]);

  // Sistem teması değişikliklerini izle ve gelişmiş algılama
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleSystemThemeChange = (e: MediaQueryListEvent) => {
      if (themePreference === 'system') {
        const newSystemTheme = e.matches ? 'dark' : 'light';
        setCurrentTheme(newSystemTheme);
        // HTML'e tema uygula - smooth geçiş için
        document.documentElement.style.transition = 'background-color 0.3s ease, color 0.3s ease';
        document.documentElement.setAttribute('data-theme', newSystemTheme);
        if (newSystemTheme === 'dark') {
          document.body.classList.add('dark');
        } else {
          document.body.classList.remove('dark');
        }
        
        // Transition'ı temizle
        setTimeout(() => {
          document.documentElement.style.transition = '';
        }, 300);
      }
    };

    // İlk yüklemede sistem temasını kontrol et
    if (themePreference === 'system') {
      const currentSystemTheme = getSystemTheme();
      if (currentTheme !== currentSystemTheme) {
        setCurrentTheme(currentSystemTheme);
      }
    }

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleSystemThemeChange);
    } else {
      // Eski tarayıcılar için fallback
      mediaQuery.addListener(handleSystemThemeChange);
    }

    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleSystemThemeChange);
      } else {
        mediaQuery.removeListener(handleSystemThemeChange);
      }
    };
  }, [themePreference, currentTheme]);

  // Tema tercihini localStorage'dan izle
  useEffect(() => {
    const handleStorageChange = () => {
      const savedTheme = localStorage.getItem(THEME_STORAGE_KEY) as ThemeOption;
      if (savedTheme && savedTheme !== themePreference) {
        setThemePreference(savedTheme);
        if (savedTheme === 'system') {
          setCurrentTheme(getSystemTheme());
        } else {
          setCurrentTheme(savedTheme as 'light' | 'dark');
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [themePreference]);

  // Menülerin dışarı tıklandığında kapanması
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(event.target as Node)) {
        setIsSettingsOpen(false);
      }
      if (themeRef.current && !themeRef.current.contains(event.target as Node)) {
        setIsThemeMenuOpen(false);
      }
    };

    if (isSettingsOpen || isThemeMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isSettingsOpen, isThemeMenuOpen]);

  const handleThemeChange = (selectedTheme: ThemeOption) => {
    
    setIsRotating(true);
    setThemePreference(selectedTheme);
    setIsThemeMenuOpen(false);
    
    // Tema tercihini localStorage'a kaydet
    localStorage.setItem(THEME_STORAGE_KEY, selectedTheme);
    
    // Yeni tema değerini belirle
    let newTheme: 'light' | 'dark';
    if (selectedTheme === 'system') {
      newTheme = getSystemTheme();
    } else {
      newTheme = selectedTheme;
    }
    
    // Animasyonlu tema değişimi
    setTimeout(() => {
      setCurrentTheme(newTheme);
      document.documentElement.setAttribute('data-theme', newTheme);
      if (newTheme === 'dark') {
        document.body.classList.add('dark');
      } else {
        document.body.classList.remove('dark');
      }
      
      // Rotasyon animasyonunu bitir
      setTimeout(() => {
        setIsRotating(false);
      }, 400);
    }, 200);
  };

  const handleSettingsToggle = () => {
    setIsSettingsOpen(!isSettingsOpen);
    setIsThemeMenuOpen(false);
  };

  const handleThemeMenuToggle = () => {
    setIsThemeMenuOpen(!isThemeMenuOpen);
  };

  const handleLanguageChange = (language: 'tr' | 'en') => {
    setCurrentLanguage(language);
    i18n.changeLanguage(language);
    setIsSettingsOpen(false);
  };

  const getThemeIcon = (theme: ThemeOption) => {
    switch (theme) {
      case 'light':
        return faSun;
      case 'dark':
        return faMoon;
      case 'system':
        return faDisplay;
      default:
        return faSun;
    }
  };

  const getThemeLabel = (theme: ThemeOption) => {
    switch (theme) {
      case 'light':
        return t('header.theme.light');
      case 'dark':
        return t('header.theme.dark');
      case 'system':
        return t('header.theme.system');
      default:
        return t('header.theme.light');
    }
  };

  return (
    <header className="app-header">
      <div className="logo-container">
        <Link to="/" className="logo-link">
          <CosmicLogo size={40} animated={true} />
          <div className="logo">CosmicDoc</div>
        </Link>
      </div>
      <div className="settings-container" ref={settingsRef}>
        <button 
          onClick={handleSettingsToggle} 
          className={`settings-button ${isSettingsOpen ? 'active' : ''}`}
          aria-label={t('header.settings')}
        >
          <FontAwesomeIcon 
            icon={faCog} 
            className="settings-icon" 
          />
        </button>
        
        {isSettingsOpen && (
          <div className="settings-menu">
            <div className="settings-item theme-dropdown-container" ref={themeRef}>
              <div className="theme-selector" onClick={handleThemeMenuToggle}>
                <FontAwesomeIcon 
                  icon={getThemeIcon(themePreference)} 
                  className={`theme-icon ${isRotating ? 'rotating' : ''}`}
                />
                <span>{getThemeLabel(themePreference)}</span>
                <FontAwesomeIcon 
                  icon={faChevronDown} 
                  className={`dropdown-arrow ${isThemeMenuOpen ? 'open' : ''}`}
                />
              </div>
              
              {isThemeMenuOpen && (
                <div className="theme-dropdown">
                  <div 
                    className={`theme-option ${themePreference === 'light' ? 'active' : ''}`}
                    onClick={() => handleThemeChange('light')}
                  >
                    <FontAwesomeIcon icon={faSun} className="theme-option-icon" />
                    <span>{t('header.theme.light')}</span>
                  </div>
                  <div 
                    className={`theme-option ${themePreference === 'dark' ? 'active' : ''}`}
                    onClick={() => handleThemeChange('dark')}
                  >
                    <FontAwesomeIcon icon={faMoon} className="theme-option-icon" />
                    <span>{t('header.theme.dark')}</span>
                  </div>
                  <div 
                    className={`theme-option ${themePreference === 'system' ? 'active' : ''}`}
                    onClick={() => handleThemeChange('system')}
                  >
                    <FontAwesomeIcon icon={faDesktop} className="theme-option-icon" />
                    <span>{t('header.theme.system')}</span>
                  </div>
                </div>
              )}
            </div>
            
            <div className="settings-item">
              <FontAwesomeIcon 
                icon={faGlobe} 
                className="language-icon"
              />
              <span>{t('header.language')}</span>
              <div className="language-options">
                <button 
                  className={`language-option ${currentLanguage === 'tr' ? 'active' : ''}`}
                  onClick={() => handleLanguageChange('tr')}
                >
                  TR
                </button>
                <button 
                  className={`language-option ${currentLanguage === 'en' ? 'active' : ''}`}
                  onClick={() => handleLanguageChange('en')}
                >
                  EN
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
