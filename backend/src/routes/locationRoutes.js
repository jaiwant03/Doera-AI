import express from 'express';
import locationService from '../services/locationService.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

/**
 * GET /api/location/geocode?q=...
 */
router.get('/geocode', async (req, res) => {
  const { q } = req.query;
  if (!q) {
    return res.status(400).json({ error: 'Query parameter "q" is required.' });
  }

  try {
    const result = await locationService.geocode(q);
    if (!result) {
      return res.status(404).json({ error: `Could not geocode location: "${q}".` });
    }
    res.json(result);
  } catch (err) {
    logger.error('[Location Routes] Geocode error:', err.message);
    res.status(500).json({ error: 'Geocoding service unavailable.' });
  }
});

/**
 * GET /api/location/reverse?lat=...&lng=...
 */
router.get('/reverse', async (req, res) => {
  const { lat, lng } = req.query;
  if (lat === undefined || lng === undefined) {
    return res.status(400).json({ error: 'Parameters "lat" and "lng" are required.' });
  }

  try {
    const result = await locationService.reverseGeocode(parseFloat(lat), parseFloat(lng));
    if (!result) {
      return res.status(404).json({ error: 'Could not reverse geocode coordinates.' });
    }
    res.json(result);
  } catch (err) {
    logger.error('[Location Routes] Reverse geocode error:', err.message);
    res.status(500).json({ error: 'Reverse geocoding failed.' });
  }
});

/**
 * POST /api/location/route
 * Body: { origin: { lat, lng, name }, destination: { lat, lng, name }, mode: 'driving'|'walking'|'cycling' }
 */
router.post('/route', async (req, res) => {
  const { origin, destination, mode = 'driving' } = req.body;
  if (!origin || !destination) {
    return res.status(400).json({ error: 'Both "origin" and "destination" are required.' });
  }

  try {
    const route = await locationService.calculateRoute({ origin, destination, mode });
    if (!route) {
      return res.status(404).json({ error: 'No route could be calculated between the provided locations.' });
    }
    res.json(route);
  } catch (err) {
    logger.error('[Location Routes] Route calculation error:', err.message);
    res.status(500).json({ error: 'Route calculation failed.' });
  }
});

export default router;
