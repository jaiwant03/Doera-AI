import React, { useEffect, useRef, useState, useMemo } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './LocationMap.css';

import {
  MapPin,
  Maximize2,
  Minimize2,
  Sun,
  Moon,
  Compass,
  Navigation,
  Clock,
  Layers,
} from 'lucide-react';
import {
  createPlaceMarkerIcon,
  createWaypointIcon,
  createUserLocationIcon,
  buildPopupContent,
} from './MapMarker';
import { drawRouteOnMap } from './RouteVisualization';
import NearbyPlaces from './NearbyPlaces';

// 100% Free, keyless, and watermark-free OpenStreetMap tile layer
const TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

const LocationMap = ({ locationData, userLocation, defaultTileMode = 'standard' }) => {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const tileLayerRef = useRef(null);
  const markersRef = useRef([]);
  const routeRef = useRef(null);

  const [tileMode, setTileMode] = useState(defaultTileMode); // 'standard' (default natural color) | 'dark'
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selectedPlaceId, setSelectedPlaceId] = useState(null);

  const places = useMemo(() => {
    return Array.isArray(locationData?.places) ? locationData.places : [];
  }, [locationData]);

  const route = useMemo(() => {
    return locationData?.route || null;
  }, [locationData]);

  const hasRoute = Boolean(route && Array.isArray(route.coordinates) && route.coordinates.length > 0);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return; // Prevent double init

    const initialCenter = locationData?.center
      ? [locationData.center.lat, locationData.center.lng]
      : [11.0168, 76.9558]; // Default Coimbatore fallback

    const initialZoom = locationData?.zoom || (hasRoute ? 10 : places.length > 1 ? 12 : 14);

    const map = L.map(mapContainerRef.current, {
      center: initialCenter,
      zoom: initialZoom,
      zoomControl: false,
      attributionControl: false,
    });

    // Custom Luxury Zoom Control at top right
    L.control.zoom({ position: 'topright' }).addTo(map);

    // Initial Tile Layer using OpenStreetMap (zero watermark, no API key needed)
    const tileLayer = L.tileLayer(TILE_URL, {
      maxZoom: 19,
      subdomains: 'abc',
    }).addTo(map);

    tileLayerRef.current = tileLayer;
    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Render Markers and Polyline
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Clear previous markers
    markersRef.current.forEach((m) => {
      try {
        map.removeLayer(m);
      } catch (_) {}
    });
    markersRef.current = [];

    // Clear previous route
    if (routeRef.current) {
      routeRef.current.remove();
      routeRef.current = null;
    }

    const bounds = [];

    // 1. Draw Polyline Route if available
    if (hasRoute && route.coordinates) {
      const drawn = drawRouteOnMap(map, route.coordinates);
      routeRef.current = drawn;
      route.coordinates.forEach((coord) => bounds.push(coord));
    }

    // 2. Draw Place / Waypoint Markers
    places.forEach((place, index) => {
      if (typeof place.lat !== 'number' || typeof place.lng !== 'number') return;

      const isStart = place.category === 'START' || place.index === 'A';
      const isFinish = place.category === 'FINISH' || place.index === 'B';

      let icon;
      if (isStart) {
        icon = createWaypointIcon('A');
      } else if (isFinish) {
        icon = createWaypointIcon('B');
      } else {
        const markerIndex = place.index || index + 1;
        icon = createPlaceMarkerIcon(markerIndex, selectedPlaceId === place.id);
      }

      const marker = L.marker([place.lat, place.lng], { icon }).addTo(map);

      // Popup
      const popupHtml = buildPopupContent(place);
      marker.bindPopup(popupHtml, { maxWidth: 280, closeButton: false });

      marker.on('click', () => {
        setSelectedPlaceId(place.id);
      });

      marker._placeId = place.id;
      markersRef.current.push(marker);
      bounds.push([place.lat, place.lng]);
    });

    // 3. User Current Location Marker
    if (userLocation && typeof userLocation.lat === 'number' && typeof userLocation.lng === 'number') {
      const userMarker = L.marker([userLocation.lat, userLocation.lng], {
        icon: createUserLocationIcon(),
      }).addTo(map);
      userMarker.bindPopup(
        `<div class="doera-popup-card"><div class="doera-popup-title">📍 Your Location</div><div class="doera-popup-address">${userLocation.name || 'Current Device Position'}</div></div>`,
        { closeButton: false }
      );
      markersRef.current.push(userMarker);
      bounds.push([userLocation.lat, userLocation.lng]);
    }

    // Fit bounds automatically with padding
    if (bounds.length > 0) {
      try {
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
      } catch (_) {}
    }
  }, [places, hasRoute, route, userLocation, selectedPlaceId]);

  // Handle place selection from cards below
  const handleSelectPlace = (place) => {
    setSelectedPlaceId(place.id);
    const map = mapInstanceRef.current;
    if (!map || !place.lat || !place.lng) return;

    map.flyTo([place.lat, place.lng], Math.max(map.getZoom(), 14), {
      duration: 0.8,
    });

    const marker = markersRef.current.find((m) => m._placeId === place.id);
    if (marker) {
      marker.openPopup();
    }
  };

  // Recenter button
  const handleRecenter = () => {
    const map = mapInstanceRef.current;
    if (!map) return;
    const bounds = places.map((p) => [p.lat, p.lng]);
    if (bounds.length > 0) {
      map.fitBounds(bounds, { padding: [40, 40] });
    }
  };

  const mapTitle = hasRoute
    ? `Route: ${route.originName || 'Origin'} ➔ ${route.destinationName || 'Destination'}`
    : `${places.length} Verified Location${places.length === 1 ? '' : 's'} Discovered`;

  return (
    <div className={`doera-map-container ${tileMode === 'dark' ? 'theme-dark' : 'theme-light'} ${isFullscreen ? 'fullscreen' : ''}`}>
      {/* Header Controls */}
      <div className="doera-map-header">
        <div className="doera-map-title-wrap">
          <span className="doera-map-badge">
            <MapPin size={12} />
            {hasRoute ? 'Live Route' : 'Geographic Map'}
          </span>
          <h4 className="doera-map-title" title={mapTitle}>
            {mapTitle}
          </h4>
        </div>

        <div className="doera-map-controls">
          <button
            type="button"
            className="doera-map-btn"
            onClick={() => setTileMode((prev) => (prev === 'dark' ? 'standard' : 'dark'))}
            title={tileMode === 'dark' ? 'Switch to Standard OpenStreetMap' : 'Switch to Dark Luxury Map'}
          >
            {tileMode === 'dark' ? <Sun size={13} /> : <Moon size={13} />}
            <span style={{ fontSize: '11px' }}>{tileMode === 'dark' ? 'Light' : 'Dark'}</span>
          </button>

          <button
            type="button"
            className="doera-map-btn"
            onClick={handleRecenter}
            title="Recenter Map View"
          >
            <Compass size={13} />
          </button>

          <button
            type="button"
            className="doera-map-btn"
            onClick={() => {
              setIsFullscreen((prev) => !prev);
              setTimeout(() => {
                mapInstanceRef.current?.invalidateSize();
              }, 250);
            }}
            title={isFullscreen ? 'Exit Fullscreen' : 'Expand Fullscreen'}
          >
            {isFullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
          </button>
        </div>
      </div>

      {/* Route Overview Stat Banner */}
      {hasRoute && (
        <div className="doera-route-banner">
          <div className="doera-route-stat">
            <Navigation size={14} color="#F12D98" />
            <span>{route.distanceKm} km</span> Total Road Distance
          </div>
          <div className="doera-route-stat">
            <Clock size={14} color="#9C52E8" />
            <span>{route.durationFormatted}</span> Driving Time
          </div>
          <div style={{ fontSize: '11px', color: '#A795B1' }}>
            Routing Engine: Open Source Routing Machine (OSRM)
          </div>
        </div>
      )}

      {/* Leaflet Map Viewport */}
      <div ref={mapContainerRef} className="doera-map-viewport" />

      {/* Places Cards Grid beneath map */}
      {places.length > 0 && !hasRoute && (
        <NearbyPlaces
          places={places}
          selectedPlaceId={selectedPlaceId}
          onSelectPlace={handleSelectPlace}
        />
      )}
    </div>
  );
};

export default LocationMap;
