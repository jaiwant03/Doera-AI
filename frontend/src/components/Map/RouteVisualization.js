import L from 'leaflet';

/**
 * Draws luxury neon route polyline on Leaflet map
 */
export const drawRouteOnMap = (map, coordinates = []) => {
  if (!map || !Array.isArray(coordinates) || coordinates.length === 0) {
    return null;
  }

  // 1. Background Halo (soft purple blur glow)
  const glowLine = L.polyline(coordinates, {
    color: '#9C52E8',
    weight: 8,
    opacity: 0.35,
    lineCap: 'round',
    lineJoin: 'round',
  }).addTo(map);

  // 2. Foreground Core Line (vibrant neon pink/magenta)
  const coreLine = L.polyline(coordinates, {
    color: '#F12D98',
    weight: 4,
    opacity: 0.95,
    lineCap: 'round',
    lineJoin: 'round',
  }).addTo(map);

  return {
    glowLine,
    coreLine,
    remove: () => {
      try {
        map.removeLayer(glowLine);
        map.removeLayer(coreLine);
      } catch (_) {}
    },
  };
};
