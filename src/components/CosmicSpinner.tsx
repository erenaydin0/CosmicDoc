'use client';

import React from 'react';

interface CosmicSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  message?: string;
}

export default function CosmicSpinner({ size = 'md', message }: CosmicSpinnerProps) {
  const sizeMap = {
    sm: { spinner: 24, orbit: 32, dot: 3 },
    md: { spinner: 40, orbit: 56, dot: 4 },
    lg: { spinner: 60, orbit: 80, dot: 6 }
  };

  const dimensions = sizeMap[size];

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column',
      alignItems: 'center', 
      justifyContent: 'center',
      gap: '1rem'
    }}>
      <div 
        style={{ 
          position: 'relative',
          width: dimensions.orbit,
          height: dimensions.orbit,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        {/* Outer rotating ring */}
        <div 
          className="cosmic-spinner-ring"
          style={{
            position: 'absolute',
            width: dimensions.orbit,
            height: dimensions.orbit,
            border: '2px solid transparent',
            borderTopColor: 'var(--status-primary)',
            borderRightColor: 'var(--status-warning)',
            borderRadius: '50%',
            animation: 'spin-cosmic 1.5s linear infinite'
          }}
        />

        {/* Middle rotating ring */}
        <div 
          className="cosmic-spinner-ring-middle"
          style={{
            position: 'absolute',
            width: dimensions.orbit * 0.75,
            height: dimensions.orbit * 0.75,
            border: '2px solid transparent',
            borderBottomColor: 'var(--status-purple)',
            borderLeftColor: 'var(--status-info)',
            borderRadius: '50%',
            animation: 'spin-cosmic-reverse 2s linear infinite'
          }}
        />

        {/* Inner pulsing core */}
        <div 
          style={{
            width: dimensions.spinner,
            height: dimensions.spinner,
            background: 'radial-gradient(circle, var(--status-warning) 0%, var(--status-primary) 100%)',
            borderRadius: '50%',
            animation: 'pulse-cosmic 1.5s ease-in-out infinite',
            boxShadow: '0 0 20px rgba(232, 149, 88, 0.5)'
          }}
        />

        {/* Orbiting particles */}
        <div 
          className="cosmic-particle-orbit"
          style={{
            position: 'absolute',
            width: dimensions.dot,
            height: dimensions.dot,
            background: 'var(--status-warning)',
            borderRadius: '50%',
            top: 0,
            left: '50%',
            marginLeft: -dimensions.dot / 2,
            animation: 'orbit-cosmic 1.5s linear infinite',
            boxShadow: '0 0 8px var(--status-warning)'
          }}
        />

        <div 
          className="cosmic-particle-orbit-2"
          style={{
            position: 'absolute',
            width: dimensions.dot,
            height: dimensions.dot,
            background: 'var(--status-purple)',
            borderRadius: '50%',
            bottom: 0,
            left: '50%',
            marginLeft: -dimensions.dot / 2,
            animation: 'orbit-cosmic 1.5s linear infinite 0.75s',
            boxShadow: '0 0 8px var(--status-purple)'
          }}
        />
      </div>

      {message && (
        <div style={{ 
          fontSize: size === 'sm' ? '0.875rem' : '1rem', 
          color: 'var(--text-secondary)',
          fontWeight: 500,
          textAlign: 'center',
          animation: 'fade-pulse 2s ease-in-out infinite'
        }}>
          {message}
        </div>
      )}

      <style jsx>{`
        @keyframes spin-cosmic {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        @keyframes spin-cosmic-reverse {
          from {
            transform: rotate(360deg);
          }
          to {
            transform: rotate(0deg);
          }
        }

        @keyframes pulse-cosmic {
          0%, 100% {
            transform: scale(1);
            opacity: 1;
          }
          50% {
            transform: scale(1.1);
            opacity: 0.8;
          }
        }

        @keyframes orbit-cosmic {
          from {
            transform: rotate(0deg) translateX(${dimensions.orbit / 2}px) rotate(0deg);
          }
          to {
            transform: rotate(360deg) translateX(${dimensions.orbit / 2}px) rotate(-360deg);
          }
        }

        @keyframes fade-pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }
      `}</style>
    </div>
  );
}
