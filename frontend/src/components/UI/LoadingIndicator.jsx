import React from 'react';
import AnimatedLogo from './AnimatedLogo';

/**
 * LoadingIndicator
 * DOERA AI — Cinematic AI Execution & Thinking Indicator
 * Displays rotating gradient ring, glowing particle aura, and live context-aware execution states.
 */
const LoadingIndicator = ({ 
  message = 'Understanding your request...', 
  size = 'md',
  subtext = 'Autonomous Agent Coordination'
}) => {
  const isSmall = size === 'sm';

  return (
    <div 
      className="doera-thinking-container animate-fadeIn"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: isSmall ? 10 : 14,
        padding: isSmall ? '4px 2px' : '8px 4px',
      }}
    >
      {/* 3D Geometric Animated Logo with Rotating Gradient Ring */}
      <div style={{ position: 'relative', flexShrink: 0 }}>
        <AnimatedLogo 
          size={isSmall ? 'sm' : 'md'} 
          state="thinking" 
          showAura={true} 
        />
      </div>

      {/* Context-aware dynamic text with animated shimmer */}
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span 
            style={{ 
              fontSize: isSmall ? 12 : 13.5, 
              fontWeight: 600, 
              color: 'var(--charcoal-dark)',
              letterSpacing: '-0.01em',
            }}
          >
            {message}
          </span>
          {/* Micro pulsating dots */}
          <span className="doera-typing-dots">
            <span />
            <span />
            <span />
          </span>
        </div>

        {subtext && (
          <span 
            style={{ 
              fontSize: 10.5, 
              color: 'var(--muted)', 
              fontWeight: 500,
              marginTop: 1,
              letterSpacing: '0.02em',
              textTransform: 'uppercase',
            }}
          >
            {subtext}
          </span>
        )}
      </div>
    </div>
  );
};

export default LoadingIndicator;
