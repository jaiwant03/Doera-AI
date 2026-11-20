import React from 'react';
import '../styles/AmbientBackground.css';

/**
 * AmbientBackground
 * Subtle animated ambient lighting exclusively for the main execution workspace.
 * Features soft peacock blue, Rama green, and light violet radial aura drifts on a pure white canvas.
 */
const AmbientBackground = () => {
  return (
    <div className="doera-ambient-workspace" aria-hidden="true">
      <div className="doera-ambient-orb orb-peacock" />
      <div className="doera-ambient-orb orb-green" />
      <div className="doera-ambient-orb orb-violet" />
      <div className="doera-ambient-waves" />
    </div>
  );
};

export default AmbientBackground;
