import React from 'react';

const ExcelIcon: React.FC<{ className?: string }> = ({ className = "" }) => {
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
        fill="url(#excelGradient)"
      />
      
      {/* Excel dosya ikonu */}
      <rect 
        x="12" 
        y="8" 
        width="40" 
        height="48" 
        rx="4" 
        fill="white"
        stroke="#217346"
        strokeWidth="1.5"
      />
      
      {/* Excel X */}
      <path 
        d="M24 20h16v4H24v-4zm0 8h16v4H24v-4zm0 8h16v4H24v-4z" 
        fill="#217346"
      />
      
      {/* X harfi */}
      <path 
        d="M20 16l4 4 4-4h8v4l-4 4 4 4v4h-8l-4-4-4 4H8v-4l4-4-4-4v-4h8z" 
        fill="#217346"
        opacity="0.8"
      />
      
      {/* Gradient tanımı */}
      <defs>
        <linearGradient id="excelGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#217346" />
          <stop offset="100%" stopColor="#1a5d3a" />
        </linearGradient>
      </defs>
    </svg>
  );
};

export default ExcelIcon;
