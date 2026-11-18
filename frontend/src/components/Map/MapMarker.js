import L from 'leaflet';

/**
 * Creates custom DOERA luxury neon pink numbered pin icon
 */
export const createPlaceMarkerIcon = (index, isSelected = false) => {
  const label = typeof index === 'number' ? index : (index || '★');
  const activeClass = isSelected ? 'highlighted' : '';

  return L.divIcon({
    className: 'doera-custom-div-icon',
    html: `
      <div style="position: relative; width: 34px; height: 34px; display: flex; align-items: center; justify-content: center;">
        <div class="doera-pin-pulse"></div>
        <div class="doera-pin-marker ${activeClass}">
          ${label}
        </div>
      </div>
    `,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
    popupAnchor: [0, -20],
  });
};

/**
 * Creates route waypoint marker icon (Origin 'A' or Destination 'B')
 */
export const createWaypointIcon = (type = 'A') => {
  const isOrigin = type === 'A';
  const bg = isOrigin
    ? 'linear-gradient(135deg, #10B981 0%, #059669 100%)' // Emerald for start
    : 'linear-gradient(135deg, #F12D98 0%, #E11D48 100%)'; // Neon pink for finish

  return L.divIcon({
    className: 'doera-custom-div-icon',
    html: `
      <div style="position: relative; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;">
        <div style="width: 30px; height: 30px; border-radius: 50%; background: ${bg}; color: #FFF; font-weight: 800; font-size: 13px; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 16px rgba(241, 45, 152, 0.7); border: 2px solid #FFF;">
          ${type}
        </div>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -18],
  });
};

/**
 * Creates user location beacon
 */
export const createUserLocationIcon = () => {
  return L.divIcon({
    className: 'doera-custom-div-icon',
    html: `
      <div style="position: relative; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center;">
        <div style="position: absolute; width: 28px; height: 28px; border-radius: 50%; background: rgba(59, 130, 246, 0.4); animation: doeraPinPulse 2s infinite ease-out;"></div>
        <div class="doera-user-marker"></div>
      </div>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -14],
  });
};

/**
 * Builds HTML string for Leaflet Popup
 */
export const buildPopupContent = (place) => {
  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
    `${place.lat},${place.lng}`
  )}`;

  const ratingHtml = place.rating
    ? `<span class="doera-popup-rating">★ ${place.rating}${
        place.reviewsCount ? ` (${place.reviewsCount})` : ''
      }</span>`
    : '<span style="color:#8E7E95; font-size:11px;">Rating not verified</span>';

  const distanceHtml = place.distanceKm
    ? `<span style="color:#FF7BD5; font-weight:600;">🚗 ${place.distanceKm} km</span>`
    : '';

  const phoneHtml = place.phone
    ? `<div style="font-size:11px; color:#D3C4D6; margin-bottom:6px;">📞 <a href="tel:${place.phone}" style="color:#FF55BD; text-decoration:none;">${place.phone}</a></div>`
    : '';

  return `
    <div class="doera-popup-card">
      <div class="doera-popup-title">${place.name || 'Verified Location'}</div>
      <div class="doera-popup-address">${place.address || ''}</div>
      <div class="doera-popup-meta">
        ${ratingHtml}
        ${distanceHtml}
      </div>
      ${phoneHtml}
      <a href="${directionsUrl}" target="_blank" rel="noopener noreferrer" class="doera-popup-directions-btn">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <polygon points="3 11 22 2 13 21 11 13 3 11"/>
        </svg>
        Get Directions
      </a>
    </div>
  `;
};
