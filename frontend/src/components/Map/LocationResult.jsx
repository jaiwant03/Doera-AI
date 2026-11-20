import React from 'react';
import { Navigation, Star, Phone, ExternalLink } from 'lucide-react';

const LocationResult = ({ place, index, isSelected, onSelect }) => {
  if (!place) return null;

  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
    `${place.lat},${place.lng}`
  )}`;

  return (
    <div
      className={`doera-place-card ${isSelected ? 'active' : ''}`}
      onClick={() => onSelect && onSelect(place)}
    >
      <div className="doera-place-top">
        <div className="doera-place-badge">
          {place.index || index || '★'}
        </div>
        <div className="doera-place-info">
          <h4 className="doera-place-name" title={place.name}>
            {place.name}
          </h4>
          <p className="doera-place-addr">
            {place.address}
          </p>
          {place.phone && (
            <p style={{ fontSize: '11px', color: '#FF7BD5', marginTop: '3px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Phone size={11} /> {place.phone}
            </p>
          )}
        </div>
      </div>

      <div className="doera-place-footer">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span
            style={{
              fontSize: '10px',
              fontWeight: 700,
              padding: '2px 6px',
              borderRadius: '4px',
              letterSpacing: '0.4px',
              textTransform: 'uppercase',
              background: place.dataSource === 'DEMO DATA' ? 'rgba(156, 82, 232, 0.15)' : 'rgba(16, 185, 129, 0.15)',
              color: place.dataSource === 'DEMO DATA' ? '#C084FC' : '#34D399',
              border: `1px solid ${place.dataSource === 'DEMO DATA' ? 'rgba(156, 82, 232, 0.35)' : 'rgba(16, 185, 129, 0.35)'}`,
            }}
          >
            {place.dataSource === 'DEMO DATA' ? 'DEMO DATA' : 'REAL SOURCE-BASED LOCATION'}
          </span>

          {place.suitability && (
            <span
              style={{
                fontSize: '10px',
                fontWeight: 700,
                padding: '2px 6px',
                borderRadius: '4px',
                letterSpacing: '0.4px',
                background: place.suitability === 'HIGH' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                color: place.suitability === 'HIGH' ? '#10B981' : '#F59E0B',
                border: `1px solid ${place.suitability === 'HIGH' ? 'rgba(16, 185, 129, 0.4)' : 'rgba(245, 158, 11, 0.4)'}`,
              }}
            >
              {place.suitability === 'HIGH' ? 'HIGH MATCH' : (place.suitability === 'MODERATE' ? 'MODERATE MATCH' : 'GENERAL SERVICE')}
            </span>
          )}

          {place.rating ? (
            <span style={{ color: '#FBBF24', display: 'flex', alignItems: 'center', gap: '3px', fontWeight: 600 }}>
              <Star size={12} fill="#FBBF24" />
              {place.rating}
              {place.reviewsCount ? ` (${place.reviewsCount})` : ''}
            </span>
          ) : (
            <span style={{ color: '#887491', fontSize: '10.5px' }}>OSM Verified</span>
          )}

          {place.distanceKm && (
            <span className="doera-place-dist">
              🚗 {place.distanceKm} km
            </span>
          )}
        </div>

        <a
          href={directionsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="doera-directions-link"
          onClick={(e) => e.stopPropagation()}
        >
          <Navigation size={12} />
          Directions
        </a>
      </div>
    </div>
  );
};

export default LocationResult;
