import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import FileMetadata from '../models/FileMetadata.js';
import { logger } from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const UPLOADS_ROOT = path.resolve(__dirname, '../../uploads');

class FileStorageService {
  constructor() {
    this.ensureUploadsDirectory();
  }

  ensureUploadsDirectory() {
    if (!fs.existsSync(UPLOADS_ROOT)) {
      fs.mkdirSync(UPLOADS_ROOT, { recursive: true });
    }
  }

  /**
   * Resolves safe user- and conversation-scoped directory
   */
  getConversationUploadDir(userId, conversationId) {
    const safeUser = String(userId || 'anonymous').replace(/[^a-zA-Z0-9_-]/g, '_');
    const safeConv = String(conversationId || 'general').replace(/[^a-zA-Z0-9_-]/g, '_');
    const dir = path.join(UPLOADS_ROOT, safeUser, safeConv);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    return dir;
  }

  /**
   * Extracts raw binary Buffer from various attachment representations
   */
  extractBufferFromAttachment(attachment) {
    if (!attachment) return null;
    if (Buffer.isBuffer(attachment.buffer)) return attachment.buffer;

    // 1. Raw Base64 string
    if (attachment.base64 && typeof attachment.base64 === 'string') {
      try {
        return Buffer.from(attachment.base64, 'base64');
      } catch (_) {}
    }

    // 2. Data URL (data:application/...;base64,....)
    const dataUrlCandidate = attachment.dataUrl || (typeof attachment.url === 'string' && attachment.url.startsWith('data:') ? attachment.url : null);
    if (dataUrlCandidate && dataUrlCandidate.includes(',')) {
      const b64 = dataUrlCandidate.split(',')[1];
      if (b64) {
        try {
          return Buffer.from(b64, 'base64');
        } catch (_) {}
      }
    }

    // 3. Raw text or string content
    const textContent = attachment.content || attachment.text;
    if (typeof textContent === 'string' && textContent.length > 0) {
      // Check if text content looks like base64-encoded zip/xlsx (starts with PK / UEsDB)
      if (/^UEsDB/i.test(textContent.slice(0, 30)) || /\.(xlsx|xls|zip|docx|pptx)$/i.test(attachment.name || '')) {
        try {
          return Buffer.from(textContent, 'base64');
        } catch (_) {}
      }
      return Buffer.from(textContent, 'utf8');
    }

    // 4. File already on disk
    if (attachment.storagePath && fs.existsSync(attachment.storagePath)) {
      try {
        return fs.readFileSync(attachment.storagePath);
      } catch (_) {}
    }

    return null;
  }

  /**
   * Persists an attachment to disk and creates/updates FileMetadata
   */
  async saveAttachment({ userId, conversationId, attachment }) {
    if (!attachment) return null;

    const buffer = this.extractBufferFromAttachment(attachment);
    const originalName = attachment.name || attachment.originalName || 'uploaded_file';
    const mimeType = attachment.type || attachment.mimeType || 'application/octet-stream';
    const declaredSize = attachment.size || (buffer ? buffer.length : 0);

    // If we have an existing valid storagePath that still exists, reuse it
    if (attachment.storagePath && fs.existsSync(attachment.storagePath) && (!buffer || buffer.length === 0)) {
      return {
        ...attachment,
        storagePath: attachment.storagePath,
      };
    }

    if (!buffer || buffer.length === 0) {
      logger.warn(`[FileStorage] Empty buffer for attachment "${originalName}".`);
      return {
        name: originalName,
        type: mimeType,
        size: declaredSize,
      };
    }

    const safeDir = this.getConversationUploadDir(userId, conversationId);
    const ext = path.extname(originalName) || '';
    const baseName = path.basename(originalName, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
    const storageFilename = `${Date.now()}-${baseName}${ext}`;
    const storagePath = path.join(safeDir, storageFilename);

    await fs.promises.writeFile(storagePath, buffer);
    logger.info(`[FileStorage] Successfully stored file "${originalName}" (${(buffer.length / 1024).toFixed(1)} KB) at ${storagePath}`);

    // Register or find FileMetadata in MongoDB
    let fileDoc = null;
    try {
      fileDoc = await FileMetadata.create({
        userId,
        conversationId: conversationId || null,
        filename: storageFilename,
        originalName,
        mimeType,
        size: buffer.length,
        storageUrl: storagePath,
        status: 'completed',
      });
    } catch (metaErr) {
      logger.warn(`[FileStorage] FileMetadata creation notice: ${metaErr.message}`);
    }

    return {
      name: originalName,
      type: mimeType,
      size: buffer.length,
      fileId: fileDoc ? fileDoc._id : null,
      storagePath,
      // Provide buffer in-memory for immediate active turn execution
      buffer,
    };
  }

  /**
   * Retrieves a file buffer from disk by storage path or FileMetadata ID
   */
  async getFileBuffer(storagePathOrId, userId = null) {
    if (!storagePathOrId) return null;

    let targetPath = null;

    // Check if it's an existing path on disk
    if (typeof storagePathOrId === 'string' && fs.existsSync(storagePathOrId)) {
      targetPath = storagePathOrId;
    } else {
      // Lookup in FileMetadata
      try {
        const filter = { _id: storagePathOrId };
        if (userId) filter.userId = userId;
        const fileDoc = await FileMetadata.findOne(filter);
        if (fileDoc && fileDoc.storageUrl && fs.existsSync(fileDoc.storageUrl)) {
          targetPath = fileDoc.storageUrl;
        }
      } catch (_) {}
    }

    if (!targetPath || !fs.existsSync(targetPath)) {
      return null;
    }

    return await fs.promises.readFile(targetPath);
  }

  /**
   * Retrieves all files uploaded in a conversation, ensuring buffers can be hydrated
   */
  async getConversationFiles(conversationId, userId) {
    if (!conversationId) return [];

    const files = await FileMetadata.find({
      conversationId,
      ...(userId ? { userId } : {}),
    }).sort({ createdAt: 1 }).lean();

    return files.map((f) => ({
      fileId: f._id,
      name: f.originalName || f.filename,
      type: f.mimeType,
      size: f.size,
      storagePath: f.storageUrl,
      createdAt: f.createdAt,
    }));
  }
}

const fileStorageService = new FileStorageService();
export default fileStorageService;
