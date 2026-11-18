import React, { useEffect, useRef } from 'react';
import './NeuralLoading.css';

/**
 * NeuralLoading — Premium 3D Organic Particle-Mesh Intelligence Visualizer
 * Inspired by Reference Image 2 (Third Phone).
 * Generates an organic, undulating 3D neural mesh of thousands of luminous
 * pink, magenta, and purple particles with flowing trajectories and specular highlights.
 *
 * Supports modes:
 * - 'full': Centered hero loader with contextual status text
 * - 'compact': Compact inline visual (~120px)
 * - 'inline': Mini animated badge (~36px)
 * - 'autonomous': Displays execution steps with dynamic context
 */
const NeuralLoading = ({
  isLoading = true,
  mode = 'full',
  statusText = 'DOERA is thinking...',
  subText = 'Orchestrating intelligent agents...',
  progress = null,
  onCancel = null
}) => {
  const canvasRef = useRef(null);
  const animFrameRef = useRef(null);

  useEffect(() => {
    if (!isLoading) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    // Detect reduced motion
    const prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;

    // Size canvas according to display DPR
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = canvas.getBoundingClientRect();
    const width = rect.width || (mode === 'full' ? 360 : mode === 'compact' ? 140 : 48);
    const height = rect.height || (mode === 'full' ? 360 : mode === 'compact' ? 140 : 48);

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    const centerX = width / 2;
    const centerY = height / 2;

    // Scale mesh radius to container
    const isFull = mode === 'full';
    const isCompact = mode === 'compact';
    const baseRadius = isFull ? 85 : isCompact ? 38 : 14;
    const tubeRadius = isFull ? 38 : isCompact ? 18 : 7;

    // Mesh resolution
    const segmentsU = isFull ? 54 : isCompact ? 36 : 22;
    const segmentsV = isFull ? 28 : isCompact ? 20 : 12;

    // Ambient floating particles
    const ambientCount = isFull ? 35 : 12;
    const ambientParticles = Array.from({ length: ambientCount }, () => ({
      x: (Math.random() - 0.5) * width * 0.9,
      y: (Math.random() - 0.5) * height * 0.9,
      z: (Math.random() - 0.5) * 200,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      radius: Math.random() * 1.6 + 0.6,
      alpha: Math.random() * 0.6 + 0.2,
      color: Math.random() > 0.5 ? '#FF55BD' : '#9C52E8',
    }));

    let startTime = performance.now();

    const render = (now) => {
      const elapsed = (now - startTime) * 0.001;
      const t = prefersReducedMotion ? 1.0 : elapsed;

      ctx.clearRect(0, 0, width, height);

      // 1. Central Volumetric Atmospheric Glow
      const glowRadius = baseRadius * (isFull ? 1.8 : 1.5);
      const aura = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, glowRadius);
      aura.addColorStop(0, 'rgba(245, 47, 168, 0.22)');
      aura.addColorStop(0.4, 'rgba(156, 82, 232, 0.12)');
      aura.addColorStop(0.8, 'rgba(197, 58, 159, 0.03)');
      aura.addColorStop(1, 'transparent');
      ctx.fillStyle = aura;
      ctx.beginPath();
      ctx.arc(centerX, centerY, glowRadius, 0, Math.PI * 2);
      ctx.fill();

      // 2. Compute 3D Deforming Parametric Mesh
      const breathing = 1 + Math.sin(t * 1.8) * 0.07;
      const bRad = baseRadius * breathing;
      const tRad = tubeRadius * breathing;

      // Gentle organic rotations
      const rotX = t * 0.45;
      const rotY = t * 0.65;
      const rotZ = t * 0.25;

      const cosX = Math.cos(rotX), sinX = Math.sin(rotX);
      const cosY = Math.cos(rotY), sinY = Math.sin(rotY);
      const cosZ = Math.cos(rotZ), sinZ = Math.sin(rotZ);

      const cameraDist = isFull ? 420 : 260;

      // Pre-compute projected vertices
      const grid = [];
      const projected = [];

      for (let i = 0; i < segmentsU; i++) {
        const u = (i / segmentsU) * Math.PI * 2;
        grid[i] = [];

        // Dynamic surface harmonics matching the organic shape in Reference Image 2
        const harmonic1 = Math.sin(u * 3 + t * 2.2) * 0.22;
        const harmonic2 = Math.cos(u * 2 - t * 1.6) * 0.16;

        for (let j = 0; j < segmentsV; j++) {
          const v = (j / segmentsV) * Math.PI * 2;

          const harmonic3 = Math.sin(v * 4 + t * 1.8) * 0.18;
          const localTube = tRad * (1 + harmonic1 + harmonic2 + harmonic3);

          // Toroidal parametric base with organic twist
          const rBase = bRad + localTube * Math.cos(v);
          const rawX = rBase * Math.cos(u);
          const rawY = rBase * Math.sin(u);
          const rawZ = localTube * Math.sin(v) + Math.sin(u * 2 + t * 1.4) * (bRad * 0.28);

          // 3D Matrix Rotation (Y -> X -> Z)
          const x1 = rawX * cosY + rawZ * sinY;
          const z1 = -rawX * sinY + rawZ * cosY;

          const y2 = rawY * cosX - z1 * sinX;
          const z2 = rawY * sinX + z1 * cosX;

          const x3 = x1 * cosZ - y2 * sinZ;
          const y3 = x1 * sinZ + y2 * cosZ;
          const z3 = z2;

          // Perspective projection
          const perspective = cameraDist / (cameraDist + z3);
          const screenX = centerX + x3 * perspective;
          const screenY = centerY + y3 * perspective;

          // Depth cueing (0 = far, 1 = near)
          const depthNorm = Math.max(0, Math.min(1, (z3 + bRad * 1.6) / (bRad * 3.2)));

          const vertex = {
            screenX,
            screenY,
            z3,
            depthNorm,
            perspective,
            u,
            v,
            indexU: i,
            indexV: j,
          };

          grid[i][j] = vertex;
          projected.push(vertex);
        }
      }

      // Sort by depth for correct 3D rendering order
      projected.sort((a, b) => a.z3 - b.z3);

      // 3. Draw Connecting Neural Strands (Curved Wireframe Lines)
      ctx.lineWidth = isFull ? 0.8 : 0.6;

      // Longitudinal strands (along U)
      for (let j = 0; j < segmentsV; j += 2) {
        ctx.beginPath();
        for (let i = 0; i <= segmentsU; i++) {
          const idx = i % segmentsU;
          const p = grid[idx][j];
          if (i === 0) {
            ctx.moveTo(p.screenX, p.screenY);
          } else {
            ctx.lineTo(p.screenX, p.screenY);
          }
        }
        // Depth-dependent color gradient for lines
        const midZ = grid[0][j].depthNorm;
        ctx.strokeStyle = `rgba(${Math.round(197 + 58 * midZ)}, ${Math.round(58 + 27 * midZ)}, ${Math.round(159 + 40 * midZ)}, ${0.12 + 0.24 * midZ})`;
        ctx.stroke();
      }

      // Ring strands (along V)
      for (let i = 0; i < segmentsU; i += 3) {
        ctx.beginPath();
        for (let j = 0; j <= segmentsV; j++) {
          const idx = j % segmentsV;
          const p = grid[i][idx];
          if (j === 0) {
            ctx.moveTo(p.screenX, p.screenY);
          } else {
            ctx.lineTo(p.screenX, p.screenY);
          }
        }
        const midZ = grid[i][0].depthNorm;
        ctx.strokeStyle = `rgba(${Math.round(156 + 99 * midZ)}, ${Math.round(82 + 3 * midZ)}, ${Math.round(232 - 43 * midZ)}, ${0.08 + 0.22 * midZ})`;
        ctx.stroke();
      }

      // 4. Draw Glowing Luminous Particles (Dots)
      for (let k = 0; k < projected.length; k++) {
        const p = projected[k];
        const d = p.depthNorm; // 0..1

        // Electric color shift based on depth and harmonic phase
        // Rear/far: Deep Purple (#9C52E8), Front/near: Electric Neon Pink (#FF55BD / #FFFFFF)
        const pulseHighlight = Math.sin(p.u * 3 + p.v * 2 + t * 3.5) > 0.7;

        let r, g, b, alpha, ptSize;

        if (pulseHighlight && d > 0.6) {
          // Specular traveling synapse spark
          r = 255;
          g = 220;
          b = 245;
          alpha = 0.95;
          ptSize = (isFull ? 2.4 : 1.6) * p.perspective;
        } else if (d > 0.5) {
          // Front neon pink
          r = Math.round(245 + 10 * d);
          g = Math.round(47 + 38 * d);
          b = Math.round(168 + 21 * d);
          alpha = 0.55 + 0.4 * d;
          ptSize = (isFull ? 1.8 : 1.3) * p.perspective;
        } else {
          // Rear rich purple
          r = Math.round(156 * (0.6 + 0.4 * d));
          g = Math.round(82 * (0.6 + 0.4 * d));
          b = Math.round(232 * (0.7 + 0.3 * d));
          alpha = 0.25 + 0.35 * d;
          ptSize = (isFull ? 1.2 : 0.9) * p.perspective;
        }

        ctx.beginPath();
        ctx.arc(p.screenX, p.screenY, Math.max(0.6, ptSize), 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
        ctx.fill();
      }

      // 5. Draw Ambient Floating Neural Dust Motes
      for (let a = 0; a < ambientParticles.length; a++) {
        const pt = ambientParticles[a];
        pt.x += pt.vx;
        pt.y += pt.vy;

        // Wrap around bounds
        const maxDist = width * 0.46;
        if (pt.x < -maxDist) pt.x = maxDist;
        if (pt.x > maxDist) pt.x = -maxDist;
        if (pt.y < -maxDist) pt.y = maxDist;
        if (pt.y > maxDist) pt.y = -maxDist;

        const pX = centerX + pt.x;
        const pY = centerY + pt.y;

        const particleAlpha = pt.alpha * (0.6 + 0.4 * Math.sin(t * 2 + a));

        ctx.beginPath();
        ctx.arc(pX, pY, pt.radius, 0, Math.PI * 2);
        ctx.fillStyle = pt.color === '#FF55BD'
          ? `rgba(255, 85, 189, ${particleAlpha})`
          : `rgba(156, 82, 232, ${particleAlpha})`;
        ctx.fill();
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [isLoading, mode]);

  if (!isLoading) return null;

  // Inline mode (small avatar / streaming indicator)
  if (mode === 'inline') {
    return (
      <div className="neural-inline-container" title={statusText}>
        <canvas ref={canvasRef} className="neural-canvas inline" />
        <span className="neural-inline-pulse-dot" />
      </div>
    );
  }

  // Compact mode (subtle widget above composer or inside message card)
  if (mode === 'compact') {
    return (
      <div className="neural-compact-container">
        <canvas ref={canvasRef} className="neural-canvas compact" />
        <div className="neural-compact-meta">
          <span className="neural-compact-status">{statusText}</span>
          {subText && <span className="neural-compact-sub">{subText}</span>}
        </div>
      </div>
    );
  }

  // Full Screen / Central Intelligence Mode (Exact Match to Image 2 Phone 3)
  return (
    <div className="neural-full-overlay animate-fadeIn">
      <div className="neural-full-container">
        {/* 3D Organic Particle Mesh Canvas */}
        <div className="neural-canvas-stage">
          <canvas ref={canvasRef} className="neural-canvas full" />
        </div>

        {/* Dynamic Contextual Intelligence Status Text */}
        <div className="neural-status-block">
          <h3 className="neural-status-title">{statusText}</h3>
          {subText && <p className="neural-status-sub">{subText}</p>}
        </div>

        {/* Optional Progress Indicator for Autonomous Tasks */}
        {progress !== null && (
          <div className="neural-progress-track">
            <div
              className="neural-progress-bar"
              style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
            />
          </div>
        )}

        {/* Optional Cancel Action */}
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="neural-cancel-btn"
            title="Cancel generation"
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
};

export default NeuralLoading;
