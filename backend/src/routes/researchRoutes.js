import express from 'express';
import { authenticate } from '../middleware/auth.js';
import {
  coordinateResearch,
  searchAcademicPapers,
  compareAcademicPapers,
  lookupWikipedia,
  discoverNews,
  verifyFact,
  generateCitations,
  generateReport,
  startResearch,
  getResearchSessions,
  getResearchSession,
} from '../controllers/researchController.js';

const router = express.Router();
router.use(authenticate);

// Central Multi-Agent Orchestration
router.post('/coordinate', coordinateResearch);

// Dedicated Agent Endpoints
router.post('/academic', searchAcademicPapers);
router.post('/academic/compare', compareAcademicPapers);
router.post('/wikipedia', lookupWikipedia);
router.post('/news', discoverNews);
router.post('/verify', verifyFact);
router.post('/citations', generateCitations);
router.post('/report', generateReport);

// General Deep Research & Sessions
router.post('/', startResearch);
router.get('/', getResearchSessions);
router.get('/sessions', getResearchSessions);
router.get('/sessions/:id', getResearchSession);
router.get('/:id', getResearchSession);

export default router;
