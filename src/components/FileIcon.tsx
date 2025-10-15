import React from 'react';

export type FileType = 'excel' | 'pdf' | 'text';

interface FileIconProps {
  type: FileType;
  className?: string;
}

const FileIcon: React.FC<FileIconProps> = ({ type, className = '' }) => {
  const renderExcelIcon = () => (
    <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="64" height="64" rx="12" fill="url(#excelGradient)" />
      <rect x="12" y="8" width="40" height="48" rx="4" fill="white" stroke="#217346" strokeWidth="1.5" />
      <path d="M24 20h16v4H24v-4zm0 8h16v4H24v-4zm0 8h16v4H24v-4z" fill="#217346" />
      <path d="M20 16l4 4 4-4h8v4l-4 4 4 4v4h-8l-4-4-4 4H8v-4l4-4-4-4v-4h8z" fill="#217346" opacity="0.8" />
      <defs>
        <linearGradient id="excelGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#217346" />
          <stop offset="100%" stopColor="#1a5d3a" />
        </linearGradient>
      </defs>
    </svg>
  );

  const renderPdfIcon = () => (
    <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="64" height="64" rx="12" fill="url(#pdfGradient)" />
      <rect x="12" y="8" width="40" height="48" rx="4" fill="white" stroke="#E2231A" strokeWidth="1.5" />
      <text x="32" y="28" textAnchor="middle" fill="#E2231A" fontSize="12" fontWeight="bold" fontFamily="Arial, sans-serif">
        PDF
      </text>
      <path d="M20 36h24v2H20v-2zm0 4h24v2H20v-2zm0 4h16v2H20v-2z" fill="#E2231A" />
      <path d="M44 8v12h12" stroke="#E2231A" strokeWidth="1.5" fill="none" />
      <defs>
        <linearGradient id="pdfGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#E2231A" />
          <stop offset="100%" stopColor="#C41E17" />
        </linearGradient>
      </defs>
    </svg>
  );

  const renderTextIcon = () => (
    <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="64" height="64" rx="12" fill="url(#textGradient)" />
      <rect x="12" y="8" width="40" height="48" rx="4" fill="white" stroke="#2969B0" strokeWidth="1.5" />
      <rect x="16" y="20" width="32" height="2" rx="1" fill="#2969B0" />
      <rect x="16" y="26" width="28" height="2" rx="1" fill="#2969B0" />
      <rect x="16" y="32" width="30" height="2" rx="1" fill="#2969B0" />
      <rect x="16" y="38" width="24" height="2" rx="1" fill="#2969B0" />
      <rect x="16" y="44" width="26" height="2" rx="1" fill="#2969B0" />
      <text x="32" y="58" textAnchor="middle" fill="#2969B0" fontSize="8" fontWeight="bold" fontFamily="Arial, sans-serif">
        .txt
      </text>
      <defs>
        <linearGradient id="textGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#2969B0" />
          <stop offset="100%" stopColor="#1e4a7c" />
        </linearGradient>
      </defs>
    </svg>
  );

  switch (type) {
    case 'excel':
      return renderExcelIcon();
    case 'pdf':
      return renderPdfIcon();
    case 'text':
      return renderTextIcon();
    default:
      return null;
  }
};

export default FileIcon;

