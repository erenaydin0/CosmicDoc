import React, { ReactNode, useEffect, useState } from 'react';
import { CSSTransition, SwitchTransition } from 'react-transition-group';
import { useLocation } from 'react-router-dom';
import '../style/TransitionEffects.css';

// Sayfa geçiş bileşeni için prop tipleri
interface PageTransitionProps {
  children: ReactNode;
}

// Tema geçiş bileşeni için prop tipleri
interface ThemeTransitionProps {
  isTransitioning: boolean;
  currentTheme: 'light' | 'dark';
}

/**
 * Sayfalar arası geçiş animasyonu bileşeni
 */
export const PageTransition: React.FC<PageTransitionProps> = ({ children }) => {
  const location = useLocation();
  
  return (
    <div className="page-transition-wrapper">
      <SwitchTransition mode="out-in">
        <CSSTransition
          key={location.pathname}
          timeout={300}
          classNames="page-transition"
        >
          <div key={location.pathname} className="page-transition-container">
            {children}
          </div>
        </CSSTransition>
      </SwitchTransition>
    </div>
  );
};

/**
 * Tema değişim animasyonu bileşeni
 */
export const ThemeTransition: React.FC<ThemeTransitionProps> = ({ isTransitioning, currentTheme }) => {
  const [showTransition, setShowTransition] = useState(false);

  useEffect(() => {
    if (isTransitioning) {
      setShowTransition(true);
      
      // Geçiş animasyonunu temizle
      const timeout = setTimeout(() => {
        setShowTransition(false);
      }, 800);

      return () => clearTimeout(timeout);
    }
  }, [isTransitioning]);

  if (!showTransition) return null;

  return (
    <div className={`theme-transition-overlay ${currentTheme === 'dark' ? 'to-dark' : 'to-light'}`}>
    </div>
  );
};

export default {
  PageTransition,
  ThemeTransition
};