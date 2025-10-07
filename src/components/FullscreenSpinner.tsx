import React from 'react';
import CosmicSpinner from './CosmicSpinner';

interface FullscreenSpinnerProps {
  message: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const FullscreenSpinner: React.FC<FullscreenSpinnerProps> = ({ 
  message, 
  size = 'xl' 
}) => {
  return (
    <div className="fullscreen-cosmic-spinner">
      <CosmicSpinner size={size} />
      <div className="loading-message">{message}</div>
    </div>
  );
};

export default FullscreenSpinner;
