import React from 'react';
import LocationResult from './LocationResult';

const NearbyPlaces = ({ places = [], selectedPlaceId, onSelectPlace }) => {
  if (!places || places.length === 0) return null;

  return (
    <div className="doera-map-places-grid">
      {places.map((place, idx) => (
        <LocationResult
          key={place.id || idx}
          place={place}
          index={idx + 1}
          isSelected={selectedPlaceId === place.id}
          onSelect={onSelectPlace}
        />
      ))}
    </div>
  );
};

export default NearbyPlaces;
