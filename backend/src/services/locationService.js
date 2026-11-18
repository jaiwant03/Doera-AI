import axios from 'axios';
import placesAdapter from '../integrations/placesAdapter.js';
import { logger } from '../utils/logger.js';

class LocationService {
  constructor() {
    this.nominatimBase = 'https://nominatim.openstreetmap.org';
    this.osrmBase = 'https://router.project-osrm.org';
    this.userAgent = 'DOERA-AI-Autonomous-Agent/3.0 (contact@doera.ai)';
  }

  /**
   * Geocode a place name or address using OpenStreetMap Nominatim
   */
  async geocode(query) {
    if (!query || typeof query !== 'string') return null;

    try {
      const clean = query.trim().replace(/^in\s+|^near\s+|^around\s+/i, '');
      const url = `${this.nominatimBase}/search?format=json&q=${encodeURIComponent(clean)}&limit=1&addressdetails=1`;
      
      const res = await axios.get(url, {
        headers: { 'User-Agent': this.userAgent, Accept: 'application/json' },
        timeout: 8000,
      });

      if (!res.data || res.data.length === 0) {
        return null;
      }

      const place = res.data[0];
      const address = place.address || {};
      const cityName =
        address.city ||
        address.town ||
        address.village ||
        address.suburb ||
        address.county ||
        address.state_district ||
        clean;

      return {
        lat: parseFloat(place.lat),
        lng: parseFloat(place.lon),
        name: place.name || clean,
        displayName: place.display_name,
        city: cityName,
        state: address.state || null,
        country: address.country || null,
      };
    } catch (err) {
      logger.warn(`[Location Service] Geocoding failed for "${query}":`, err.message);
      return null;
    }
  }

  /**
   * Reverse geocode coordinates to get human-readable location
   */
  async reverseGeocode(lat, lng) {
    if (lat === undefined || lng === undefined) return null;

    try {
      const url = `${this.nominatimBase}/reverse?format=json&lat=${lat}&lon=${lng}&zoom=14&addressdetails=1`;
      const res = await axios.get(url, {
        headers: { 'User-Agent': this.userAgent, Accept: 'application/json' },
        timeout: 8000,
      });

      if (!res.data) return null;

      const place = res.data;
      const address = place.address || {};
      const name =
        address.city ||
        address.town ||
        address.suburb ||
        address.village ||
        place.display_name?.split(',')[0] ||
        'Current Location';

      return {
        lat: parseFloat(lat),
        lng: parseFloat(lng),
        name,
        displayName: place.display_name,
        city: address.city || address.town || null,
        state: address.state || null,
      };
    } catch (err) {
      logger.warn(`[Location Service] Reverse geocoding failed for (${lat}, ${lng}):`, err.message);
      return null;
    }
  }

  /**
   * Calculate real road route using Open Source Routing Machine (OSRM)
   * Mode: 'driving' | 'walking' | 'cycling'
   */
  async calculateRoute({ origin, destination, mode = 'driving' }) {
    if (!origin || !destination) return null;
    const originLat = origin.lat;
    const originLng = origin.lng;
    const destLat = destination.lat;
    const destLng = destination.lng;

    if (
      originLat === undefined ||
      originLng === undefined ||
      destLat === undefined ||
      destLng === undefined
    ) {
      return null;
    }

    const safeMode = ['driving', 'walking', 'cycling'].includes(mode) ? mode : 'driving';

    try {
      // OSRM coordinate order: {lng},{lat};{lng},{lat}
      const osrmUrl = `${this.osrmBase}/route/v1/${safeMode}/${originLng},${originLat};${destLng},${destLat}?overview=full&geometries=geojson&steps=true`;
      
      const res = await axios.get(osrmUrl, { timeout: 12000 });
      if (!res.data || !res.data.routes || res.data.routes.length === 0) {
        logger.warn('[Location Service] No route found between points.');
        return null;
      }

      const route = res.data.routes[0];
      const distanceKm = parseFloat((route.distance / 1000).toFixed(1));
      const durationSeconds = Math.round(route.duration);
      const durationMinutes = Math.round(durationSeconds / 60);

      const hours = Math.floor(durationMinutes / 60);
      const mins = durationMinutes % 60;
      let durationFormatted = '';
      if (hours > 0) {
        durationFormatted = `${hours}h ${mins}m`;
      } else {
        durationFormatted = `${mins} mins`;
      }

      // GeoJSON coordinates are [lng, lat] -> convert to Leaflet [lat, lng] format
      const rawCoordinates = route.geometry?.coordinates || [];
      const coordinates = rawCoordinates.map((coord) => [coord[1], coord[0]]);

      // Extract maneuver steps
      const steps = [];
      const leg = route.legs?.[0];
      if (leg && Array.isArray(leg.steps)) {
        for (const s of leg.steps.slice(0, 10)) {
          const type = s.maneuver?.type || 'turn';
          const modifier = s.maneuver?.modifier ? ` ${s.maneuver.modifier}` : '';
          const street = s.name ? ` onto ${s.name}` : '';
          const dist = s.distance > 0 ? ` (${(s.distance / 1000).toFixed(1)} km)` : '';
          const instruction = `${type}${modifier}${street}${dist}`;
          steps.push(instruction.charAt(0).toUpperCase() + instruction.slice(1));
        }
      }

      return {
        originName: origin.name || 'Origin',
        destinationName: destination.name || 'Destination',
        origin: { lat: originLat, lng: originLng, name: origin.name || 'Origin' },
        destination: { lat: destLat, lng: destLng, name: destination.name || 'Destination' },
        distanceKm,
        durationSeconds,
        durationMinutes,
        durationFormatted,
        mode: safeMode,
        coordinates,
        steps,
      };
    } catch (err) {
      logger.warn('[Location Service] Route calculation failed:', err.message);
      return null;
    }
  }

  /**
   * Detect trip planning or route calculation intent
   * e.g., "Plan a trip from Coimbatore to Ooty", "Directions from Chennai to Bangalore", "Drive from A to B"
   */
  detectTripIntent(text) {
    if (!text || typeof text !== 'string') return null;
    const lower = text.toLowerCase();

    // Check for keywords indicating route or trip
    const hasTripKeywords =
      lower.includes('trip') ||
      lower.includes('route') ||
      lower.includes('drive') ||
      lower.includes('directions') ||
      lower.includes('travel from') ||
      lower.includes('distance from') ||
      lower.includes('how to reach') ||
      lower.includes('journey from');

    if (!hasTripKeywords) return null;

    // Pattern 1: from [Origin] to [Destination]
    const fromToMatch = text.match(/(?:from|between)\s+([a-zA-Z\s]+?)\s+(?:to|and)\s+([a-zA-Z\s]+?)(?:[.,!?]|$|\s+by|\s+in\s+my|\s+for)/i);
    if (fromToMatch && fromToMatch[1] && fromToMatch[2]) {
      const from = fromToMatch[1].trim();
      const to = fromToMatch[2].trim();
      if (from.length >= 2 && to.length >= 2) {
        return { isRoute: true, from, to };
      }
    }

    // Pattern 2: plan a trip to [Destination] from [Origin]
    const toFromMatch = text.match(/(?:trip|travel|directions|route|drive)\s+to\s+([a-zA-Z\s]+?)\s+from\s+([a-zA-Z\s]+?)(?:[.,!?]|$)/i);
    if (toFromMatch && toFromMatch[1] && toFromMatch[2]) {
      const to = toFromMatch[1].trim();
      const from = toFromMatch[2].trim();
      if (from.length >= 2 && to.length >= 2) {
        return { isRoute: true, from, to };
      }
    }

    return null;
  }

  /**
   * Detect location search intent (finding places, services, hospitals, doctors, etc.)
   */
  detectLocationIntent(text) {
    if (!text || typeof text !== 'string') return null;
    const lower = text.toLowerCase();

    const placeKeywords = [
      'hospital', 'clinic', 'doctor', 'cardiolog', 'dentist', 'dermatolog', 'pediatric',
      'electrician', 'plumber', 'carpenter', 'painter', 'cleaning',
      'restaurant', 'cafe', 'hotel', 'resort', 'pharmacy',
      'repair', 'service center', 'store', 'shop', 'atm', 'bank',
      'places to visit', 'tourist', 'attractions'
    ];

    const hasPlaceKeyword = placeKeywords.some((k) => lower.includes(k));
    const hasSearchKeyword =
      lower.includes('find') ||
      lower.includes('search') ||
      lower.includes('near') ||
      lower.includes('in ') ||
      lower.includes('around') ||
      lower.includes('closest') ||
      lower.includes('locate') ||
      lower.includes('show me');

    return hasPlaceKeyword && hasSearchKeyword;
  }

  /**
   * Calculate driving/walking distance between user location and multiple places
   */
  async computeDistances(origin, places = [], mode = 'driving') {
    if (!origin || !origin.lat || !origin.lng || !Array.isArray(places) || places.length === 0) {
      return places;
    }

    const updated = [];
    for (const p of places) {
      if (p.location?.lat && p.location?.lng) {
        try {
          const route = await this.calculateRoute({
            origin,
            destination: { lat: p.location.lat, lng: p.location.lng, name: p.businessName },
            mode,
          });

          if (route) {
            updated.push({
              ...p,
              distanceKm: route.distanceKm,
              travelTime: route.durationFormatted,
              travelMode: mode,
            });
            continue;
          }
        } catch (_) {}
      }
      updated.push(p);
    }
    return updated;
  }

  /**
   * Search places from user conversational prompt
   */
  async searchPlacesFromPrompt(text, userLocation = null) {
    if (!text || typeof text !== 'string') return { center: null, places: [] };

    // 1. Extract target location
    let location = userLocation?.city || '';
    const inMatch = text.match(/\b(?:in|at|near|around|for)\s+([A-Za-z]+(?:\s+[A-Za-z]+)?)\b/i);
    if (inMatch && inMatch[1]) {
      const candidate = inMatch[1].trim();
      const nonLocations = ['me', 'approval', 'three', 'verified', 'service', 'best', 'my', 'quotations', 'appointment', 'charges'];
      if (!nonLocations.includes(candidate.toLowerCase())) {
        location = candidate;
      }
    }
    if (!location) {
      location = 'Coimbatore'; // Default fallback city
    }

    // 2. Extract service / place query
    let query = 'services';
    const lower = text.toLowerCase();
    if (lower.includes('electrician') || lower.includes('electrical')) query = 'electrician';
    else if (lower.includes('cardiolog') || lower.includes('heart')) query = 'cardiologist';
    else if (lower.includes('doctor') || lower.includes('clinic')) query = 'clinic';
    else if (lower.includes('hospital')) query = 'hospital';
    else if (lower.includes('plumber') || lower.includes('plumbing')) query = 'plumber';
    else if (lower.includes('restaurant') || lower.includes('food')) query = 'restaurant';
    else if (lower.includes('cafe')) query = 'cafe';
    else if (lower.includes('hotel')) query = 'hotel';
    else if (lower.includes('repair')) query = 'repair';
    else if (lower.includes('laptop')) query = 'laptop repair';

    try {
      const providers = await placesAdapter.searchServices({
        query,
        location,
      });

      const places = (providers || []).map((p, idx) => ({
        id: p._id ? String(p._id) : `place-${idx + 1}`,
        index: idx + 1,
        name: p.businessName || p.name || `Provider ${idx + 1}`,
        address: p.address || 'Address verified on OpenStreetMap',
        phone: p.phone || null,
        rating: p.rating || null,
        reviewsCount: p.reviewsCount || null,
        lat: p.location?.lat,
        lng: p.location?.lng,
        source: p.source || 'OpenStreetMap Nominatim',
        sourceUrl: p.sourceUrl || null,
        dataSource: p.dataSource || 'REAL SOURCE-BASED LOCATION',
        distanceKm: p.distanceKm || null,
        travelTime: p.travelTime || null,
      })).filter(p => typeof p.lat === 'number' && typeof p.lng === 'number');

      let center = null;
      if (places.length > 0) {
        const avgLat = places.reduce((sum, p) => sum + p.lat, 0) / places.length;
        const avgLng = places.reduce((sum, p) => sum + p.lng, 0) / places.length;
        center = { lat: avgLat, lng: avgLng };
      }

      return { center, places };
    } catch (err) {
      logger.warn('[Location Service] searchPlacesFromPrompt failed:', err.message);
      return { center: null, places: [] };
    }
  }
}

export const locationService = new LocationService();
export default locationService;
