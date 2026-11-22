import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { fileUploadLimiter } from '../middleware/rateLimiter.js';
import { uploadFile, getFiles, getFile, deleteFile, exportReport } from '../controllers/fileController.js';

const router = express.Router();
router.use(authenticate);

router.post('/upload', fileUploadLimiter, uploadFile);
router.post('/export-report', exportReport);
router.get('/', getFiles);
router.get('/:id', getFile);
router.delete('/:id', deleteFile);

export default router;
