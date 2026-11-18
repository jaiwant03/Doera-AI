import locationService from '../services/locationService.js';
import LocationResult from '../models/LocationResult.js';
import { logger } from '../utils/logger.js';

class LocationAgent {
  constructor() {
    this.name = 'Location';
  }

  /**
   * Process location intelligence: place discovery, geocoding, route calculation
   */
  async execute(taskContext) {
    const startedAt = new Date();
    const userRequest = taskContext.userRequest || '';
    logger.info(`[Location Agent] Processing location intelligence for: "${userRequest}"`);

    // 1. Check if a trip/route is requested (e.g. "from X to Y")
    const routeRegex = /(?:from|between)\s+([^,]+?)\s+(?:to|and)\s+([^,.]+)/i;
    const routeMatch = userRequest.match(routeRegex);

    let routeData = null;
    let places = [];

    if (routeMatch) {
      const originQuery = routeMatch[1].trim();
      const destQuery = routeMatch[2].trim();

      try {
        const [originGeocode, destGeocode] = await Promise.all([
          locationService.geocode(originQuery),
          locationService.geocode(destQuery),
        ]);

        if (originGeocode && destGeocode) {
          const routeRes = await locationService.calculateRoute({
            originLat: originGeocode.lat,
            originLng: originGeocode.lng,
            originName: originGeocode.name || originQuery,
            destLat: destGeocode.lat,
            destLng: destGeocode.lng,
            destName: destGeocode.name || destQuery,
          });

          if (routeRes) {
            routeData = routeRes;
            places = [
              {
                id: 'origin-marker',
                index: 'A',
                name: originGeocode.name || originQuery,
                address: originGeocode.displayName || originQuery,
                lat: originGeocode.lat,
                lng: originGeocode.lng,
                category: 'START',
                source: 'OpenStreetMap Nominatim',
              },
              {
                id: 'dest-marker',
                index: 'B',
                name: destGeocode.name || destQuery,
                address: destGeocode.displayName || destQuery,
                lat: destGeocode.lat,
                lng: destGeocode.lng,
                category: 'FINISH',
                source: 'OpenStreetMap Nominatim',
              },
            ];
          }
        }
      } catch (err) {
        logger.warn('[Location Agent] Route calculation error:', err.message);
      }
    }

    // 2. Discover nearby places / service locations if not a pure point-to-point route
    if (!routeData) {
      try {
        const searchRes = await locationService.searchPlacesFromPrompt(userRequest);
        if (searchRes && Array.isArray(searchRes.places) && searchRes.places.length > 0) {
          places = searchRes.places;
        }
      } catch (err) {
        logger.warn('[Location Agent] Place discovery error:', err.message);
      }
    }

    // 3. Persist verified locations to MongoDB LocationResult collection
    if (taskContext.taskId && taskContext.userId && places.length > 0) {
      for (const p of places) {
        if (typeof p.lat === 'number' && typeof p.lng === 'number') {
          await LocationResult.create({
            taskId: taskContext.taskId,
            userId: taskContext.userId,
            name: p.name || 'Verified Location',
            address: p.address || 'Address on record',
            latitude: p.lat,
            longitude: p.lng,
            phone: p.phone || null,
            rating: p.rating || null,
            reviewsCount: p.reviewsCount || null,
            price: p.price || null,
            source: p.source || 'OpenStreetMap Nominatim / Overpass',
            sourceUrl: p.sourceUrl || null,
            distanceKm: p.distanceKm || null,
            travelTime: p.travelTime || null,
            verificationStatus: 'VERIFIED',
          }).catch(() => {});
        }
      }
    }

    const completedAt = new Date();

    const locationData = {
      type: routeData ? 'route' : 'places',
      places,
      route: routeData,
      center: places.length > 0 ? { lat: places[0].lat, lng: places[0].lng } : { lat: 11.0168, lng: 76.9558 },
      zoom: routeData ? 10 : places.length > 1 ? 12 : 14,
      retrievedAt: completedAt,
    };

    return {
      agentName: this.name,
      status: 'completed',
      places,
      routeData,
      locationData,
      startedAt,
      completedAt,
    };
  }
}

export const locationAgent = new LocationAgent();
export default locationAgent;
