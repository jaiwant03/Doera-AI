import React from 'react';
import '../styles/AmbientBackground.css';

/**
 * AmbientBackground
 * Atmospheric pink & magenta ambient glow exclusively for the main execution workspace.
 * Bathes the chat interface in DOERA AI's signature luxury dark pink shade.
 */
const AmbientBackground = () => {
  return (
    <div className="doera-ambient-workspace" aria-hidden="true">
      <div className="doera-ambient-pink-core" />
      <div className="doera-ambient-pink-orb orb-pink-top" />
      <div className="doera-ambient-pink-orb orb-pink-right" />
      <div className="doera-ambient-pink-orb orb-purple-bottom" />
      <div className="doera-ambient-pink-waves" />
    </div>
  );
};

export default AmbientBackground;
