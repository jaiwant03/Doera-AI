import React from 'react';
import NeuralLoading from './Chat/NeuralLoading';

/**
 * DoeraNeuralLoader — 3D Particle-Mesh Neural Intelligence Object
 * Fully updated to match Reference Image 2 (Third Phone).
 */
const DoeraNeuralLoader = (props) => {
  return <NeuralLoading {...props} mode={props.mode || 'full'} />;
};

export default DoeraNeuralLoader;
