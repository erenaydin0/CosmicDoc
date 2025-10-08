import React from 'react';

const TextIcon: React.FC<{ className?: string }> = ({ className = "" }) => {
  return (
    <svg 
      className={className}
      viewBox="0 0 64 64" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Arka plan */}
      <rect 
        width="64" 
        height="64" 
        rx="12" 
        fill="url(#textGradient)"
      />
      
      {/* Text dosya ikonu */}
      <rect 
        x="12" 
        y="8" 
        width="40" 
        height="48" 
        rx="4" 
        fill="white"
        stroke="#2969B0"
        strokeWidth="1.5"
      />
      
      {/* Metin satırları */}
      <rect x="16" y="20" width="32" height="2" rx="1" fill="#2969B0" />
      <rect x="16" y="26" width="28" height="2" rx="1" fill="#2969B0" />
      <rect x="16" y="32" width="30" height="2" rx="1" fill="#2969B0" />
      <rect x="16" y="38" width="24" height="2" rx="1" fill="#2969B0" />
      <rect x="16" y="44" width="26" height="2" rx="1" fill="#2969B0" />
      
      {/* Dosya uzantısı */}
      <text 
        x="32" 
        y="58" 
        textAnchor="middle" 
        fill="#2969B0" 
        fontSize="8" 
        fontWeight="bold"
        fontFamily="Arial, sans-serif"
      >
        .txt
      </text>
      
      {/* Gradient tanımı */}
      <defs>
        <linearGradient id="textGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#2969B0" />
          <stop offset="100%" stopColor="#1e4a7c" />
        </linearGradient>
      </defs>
    </svg>
  );
};

export default TextIcon;
