import React, { useEffect, useState } from 'react';
import './ThemeTransition.css';

interface ThemeTransitionProps {
  isTransitioning: boolean;
  currentTheme: 'light' | 'dark';
}

const ThemeTransition: React.FC<ThemeTransitionProps> = ({ isTransitioning, currentTheme }) => {
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

export default ThemeTransition; 