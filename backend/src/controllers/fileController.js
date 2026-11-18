import FileMetadata from '../models/FileMetadata.js';
import documentProcessor from '../services/documentProcessor.js';

export const uploadFile = async (req, res) => {
  try {
    const { filename, originalName, mimeType, size, rawText, base64Content, projectId, conversationId } = req.body;

    if (!filename && !originalName) {
      return res.status(400).json({ error: 'Filename is required' });
    }

    const fname = originalName || filename;
    const mType = mimeType || 'text/plain';
    const fsize = size || (rawText ? Buffer.byteLength(rawText, 'utf8') : 0);

    const processed = await documentProcessor.processContent({
      filename: fname,
      mimeType: mType,
      rawText,
      base64Content,
    });

    const fileDoc = await FileMetadata.create({
      userId: req.user._id,
      projectId: projectId || null,
      conversationId: conversationId || null,
      filename: fname,
      originalName: fname,
      mimeType: mType,
      size: fsize,
      extractedText: processed.extractedText,
      summary: processed.summary,
      structuredData: processed.structuredData,
      status: 'completed',
    });

    res.status(201).json({ file: fileDoc });
  } catch (err) {
    res.status(500).json({ error: err.message || 'File upload failed' });
  }
};

export const getFiles = async (req, res) => {
  try {
    const { projectId, conversationId } = req.query;
    const filter = { userId: req.user._id };
    if (projectId) filter.projectId = projectId;
    if (conversationId) filter.conversationId = conversationId;

    const files = await FileMetadata.find(filter)
      .select('-extractedText')
      .sort({ createdAt: -1 });

    res.json({ files });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to fetch files' });
  }
};

export const getFile = async (req, res) => {
  try {
    const file = await FileMetadata.findOne({ _id: req.params.id, userId: req.user._id });
    if (!file) return res.status(404).json({ error: 'File not found' });
    res.json({ file });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to fetch file' });
  }
};

export const deleteFile = async (req, res) => {
  try {
    const file = await FileMetadata.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    if (!file) return res.status(404).json({ error: 'File not found' });
    res.json({ success: true, message: 'File deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to delete file' });
  }
};
