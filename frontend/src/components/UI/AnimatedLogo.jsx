import React from 'react';

/**
 * AnimatedLogo — DOERA Kinetic Möbius Nexus
 * An equilateral (1:1) brand emblem with identical horizontal and vertical length.
 * Features dual continuous interlocking kinetic wings with Peacock Blue (#087F8C),
 * Emerald Green (#15966A), Electric Cyan (#00B4D8), and Royal Violet (#8065D9).
 */
const AnimatedLogo = ({ 
  size = 'md', 
  state = 'idle', // 'idle' | 'thinking' | 'executing'
  className = '',
  showAura = true,
  withWordmark = false,
}) => {
  const sizeMap = {
    xs: 20,
    sm: 28,
    md: 36,
    lg: 52,
    xl: 72,
    massive: 480,
  };

  const dim = typeof size === 'number' ? size : (sizeMap[size] || 36);
  const isLarge = size === 'lg' || size === 'xl' || size === 'massive';
  const isHero = size === 'xl' || size === 'massive';

  return (
    <div
      className={`doera-logo-wrapper ${className}`}
      style={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        gap: withWordmark ? (isLarge ? 12 : 8) : 0,
        flexShrink: 0,
      }}
    >
      <div
        style={{
          position: 'relative',
          width: dim,
          height: dim,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        {/* 1. Ambient Radial Glow Aura (Equilateral circle behind emblem) */}
        {showAura && (
          <div
            aria-hidden="true"
            style={{
              position: 'absolute',
              inset: isHero ? '-30%' : '-20%',
              borderRadius: '50%',
              background: state === 'thinking'
                ? 'radial-gradient(circle, rgba(241, 45, 152, 0.45) 0%, rgba(142, 29, 114, 0.28) 40%, rgba(255, 77, 184, 0.18) 70%, transparent 80%)'
                : 'radial-gradient(circle, rgba(241, 45, 152, 0.28) 0%, rgba(142, 29, 114, 0.18) 45%, rgba(255, 77, 184, 0.08) 70%, transparent 80%)',
              filter: isHero ? 'blur(22px)' : 'blur(12px)',
              animation: state === 'thinking' ? 'pulseAura 1.4s ease-in-out infinite' : 'floatBreathing 4s ease-in-out infinite',
              pointerEvents: 'none',
            }}
          />
        )}

        {/* 2. Intelligent Processing Orbit Ring (Active only when thinking/executing) */}
        {(state === 'thinking' || state === 'executing') && (
          <div
            aria-hidden="true"
            style={{
              position: 'absolute',
              inset: '-16%',
              borderRadius: '50%',
              border: '2px solid transparent',
              background: 'linear-gradient(135deg, #F12D98, #FF4DB8, #8E1D72, transparent) border-box',
              WebkitMask: 'linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0)',
              WebkitMaskComposite: 'xor',
              maskComposite: 'exclude',
              animation: 'spinClockwise 1.6s linear infinite',
              pointerEvents: 'none',
              filter: 'drop-shadow(0 0 8px rgba(241, 45, 152, 0.5))',
            }}
          />
        )}

        {/* 3. The Equilateral DOERA Kinetic Nexus SVG (Exact 1:1 Aspect Ratio) */}
        <svg
          viewBox="0 0 100 100"
          width={dim}
          height={dim}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{
            overflow: 'visible',
            animation: isHero ? 'floatGentle 4.5s ease-in-out infinite' : undefined,
          }}
        >
          <defs>
            {/* Upper Hemisphere Flow: Deep Magenta -> Neon Pink -> Bright Pink */}
            <linearGradient id={`doeraEquiUpper_${size}`} x1="0%" y1="50%" x2="100%" y2="50%">
              <stop offset="0%" stopColor="#8E1D72" />
              <stop offset="60%" stopColor="#F12D98" />
              <stop offset="100%" stopColor="#FF4DB8" />
            </linearGradient>

            {/* Lower Hemisphere Flow: Bright Pink -> Neon Pink -> Deep Magenta */}
            <linearGradient id={`doeraEquiLower_${size}`} x1="100%" y1="50%" x2="0%" y2="50%">
              <stop offset="0%" stopColor="#FF4DB8" />
              <stop offset="50%" stopColor="#F12D98" />
              <stop offset="100%" stopColor="#8E1D72" />
            </linearGradient>

            {/* Center Interlace Accent: Magenta to Bright Pink */}
            <linearGradient id={`doeraEquiNexus_${size}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#8E1D72" />
              <stop offset="100%" stopColor="#FF8CCB" />
            </linearGradient>

            {/* Specular Highlight Curve */}
            <linearGradient id={`doeraEquiSpec_${size}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.8" />
              <stop offset="60%" stopColor="#FFFFFF" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
            </linearGradient>

            {/* Elevation Drop Shadow */}
            <filter id={`doeraEquiShadow_${size}`} x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="3" stdDeviation="5" floodColor="#F12D98" floodOpacity="0.4" />
              <feDropShadow dx="0" dy="1" stdDeviation="2.5" floodColor="#8E1D72" floodOpacity="0.3" />
            </filter>
          </defs>

          <g filter={`url(#doeraEquiShadow_${size})`}>
            {/* Wing Alpha: Upper Equilateral Kinetic Flow */}
            <path
              d="M 14 50 C 14 30.1 30.1 14 50 14 C 69.9 14 86 30.1 86 50 C 86 62 76 72 62 72 C 50 72 42 62 46 48 C 49 38 60 34 68 40"
              stroke={`url(#doeraEquiUpper_${size})`}
              strokeWidth="10.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Wing Beta: Lower Equilateral Kinetic Flow (180° Rotational Inversion) */}
            <path
              d="M 86 50 C 86 69.9 69.9 86 50 86 C 30.1 86 14 69.9 14 50 C 14 38 24 28 38 28 C 50 28 58 38 54 52 C 51 62 40 66 32 60"
              stroke={`url(#doeraEquiLower_${size})`}
              strokeWidth="10.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Center Interwoven Nexus (Violet Harmonic Bridge) */}
            <path
              d="M 40 44 C 44 38 56 38 60 44 C 64 50 58 60 50 60 C 42 60 38 54 42 46"
              stroke={`url(#doeraEquiNexus_${size})`}
              strokeWidth="4"
              strokeLinecap="round"
              strokeOpacity="0.9"
            />

            {/* Specular Ridge Arc */}
            <path
              d="M 22 42 C 24 30 34 20 48 18"
              stroke={`url(#doeraEquiSpec_${size})`}
              strokeWidth="2.5"
              strokeLinecap="round"
            />
          </g>
        </svg>
      </div>

      {/* Optional Wordmark */}
      {withWordmark && (
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <span
            style={{
              fontFamily: 'var(--font-heading)',
              fontWeight: 800,
              fontSize: isLarge ? 18 : 15,
              letterSpacing: '-0.03em',
              color: '#FFFFFF',
            }}
          >
            DOERA
          </span>
          <span
            style={{
              fontSize: isLarge ? 10 : 9,
              fontWeight: 800,
              letterSpacing: '0.06em',
              padding: '2px 6px',
              borderRadius: '9999px',
              background: 'rgba(241, 45, 152, 0.15)',
              color: '#F12D98',
              border: '1px solid rgba(241, 45, 152, 0.35)',
            }}
          >
            AI
          </span>
        </div>
      )}
    </div>
  );
};

export default AnimatedLogo;
