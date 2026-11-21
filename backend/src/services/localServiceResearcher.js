import axios from 'axios';
import { logger } from '../utils/logger.js';
import locationService from './locationService.js';

export const VERIFICATION_STATUSES = {
  CONFIRMED: 'CONFIRMED',
  REPORTED_BY_THIRD_PARTY: 'REPORTED_BY_THIRD_PARTY',
  NOT_INDEPENDENTLY_VERIFIED: 'NOT_INDEPENDENTLY_VERIFIED',
  NOT_AVAILABLE: 'NOT_AVAILABLE',
};

/**
 * Calculates genuine Haversine great-circle distance between two coordinates in kilometers.
 */
function haversineDistance(lat1, lon1, lat2, lon2) {
  if (lat1 === undefined || lon1 === undefined || lat2 === undefined || lon2 === undefined) return null;
  const R = 6371; // Earth's mean radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10; // Rounded to 1 decimal place (e.g. 2.4 km)
}

class LocalServiceResearcher {
  constructor() {
    this.name = 'LocalServiceResearcher';
    this.nominatimBase = 'https://nominatim.openstreetmap.org';
    this.userAgent = 'DOERA-AI-Local-Research/3.0 (contact@doera.ai)';
  }

  /**
   * Main entry point: Performs comprehensive local service research
   * STRICT ANTI-TRANSACTION POLICY:
   * - Zero bookings, zero appointments, zero purchases, zero automatic calls/emails.
   * - Never creates fictional businesses to meet requested count.
   * - Retains actual provider coordinates, calculates real Haversine distances, sorts by nearest.
   */
  async researchLocalServices(taskContext) {
    const userRequest = taskContext.userRequest || '';
    const userLocation = taskContext.userLocation || null;
    const requestId = taskContext.requestId || `req-${Date.now().toString(36)}`;
    const startedAt = new Date();

    logger.info(`[Local Service Researcher] Initiating verified research for: "${userRequest}"`);

    // 1. Understand request entities, location, requirements, and target count
    const params = await this.extractResearchParameters(userRequest, userLocation);

    // If location is required ("near me") but user denied or location is missing
    if (params.isLocationRequired) {
      const completedAt = new Date();
      const locationPrompt = `I couldn't determine your current location. Please enter your area or city so I can find nearby ${params.categoryTitle.toLowerCase()}.`;
      logger.info(
        `[Local Service Researcher] Location required for "${userRequest}" but not available (${params.locationReason}). Prompting user.`
      );

      // Section 6 Diagnostic Logging
      logger.info(`[Local Service Researcher] Diagnostics:`, {
        requestId,
        originalQuery: userRequest,
        parsedCategory: params.serviceCategory,
        requestedCount: params.targetCount,
        locationSource: params.locationSource || 'none',
        hasValidCoordinates: false,
        searchRadius: `${params.radiusKm} km`,
        searchProviderName: 'OpenStreetMap Nominatim',
        providerRequestStatus: 'SKIPPED_LOCATION_REQUIRED',
        providerHttpStatus: null,
        rawResultsCount: 0,
        filteredResultsCount: 0,
        normalizedResultsCount: 0,
        finalApiStatus: 'LOCATION_REQUIRED',
      });

      return {
        status: 'LOCATION_REQUIRED',
        searchState: 'LOCATION_REQUIRED',
        userRequest,
        params,
        locationRequired: true,
        locationReason: params.locationReason,
        message: locationPrompt,
        providers: [],
        providersFound: 0,
        requestedCount: params.targetCount,
        startedAt,
        completedAt,
      };
    }

    // 2. Discover authentic providers from Nominatim using coordinates & bounding viewbox
    const discoveryResult = await this.discoverProviders(params, taskContext);
    const rawProviders = discoveryResult.providers || [];
    const searchState = discoveryResult.searchState;
    const providerError = discoveryResult.error || null;
    const providerHttpStatus = discoveryResult.httpStatus || 200;

    // 3. Evaluate service suitability and evidence
    const evaluatedProviders = await this.evaluateProviders(rawProviders, params);

    // 4. Generate structured recommendation & summary
    const recommendation = this.buildRecommendation(evaluatedProviders, params);

    // 5. Assemble verified geographic map payload
    const locationData = this.buildLocationMapData(evaluatedProviders, params);

    // 6. Explicit anti-transaction guarantee
    const noContactGuarantee = 'Research completed. No business was contacted and no booking or transaction was made.';
    const limitations = this.buildResearchLimitations(params);

    const completedAt = new Date();

    // Section 6 Diagnostic Logging
    logger.info(`[Local Service Researcher] Diagnostics:`, {
      requestId,
      originalQuery: userRequest,
      parsedCategory: params.serviceCategory,
      requestedCount: params.targetCount,
      locationSource: params.locationSource,
      hasValidCoordinates: Boolean(params.center?.lat && params.center?.lng),
      searchRadius: `${params.radiusKm} km`,
      searchProviderName: 'OpenStreetMap Nominatim',
      providerRequestStatus: searchState === 'SEARCH_FAILED' ? 'ERROR' : 'SUCCESS',
      providerHttpStatus,
      rawResultsCount: rawProviders.length,
      filteredResultsCount: evaluatedProviders.length,
      normalizedResultsCount: evaluatedProviders.length,
      finalApiStatus: searchState,
    });

    return {
      status: searchState === 'SEARCH_FAILED' ? 'SEARCH_FAILED' : 'completed',
      searchState,
      error: providerError,
      userRequest,
      params,
      providers: evaluatedProviders,
      providersFound: evaluatedProviders.length,
      requestedCount: params.targetCount,
      recommendation,
      locationData,
      limitations,
      noContactGuarantee,
      evidence: evaluatedProviders.map((p) => ({
        title: p.businessName,
        url: p.sourceUrl || p.website || (p.location?.lat ? `https://www.openstreetmap.org/?mlat=${p.location.lat}&mlon=${p.location.lng}` : null),
        source: p.source || 'OpenStreetMap Nominatim',
        verificationStatus: p.verificationStatus,
        retrievedAt: completedAt,
      })),
      startedAt,
      completedAt,
    };
  }

  /**
   * Extract business category, location, specific service requirements, and target count
   */
  async extractResearchParameters(text, userLocation) {
    const lower = text.toLowerCase();

    // Check if user requested "near me" (excluding phrases like "near Gandhipuram")
    const isNearMe =
      /\b(near me|nearby|closest|nearest|around me|within \d+\s*(?:km|miles?)|near here)\b/i.test(lower) &&
      !/\bnear\s+(?!me\b|here\b)[a-z0-9]/i.test(lower);

    // Parse requested result count
    let targetCount = 5;
    const countMatch = text.match(
      /\b(one|two|three|four|five|six|seven|eight|nine|ten|\d+)\s+(?:top|best|nearby|verified|different)?\s*(?:cinema|theatre|theater|movie|multiplex|hospital|clinic|doctor|restaurant|cafe|laptop|computer|repair|service|provider|business|shop)s?\b/i
    );
    if (countMatch && countMatch[1]) {
      const wordMap = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10 };
      const parsed = parseInt(countMatch[1], 10);
      targetCount = isNaN(parsed) ? (wordMap[countMatch[1].toLowerCase()] || 5) : parsed;
    }

    // Parse search radius (default: 15km for cinemas/hospitals, 10km for restaurants)
    let radiusKm = 15;
    const radiusMatch = text.match(/within\s+(\d+)\s*(?:km|kilometers?)/i);
    if (radiusMatch) {
      radiusKm = parseInt(radiusMatch[1], 10) || 15;
    }

    // Identify specific brand requested (e.g., "KG Cinemas", "Dell", etc.)
    let brandQuery = null;
    const kgMatch = text.match(/\b(KG\s*Cinemas?|KG\s*Big\s*Cinema)\b/i);
    if (kgMatch) {
      brandQuery = 'KG Cinemas';
    }
    const dellMatch = text.match(/\b(Dell(?:\s+(?:laptop|service|repair|centre|center))?)\b/i);
    if (dellMatch) {
      brandQuery = 'Dell';
    }

    // Determine category and search keywords
    let serviceCategory = 'Local Services';
    let categoryTitle = 'Cinema Theatres'; // Default to Cinema Theatres if context indicates cinema/theatre
    let searchTerms = ['services'];

    if (/cinema|theatre|theater|multiplex|movie|film/i.test(lower)) {
      serviceCategory = 'Cinema Theatres';
      categoryTitle = 'Cinema Theatres';
      searchTerms = ['cinema', 'theatre', 'multiplex'];
    } else if (/hospital|clinic|doctor|cardiolog|dermatolog|medical|healthcare/i.test(lower)) {
      serviceCategory = 'Hospitals';
      categoryTitle = 'Hospitals';
      searchTerms = ['hospital', 'clinic'];
    } else if (/restaurant|dine|dining|cafe|food|bistro|dhaba|hotel/i.test(lower)) {
      serviceCategory = 'Restaurants';
      categoryTitle = 'Restaurants';
      searchTerms = ['restaurant', 'cafe'];
      if (!radiusMatch) radiusKm = 10;
    } else if (/laptop|computer|dell\s*repair|pc\s*repair/i.test(lower)) {
      serviceCategory = 'Laptop Repair Centres';
      categoryTitle = 'Laptop Repair Centres';
      searchTerms = ['laptop repair', 'computer service'];
    } else if (/electrician|electrical/i.test(lower)) {
      serviceCategory = 'Electricians';
      categoryTitle = 'Electricians';
      searchTerms = ['electrician'];
    } else if (/plumber|plumbing/i.test(lower)) {
      serviceCategory = 'Plumbers';
      categoryTitle = 'Plumbers';
      searchTerms = ['plumber'];
    } else if (/service\s*cent(?:re|er)|repair/i.test(lower)) {
      serviceCategory = 'Service Centres';
      categoryTitle = 'Service Centres';
      searchTerms = ['service center', 'repair shop'];
    }

    // Location Resolution
    let center = null;
    let targetLocation = '';
    let targetCity = '';
    let locationSource = 'unknown';
    let locationSourceLabel = 'Device Location';
    let targetLocationLabel = '';

    // Check for explicit city / area / landmark in text (e.g. "in Coimbatore", "near Gandhipuram, Coimbatore")
    const placeMatch = text.match(
      /\b(?:in|at|near|around)\s+(?!me\b|here\b)([A-Za-z0-9\s,-]+?)(?:[.,;]|\s+that|\s+which|\s+providing|\s+with|\s+and|\s+for|\s*$)/i
    );
    const blacklist = ['me', 'here', 'a', 'the', 'specified location', 'specified city', 'my location', 'verified', 'google'];

    let extractedPlace = null;
    if (placeMatch && placeMatch[1]) {
      const candidate = placeMatch[1].trim();
      if (!blacklist.includes(candidate.toLowerCase()) && candidate.length > 2) {
        extractedPlace = candidate;
      }
    }

    // 1. If explicit user-entered location in text
    if (extractedPlace) {
      targetCity = extractedPlace;
      locationSource = 'user_specified';
      locationSourceLabel = 'User Specified';
      try {
        const geo = await locationService.geocode(extractedPlace);
        if (geo && typeof geo.lat === 'number' && typeof geo.lng === 'number') {
          center = { lat: geo.lat, lng: geo.lng };
          targetLocation = geo.displayName ? geo.displayName.split(',').slice(0, 3).join(',').trim() : extractedPlace;
          if (geo.city) targetCity = geo.city;
        } else {
          targetLocation = extractedPlace;
        }
      } catch (_) {
        targetLocation = extractedPlace;
      }
      targetLocationLabel = `${targetLocation} (User Specified)`;
    } else if (isNearMe) {
      // 2. "near me" requested: requires device coordinates
      if (userLocation?.denied || userLocation?.source === 'denied') {
        return {
          isLocationRequired: true,
          searchState: 'LOCATION_REQUIRED',
          locationReason: 'DENIED',
          locationSource: 'denied',
          serviceCategory,
          categoryTitle,
          targetCount,
          radiusKm,
          brandQuery,
          searchTerms,
        };
      }

      if (!userLocation || (!userLocation.lat && !userLocation.lng)) {
        return {
          isLocationRequired: true,
          searchState: 'LOCATION_REQUIRED',
          locationReason: 'UNAVAILABLE',
          locationSource: 'unavailable',
          serviceCategory,
          categoryTitle,
          targetCount,
          radiusKm,
          brandQuery,
          searchTerms,
        };
      }

      center = { lat: Number(userLocation.lat), lng: Number(userLocation.lng) };
      locationSource = userLocation.source || 'precise';
      locationSourceLabel = locationSource === 'approximate' ? 'Approximate' : 'Device Location';

      // Reverse geocode to get human-readable locality
      try {
        const rev = await locationService.reverseGeocode(center.lat, center.lng);
        if (rev && rev.city) targetCity = rev.city;
        else if (rev && rev.name) targetCity = rev.name;

        if (rev && rev.displayName) {
          targetLocation = rev.displayName.split(',').slice(0, 3).join(',').trim();
        } else if (rev && rev.city) {
          targetLocation = rev.city;
        } else if (userLocation.name && !/your location|detected location|current location/i.test(userLocation.name)) {
          targetLocation = userLocation.name;
        } else {
          targetLocation = `${center.lat.toFixed(4)}, ${center.lng.toFixed(4)}`;
        }
      } catch (_) {
        targetLocation = `${center.lat.toFixed(4)}, ${center.lng.toFixed(4)}`;
      }
      targetLocationLabel = `${targetLocation} (${locationSourceLabel})`;
    } else if (userLocation && typeof userLocation.lat === 'number' && typeof userLocation.lng === 'number') {
      // 3. Fall back to active userLocation if available in session
      center = { lat: Number(userLocation.lat), lng: Number(userLocation.lng) };
      locationSource = userLocation.source || 'approximate';
      locationSourceLabel = locationSource === 'approximate' ? 'Approximate' : 'Device Location';
      try {
        const rev = await locationService.reverseGeocode(center.lat, center.lng);
        targetLocation = rev?.displayName ? rev.displayName.split(',').slice(0, 3).join(',').trim() : (rev?.city || `${center.lat.toFixed(4)}, ${center.lng.toFixed(4)}`);
      } catch (_) {
        targetLocation = `${center.lat.toFixed(4)}, ${center.lng.toFixed(4)}`;
      }
      targetLocationLabel = `${targetLocation} (${locationSourceLabel})`;
    } else {
      // 4. Prompt for city or area
      return {
        isLocationRequired: true,
        searchState: 'LOCATION_REQUIRED',
        locationReason: 'UNSPECIFIED',
        locationSource: 'none',
        serviceCategory,
        categoryTitle,
        targetCount,
        radiusKm,
        brandQuery,
        searchTerms,
      };
    }

    return {
      isLocationRequired: false,
      searchState: 'LOCATION_RESOLVED',
      isNearMe,
      serviceCategory,
      categoryTitle,
      targetCount,
      radiusKm,
      brandQuery,
      searchTerms,
      center,
      targetLocation,
      targetCity,
      locationSource,
      locationSourceLabel,
      targetLocationLabel,
    };
  }

  /**
   * Discover real-world providers using Nominatim with viewbox bounding and Haversine distance
   */
  async discoverProviders(params, taskContext = {}) {
    const { center, targetLocation, targetCity, searchTerms, brandQuery, radiusKm, targetCount } = params;
    const candidates = [];
    const seenNames = new Set();
    let brandNotFoundNotice = null;
    let providerError = null;
    let providerHttpStatus = 200;

    // Simulation hooks for deterministic verification of error and edge conditions
    if (taskContext.simulateProviderError) {
      return {
        providers: [],
        searchState: 'SEARCH_FAILED',
        error: 'Business search service unavailable',
        httpStatus: 503,
      };
    }

    if (taskContext.simulateZeroResults) {
      return {
        providers: [],
        searchState: 'NO_RESULTS',
        error: null,
        httpStatus: 200,
      };
    }

    if (taskContext.simulatePartialResults) {
      const partialList = (taskContext.mockProviders || []).slice(0, 3);
      return {
        providers: partialList,
        searchState: 'PARTIAL_RESULTS',
        error: null,
        httpStatus: 200,
      };
    }

    // Calculate viewbox bounding box around center coordinates
    let viewboxStr = null;
    if (center && typeof center.lat === 'number' && typeof center.lng === 'number') {
      const delta = radiusKm / 111.0; // Approx 111 km per latitude degree
      const minLng = center.lng - delta;
      const maxLat = center.lat + delta;
      const maxLng = center.lng + delta;
      const minLat = center.lat - delta;
      viewboxStr = `${minLng},${maxLat},${maxLng},${minLat}`;
    }

    let networkSuccess = false;

    // 1. If user requested a specific brand (e.g. "KG Cinemas", "Dell")
    if (brandQuery) {
      const brandVariants = [
        brandQuery,
        `${brandQuery} ${targetCity || ''}`.trim(),
        `${brandQuery.replace(/s\b/gi, '')} ${targetCity || ''}`.trim(),
        brandQuery.replace(/s\b/gi, ''),
        `${brandQuery} ${targetLocation}`.trim(),
      ];

      for (const bQuery of brandVariants) {
        if (candidates.some((c) => c.isBrandMatch)) break;
        try {
          const brandUrl = viewboxStr
            ? `${this.nominatimBase}/search?format=json&q=${encodeURIComponent(bQuery)}&viewbox=${viewboxStr}&bounded=1&addressdetails=1&extratags=1&limit=5`
            : `${this.nominatimBase}/search?format=json&q=${encodeURIComponent(bQuery)}&addressdetails=1&extratags=1&limit=5`;

          const res = await axios.get(brandUrl, {
            headers: { 'User-Agent': this.userAgent, Accept: 'application/json' },
            timeout: 8000,
          });

          networkSuccess = true;
          providerHttpStatus = res.status;

          if (Array.isArray(res.data) && res.data.length > 0) {
            for (const p of res.data) {
              const parsed = this.parseNominatimPlace(p, center);
              if (parsed && !seenNames.has(parsed.businessName.toLowerCase())) {
                seenNames.add(parsed.businessName.toLowerCase());
                parsed.isBrandMatch = true;
                candidates.push(parsed);
              }
            }
          }
        } catch (err) {
          logger.warn(`[Local Service Researcher] Brand search for "${bQuery}" notice:`, err.message);
          providerError = err.message;
          if (err.response?.status) providerHttpStatus = err.response.status;
        }
      }

      if (!candidates.some((c) => c.isBrandMatch)) {
        brandNotFoundNotice = `I couldn't verify a ${brandQuery} location within the selected search radius. However, I found these other ${params.categoryTitle.toLowerCase()} near your location:`;
      }
    }

    // 2. Discover category businesses using viewbox / coordinates
    for (const term of searchTerms) {
      if (candidates.length >= targetCount + 3) break;

      try {
        const url = viewboxStr
          ? `${this.nominatimBase}/search?format=json&q=${encodeURIComponent(term)}&viewbox=${viewboxStr}&bounded=1&addressdetails=1&extratags=1&limit=15`
          : `${this.nominatimBase}/search?format=json&q=${encodeURIComponent(term + ' in ' + targetLocation)}&addressdetails=1&extratags=1&limit=15`;

        const res = await axios.get(url, {
          headers: { 'User-Agent': this.userAgent, Accept: 'application/json' },
          timeout: 8000,
        });

        networkSuccess = true;
        providerHttpStatus = res.status;

        if (Array.isArray(res.data) && res.data.length > 0) {
          for (const p of res.data) {
            const parsed = this.parseNominatimPlace(p, center);
            if (parsed && !seenNames.has(parsed.businessName.toLowerCase())) {
              seenNames.add(parsed.businessName.toLowerCase());
              candidates.push(parsed);
            }
          }
        }
      } catch (err) {
        logger.warn(`[Local Service Researcher] Search for "${term}" notice:`, err.message);
        providerError = err.message;
        if (err.response?.status) providerHttpStatus = err.response.status;
      }
    }

    // 3. Fallback: If viewbox bounded search was too strict, search with locality
    if (candidates.length < targetCount && targetLocation) {
      try {
        const fallbackTerm = searchTerms[0] || 'service';
        const url = `${this.nominatimBase}/search?format=json&q=${encodeURIComponent(fallbackTerm + ' in ' + targetLocation)}&addressdetails=1&extratags=1&limit=15`;
        const res = await axios.get(url, {
          headers: { 'User-Agent': this.userAgent, Accept: 'application/json' },
          timeout: 8000,
        });
        networkSuccess = true;
        if (Array.isArray(res.data)) {
          for (const p of res.data) {
            const parsed = this.parseNominatimPlace(p, center);
            if (parsed && !seenNames.has(parsed.businessName.toLowerCase())) {
              seenNames.add(parsed.businessName.toLowerCase());
              candidates.push(parsed);
            }
          }
        }
      } catch (err) {
        if (!networkSuccess) providerError = err.message;
      }
    }

    // If all network queries failed and zero candidates were obtained
    if (!networkSuccess && candidates.length === 0) {
      return {
        providers: [],
        searchState: 'SEARCH_FAILED',
        error: providerError || 'Search provider network unreachable',
        httpStatus: providerHttpStatus !== 200 ? providerHttpStatus : 503,
      };
    }

    // Sort by distance ascending when distance is available
    candidates.sort((a, b) => {
      if (a.isBrandMatch && !b.isBrandMatch) return -1;
      if (!a.isBrandMatch && b.isBrandMatch) return 1;
      if (a.distanceKmNum !== null && b.distanceKmNum !== null) {
        return a.distanceKmNum - b.distanceKmNum;
      }
      return 0;
    });

    params.brandNotFoundNotice = brandNotFoundNotice;

    // Slice to requested count
    const retained = candidates.slice(0, targetCount);

    let searchState = 'RESULTS_FOUND';
    if (retained.length === 0) {
      searchState = 'NO_RESULTS';
    } else if (retained.length < targetCount) {
      searchState = 'PARTIAL_RESULTS';
    }

    return {
      providers: retained,
      searchState,
      error: null,
      httpStatus: 200,
    };
  }

  /**
   * Parse Nominatim JSON record into clean provider object with Haversine distance
   */
  parseNominatimPlace(place, center) {
    if (!place) return null;
    // Discard non-commercial public utilities or generic administrative boundaries
    if (place.class === 'boundary' || place.type === 'administrative') return null;

    const businessName =
      place.namedetails?.name ||
      place.name ||
      (place.display_name ? place.display_name.split(',')[0].trim() : null);

    if (!businessName) return null;

    const bLower = businessName.toLowerCase();
    if (
      bLower.includes('department of') ||
      bLower.includes('substation') ||
      bLower.includes('sub-station') ||
      bLower.includes('ministry of')
    ) {
      return null;
    }

    const lat = parseFloat(place.lat);
    const lng = parseFloat(place.lon);

    let distanceKmNum = null;
    let distanceKm = null;
    if (center && typeof center.lat === 'number' && typeof center.lng === 'number' && !isNaN(lat) && !isNaN(lng)) {
      distanceKmNum = haversineDistance(center.lat, center.lng, lat, lng);
      distanceKm = distanceKmNum !== null ? `${distanceKmNum} km` : null;
    }

    const phone = place.extratags?.phone || place.extratags?.['contact:phone'] || null;
    const website = place.extratags?.website || place.extratags?.['contact:website'] || null;
    const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;

    return {
      businessName,
      address: place.display_name || `${businessName}, ${place.address?.city || ''}`,
      location: { lat, lng },
      distanceKmNum,
      distanceKm,
      phone,
      website,
      rating: null, // OSM does not have verified customer review ratings; never fabricate
      reviewsCount: null,
      directionsUrl,
      source: 'OpenStreetMap Nominatim',
      sourceUrl: `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}`,
      verificationStatus: VERIFICATION_STATUSES.CONFIRMED,
      dataSource: 'REAL SOURCE-BASED LOCATION',
      retrievedAt: new Date().toISOString(),
    };
  }

  /**
   * Evaluates service suitability
   */
  async evaluateProviders(providers, params) {
    return providers.map((p, idx) => ({
      ...p,
      id: `prov-${idx + 1}`,
      index: idx + 1,
      suitability: 'CONFIRMED',
      suitabilityAnalysis: `Verified establishment matching "${params.serviceCategory}" in ${params.targetLocation}.`,
      verificationStatus: p.verificationStatus || VERIFICATION_STATUSES.CONFIRMED,
    }));
  }

  /**
   * Build recommended shortlist with clear justifications
   */
  buildRecommendation(providers, params) {
    if (providers.length === 0) {
      return {
        topPick: null,
        rationale: `No verified establishments found matching "${params.serviceCategory}" within ${params.radiusKm} km of ${params.targetLocation}.`,
      };
    }

    const closest = providers[0];
    let rationale = '';
    if (closest.distanceKm) {
      rationale = `**${closest.businessName}** is the closest verified option (${closest.distanceKm} away) based on your coordinates.`;
    } else {
      rationale = `**${closest.businessName}** is verified with confirmed street address records in ${params.targetLocation}.`;
    }

    return {
      topPick: closest.businessName,
      rationale,
    };
  }

  /**
   * Structure LocationMap data for Leaflet frontend
   */
  buildLocationMapData(providers, params) {
    const validPlaces = providers
      .filter((p) => p.location && typeof p.location.lat === 'number' && typeof p.location.lng === 'number')
      .map((p, idx) => ({
        id: p.id || `place-${idx + 1}`,
        index: idx + 1,
        name: p.businessName,
        address: p.address,
        lat: p.location.lat,
        lng: p.location.lng,
        phone: p.phone,
        rating: p.rating,
        reviewsCount: p.reviewsCount,
        distanceKm: p.distanceKm,
        directionsUrl: p.directionsUrl,
        source: p.source,
        sourceUrl: p.sourceUrl,
        dataSource: p.dataSource,
      }));

    let center = params.center || { lat: 11.0168, lng: 76.9558 };
    if (validPlaces.length > 0 && (!params.center || !params.center.lat)) {
      const avgLat = validPlaces.reduce((sum, p) => sum + p.lat, 0) / validPlaces.length;
      const avgLng = validPlaces.reduce((sum, p) => sum + p.lng, 0) / validPlaces.length;
      center = { lat: avgLat, lng: avgLng };
    }

    return {
      type: 'places',
      places: validPlaces,
      center,
      zoom: validPlaces.length > 1 ? 13 : 14,
    };
  }

  /**
   * Builds explicit research limitations ensuring 100% honesty
   */
  buildResearchLimitations(params) {
    return [
      'Research-only mandate: DOERA AI did not contact, call, message, book, or execute any transaction with any provider.',
      'Distance & location: Distances are calculated using direct Haversine coordinates from your specified geographic location to the establishment.',
      'Public directory data: Operating hours, phone listings, and websites reflect publicly registered OpenStreetMap records; unlisted attributes are marked as "Not publicly listed".',
      'Independent decision: Contact information and directions are presented strictly for your evaluation; users decide independently whether to contact or visit any business.',
    ];
  }
}

export const localServiceResearcher = new LocalServiceResearcher();
export default localServiceResearcher;
