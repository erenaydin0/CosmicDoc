import React from 'react';

const PdfIcon: React.FC<{ className?: string }> = ({ className = "" }) => {
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
        fill="url(#pdfGradient)"
      />
      
      {/* PDF dosya ikonu */}
      <rect 
        x="12" 
        y="8" 
        width="40" 
        height="48" 
        rx="4" 
        fill="white"
        stroke="#E2231A"
        strokeWidth="1.5"
      />
      
      {/* PDF yazısı */}
      <text 
        x="32" 
        y="28" 
        textAnchor="middle" 
        fill="#E2231A" 
        fontSize="12" 
        fontWeight="bold"
        fontFamily="Arial, sans-serif"
      >
        PDF
      </text>
      
      {/* PDF sembolü */}
      <path 
        d="M20 36h24v2H20v-2zm0 4h24v2H20v-2zm0 4h16v2H20v-2z" 
        fill="#E2231A"
      />
      
      {/* Köşe kıvrımı */}
      <path 
        d="M44 8v12h12" 
        stroke="#E2231A" 
        strokeWidth="1.5" 
        fill="none"
      />
      
      {/* Gradient tanımı */}
      <defs>
        <linearGradient id="pdfGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#E2231A" />
          <stop offset="100%" stopColor="#C41E17" />
        </linearGradient>
      </defs>
    </svg>
  );
};

export default PdfIcon;
