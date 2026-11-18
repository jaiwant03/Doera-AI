import React from 'react';
import NeuralLoading from './Chat/NeuralLoading';

/**
 * DoeraFullScreenLoader
 * Re-exports the 3D Neural Particle-Mesh Loader (Image 2 - Third Phone reference)
 * Zero artificial delay, context-aware intelligence messaging.
 */
const DoeraFullScreenLoader = ({
  isLoading,
  operationType = 'task',
  statusText,
  subText,
  progress,
  onCancel,
}) => {
  // Context-aware defaults if not passed explicitly
  const defaultStatus =
    statusText ||
    (operationType === 'research'
      ? 'Exploring information...'
      : operationType === 'execute'
      ? 'Turning intelligence into action...'
      : operationType === 'plan'
      ? 'Orchestrating intelligent agents...'
      : 'DOERA is thinking...');

  const defaultSub =
    subText ||
    (operationType === 'task'
      ? 'Coordinating specialized LangGraph agents...'
      : 'Synthesizing real-time results with verified outcomes...');

  return (
    <NeuralLoading
      isLoading={isLoading}
      mode="full"
      statusText={defaultStatus}
      subText={defaultSub}
      progress={progress}
      onCancel={onCancel}
    />
  );
};

export default DoeraFullScreenLoader;
