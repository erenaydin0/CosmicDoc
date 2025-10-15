import React, { ReactNode } from 'react';
import { CSSTransition, SwitchTransition } from 'react-transition-group';
import { useLocation } from 'react-router-dom';
import '../App.css';

// Sayfa geçiş bileşeni için prop tipleri
interface PageTransitionProps {
  children: ReactNode;
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

export default PageTransition;