import React, { useEffect, useRef } from 'react';

/**
 * AuthPinkBackground
 * Renders the EXACT same 3D Cerebrium Curved Ribbon Arches background as the Landing Page.
 * Includes:
 * - 3 Concentric curved 3D ribbon arches
 * - Foremost arch with dynamic traveling white-hot neon pink laser beam
 * - Beam head specular flare orb & trailing sparks
 * - Ambient volumetric deep magenta nebula
 * - Ambient floating dust motes & mouse parallax
 */
const AuthPinkBackground = () => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    const animState = {
      t: 0.15,
      speed: 0.0032,
      charge: 0,
      mouseX: 0,
      mouseY: 0,
      targetMouseX: 0,
      targetMouseY: 0,
      sparks: [],
      dust: []
    };

    const handleMouseMove = (e) => {
      animState.targetMouseX = (e.clientX - width / 2) * 0.05;
      animState.targetMouseY = (e.clientY - height / 2) * 0.05;
    };
    window.addEventListener('mousemove', handleMouseMove);

    // Initialize ambient floating dust motes
    const dustCount = 45;
    for (let i = 0; i < dustCount; i++) {
      animState.dust.push({
        x: Math.random() * width,
        y: Math.random() * height,
        r: Math.random() * 1.6 + 0.6,
        vx: (Math.random() - 0.5) * 0.3,
        vy: -Math.random() * 0.4 - 0.1,
        alpha: Math.random() * 0.6 + 0.2
      });
    }

    // Helper: Parametric 3D Arch Curve Calculation (Exact match to Landing Page)
    const getArchPoint = (u, zOffset, pX, pY) => {
      const x0 = width * (0.94 - zOffset * 0.13) + pX * (1 - zOffset * 0.3);
      const y0 = height * 1.15 + pY * (1 - zOffset * 0.3);

      const x1 = width * (0.86 - zOffset * 0.14) + pX;
      const y1 = height * 0.22 + pY;

      const x2 = width * (0.64 - zOffset * 0.16) + pX;
      const y2 = height * 0.20 + pY;

      const x3 = width * (0.42 - zOffset * 0.20) + pX;
      const y3 = height * 1.20 + pY;

      // Cubic Bezier interpolation
      const inv = 1 - u;
      const x = inv * inv * inv * x0 + 3 * inv * inv * u * x1 + 3 * inv * u * u * x2 + u * u * u * x3;
      const y = inv * inv * inv * y0 + 3 * inv * inv * u * y1 + 3 * inv * u * u * y2 + u * u * u * y3;
      return { x, y };
    };

    // Render loop
    const render = () => {
      const state = animState;

      // Smooth mouse parallax lerp
      state.mouseX += (state.targetMouseX - state.mouseX) * 0.05;
      state.mouseY += (state.targetMouseY - state.mouseY) * 0.05;

      // Advance beam progression
      state.t = (state.t + state.speed) % 1;

      // Clear dark void canvas (exact landing page background #060309)
      ctx.fillStyle = '#060309';
      ctx.fillRect(0, 0, width, height);

      // 1. Ambient Volumetric Deep Magenta Nebula
      const glowX = width * 0.72 + state.mouseX;
      const glowY = height * 0.55 + state.mouseY;
      const nebulaRadius = Math.max(width, height) * 0.65;
      const nebula = ctx.createRadialGradient(glowX, glowY, 50, glowX, glowY, nebulaRadius);
      nebula.addColorStop(0, 'rgba(142, 29, 114, 0.44)');
      nebula.addColorStop(0.35, 'rgba(241, 45, 152, 0.18)');
      nebula.addColorStop(0.7, 'rgba(30, 8, 25, 0.45)');
      nebula.addColorStop(1, 'transparent');
      ctx.fillStyle = nebula;
      ctx.fillRect(0, 0, width, height);

      // 2. Ambient Floating Dust Motes
      state.dust.forEach((d) => {
        d.x += d.vx;
        d.y += d.vy;
        if (d.y < -10) d.y = height + 10;
        if (d.x < -10) d.x = width + 10;
        if (d.x > width + 10) d.x = -10;

        ctx.beginPath();
        ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 180, 220, ${d.alpha * 0.65})`;
        ctx.fill();
      });

      // 3. Render 3 Concentric Curved 3D Ribbon Arches
      const arches = [
        { z: 1.8, ribbonWidth: 54, alpha: 0.35, colorDark: '#230419', colorLight: '#460B32' },
        { z: 1.0, ribbonWidth: 70, alpha: 0.65, colorDark: '#350626', colorLight: '#68114D' },
        { z: 0.0, ribbonWidth: 86, alpha: 1.0,  colorDark: '#4A0836', colorLight: '#8E1D72', isFore: true }
      ];

      arches.forEach((arch) => {
        const steps = 60;
        const outerPoints = [];
        const innerPoints = [];

        for (let i = 0; i <= steps; i++) {
          const u = i / steps;
          const p = getArchPoint(u, arch.z, state.mouseX, state.mouseY);
          outerPoints.push(p);

          // Calculate normal displacement for 3D ribbon thickness
          const du = 0.01;
          const pNext = getArchPoint(Math.min(1, u + du), arch.z, state.mouseX, state.mouseY);
          const dx = pNext.x - p.x;
          const dy = pNext.y - p.y;
          const len = Math.sqrt(dx * dx + dy * dy) || 1;
          const nx = -dy / len;
          const ny = dx / len;

          innerPoints.push({
            x: p.x + nx * arch.ribbonWidth,
            y: p.y + ny * arch.ribbonWidth
          });
        }

        // Draw 3D Ribbon Body
        ctx.beginPath();
        ctx.moveTo(outerPoints[0].x, outerPoints[0].y);
        for (let i = 1; i <= steps; i++) {
          ctx.lineTo(outerPoints[i].x, outerPoints[i].y);
        }
        for (let i = steps; i >= 0; i--) {
          ctx.lineTo(innerPoints[i].x, innerPoints[i].y);
        }
        ctx.closePath();

        const ribbonGrad = ctx.createLinearGradient(
          outerPoints[0].x, outerPoints[0].y,
          outerPoints[steps].x, outerPoints[steps].y
        );
        ribbonGrad.addColorStop(0, arch.colorDark);
        ribbonGrad.addColorStop(0.3, arch.colorLight);
        ribbonGrad.addColorStop(0.7, arch.colorDark);
        ribbonGrad.addColorStop(1, '#10020D');

        ctx.fillStyle = ribbonGrad;
        ctx.globalAlpha = arch.alpha;
        ctx.fill();

        // Top Outer Specular Bevel Rim
        ctx.beginPath();
        ctx.moveTo(outerPoints[0].x, outerPoints[0].y);
        for (let i = 1; i <= steps; i++) {
          ctx.lineTo(outerPoints[i].x, outerPoints[i].y);
        }
        ctx.strokeStyle = arch.isFore ? 'rgba(241, 45, 152, 0.45)' : 'rgba(142, 29, 114, 0.25)';
        ctx.lineWidth = 4;
        ctx.stroke();

        // 4. Foremost Arch: Dynamic Traveling White-Hot Neon Laser Beam
        if (arch.isFore) {
          const beamSpan = 0.22; // beam length along curve
          const headU = state.t;
          const tailU = Math.max(0, headU - beamSpan);

          // Sample beam path
          const beamSteps = 30;
          ctx.beginPath();
          let started = false;

          for (let b = 0; b <= beamSteps; b++) {
            const currentU = tailU + (b / beamSteps) * (headU - tailU);
            if (currentU >= 0 && currentU <= 1) {
              const bp = getArchPoint(currentU, arch.z, state.mouseX, state.mouseY);
              if (!started) {
                ctx.moveTo(bp.x, bp.y);
                started = true;
              } else {
                ctx.lineTo(bp.x, bp.y);
              }
            }
          }

          if (started) {
            // Outer Neon Pink Atmospheric Bloom
            ctx.shadowColor = '#F12D98';
            ctx.shadowBlur = 42;
            ctx.strokeStyle = 'rgba(241, 45, 152, 0.88)';
            ctx.lineWidth = 15;
            ctx.lineCap = 'round';
            ctx.stroke();

            // Core White-Hot Laser Center
            ctx.shadowColor = '#FFFFFF';
            ctx.shadowBlur = 18;
            ctx.strokeStyle = '#FFFFFF';
            ctx.lineWidth = 4.5;
            ctx.stroke();

            ctx.shadowBlur = 0; // reset
          }

          // Beam Head Specular Flare
          const headPt = getArchPoint(headU, arch.z, state.mouseX, state.mouseY);
          const flareRadius = 26;
          const flare = ctx.createRadialGradient(headPt.x, headPt.y, 0, headPt.x, headPt.y, flareRadius);
          flare.addColorStop(0, '#FFFFFF');
          flare.addColorStop(0.3, '#FF8CCB');
          flare.addColorStop(0.7, 'rgba(241, 45, 152, 0.6)');
          flare.addColorStop(1, 'transparent');

          ctx.beginPath();
          ctx.arc(headPt.x, headPt.y, flareRadius, 0, Math.PI * 2);
          ctx.fillStyle = flare;
          ctx.fill();

          // Spawn trailing sparks
          if (Math.random() < 0.35) {
            state.sparks.push({
              x: headPt.x,
              y: headPt.y,
              vx: (Math.random() - 0.5) * 4 - 2,
              vy: (Math.random() - 0.5) * 4 + 1,
              life: 1.0,
              decay: Math.random() * 0.04 + 0.02,
              size: Math.random() * 3 + 1
            });
          }
        }
      });

      // 5. Render Particle Sparks
      for (let s = state.sparks.length - 1; s >= 0; s--) {
        const spark = state.sparks[s];
        spark.x += spark.vx;
        spark.y += spark.vy;
        spark.life -= spark.decay;

        if (spark.life <= 0) {
          state.sparks.splice(s, 1);
          continue;
        }

        ctx.beginPath();
        ctx.arc(spark.x, spark.y, spark.size * spark.life, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 230, 245, ${spark.life})`;
        ctx.shadowColor = '#F12D98';
        ctx.shadowBlur = 8;
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      ctx.globalAlpha = 1.0;
      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 1,
      }}
      aria-hidden="true"
    />
  );
};

export default AuthPinkBackground;
