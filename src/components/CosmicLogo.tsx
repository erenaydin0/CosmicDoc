import '../style/CosmicLogo.css';

interface CosmicLogoProps {
  size?: number;
  animated?: boolean;
}

export default function CosmicLogo({ size = 32, animated = true }: CosmicLogoProps) {
  return (
    <div 
      style={{ 
        width: size, 
        height: size, 
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{
          filter: 'drop-shadow(0 0 8px rgba(232, 149, 88, 0.3))'
        }}
      >
        {/* Outer ring - cosmic orbit */}
        <circle
          cx="50"
          cy="50"
          r="45"
          stroke="url(#gradient1)"
          strokeWidth="2"
          fill="none"
          opacity="0.6"
          className={animated ? 'cosmic-logo-rotate' : ''}
        />
        
        {/* Middle ring */}
        <circle
          cx="50"
          cy="50"
          r="35"
          stroke="url(#gradient2)"
          strokeWidth="1.5"
          fill="none"
          opacity="0.4"
          className={animated ? 'cosmic-logo-rotate-reverse' : ''}
        />
        
        {/* Inner core - planet/star */}
        <circle
          cx="50"
          cy="50"
          r="20"
          fill="url(#gradientCore)"
          className={animated ? 'cosmic-logo-pulse' : ''}
        />
        
        {/* Central Diamond Shape */}
        <g className={animated ? 'cosmic-logo-pulse' : ''}>
          <path
            d="M 50 30 L 70 50 L 50 70 L 30 50 Z"
            fill="url(#gradientDiamond)"
            stroke="var(--bg-primary)"
            strokeWidth="2"
          />
          {/* Inner diamond for depth */}
          <path
            d="M 50 38 L 62 50 L 50 62 L 38 50 Z"
            fill="var(--bg-primary)"
            opacity="0.3"
          />
        </g>
        
        {/* Small orbiting dots - satellites */}
        <circle
          cx="50"
          cy="5"
          r="3"
          fill="var(--status-warning)"
          opacity="0.8"
          className={animated ? 'cosmic-logo-orbit' : ''}
        />
        
        <circle
          cx="95"
          cy="50"
          r="2.5"
          fill="var(--status-purple)"
          opacity="0.7"
          className={animated ? 'cosmic-logo-orbit-slow' : ''}
        />
        
        {/* Gradients */}
        <defs>
          <linearGradient id="gradient1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--status-primary)" stopOpacity="0.8" />
            <stop offset="50%" stopColor="var(--status-warning)" stopOpacity="0.6" />
            <stop offset="100%" stopColor="var(--status-purple)" stopOpacity="0.8" />
          </linearGradient>
          
          <linearGradient id="gradient2" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="var(--status-purple)" stopOpacity="0.6" />
            <stop offset="100%" stopColor="var(--status-primary)" stopOpacity="0.6" />
          </linearGradient>
          
          <radialGradient id="gradientCore">
            <stop offset="0%" stopColor="var(--status-warning)" />
            <stop offset="100%" stopColor="var(--status-primary)" />
          </radialGradient>
          
          <linearGradient id="gradientDiamond" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--status-warning)" />
            <stop offset="50%" stopColor="var(--status-primary)" />
            <stop offset="100%" stopColor="var(--status-purple)" />
          </linearGradient>
        </defs>
      </svg>

    </div>
  );
}
