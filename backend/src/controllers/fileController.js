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

export const exportReport = async (req, res) => {
  try {
    const { title = 'DOERA_Analysis_Report', content = '', format = 'md' } = req.body;
    const safeTitle = title.replace(/[^a-zA-Z0-9_-]/g, '_');

    if (format === 'md') {
      res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${safeTitle}.md"`);
      return res.send(content);
    }

    if (format === 'html' || format === 'pdf') {
      const styledHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${title}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background: #08050B; color: #EDE4EE; margin: 40px auto; max-width: 900px; line-height: 1.6; padding: 0 20px; }
    h1, h2, h3, h4 { color: #FF55BD; font-family: sans-serif; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; background: #120A17; border-radius: 8px; overflow: hidden; }
    th, td { border: 1px solid #361744; padding: 10px 14px; text-align: left; }
    th { background: #1C0F24; color: #FF55BD; font-weight: 700; }
    blockquote { border-left: 4px solid #FF55BD; margin: 20px 0; padding: 10px 20px; background: #150C1C; color: #D1C5D4; }
    code { background: #180D22; color: #FF77CE; padding: 2px 6px; border-radius: 4px; font-family: monospace; }
    pre { background: #110719; border: 1px solid #361744; padding: 16px; border-radius: 8px; overflow-x: auto; }
    pre code { background: none; padding: 0; color: #EDE4EE; }
    @media print {
      body { background: #FFFFFF; color: #111111; }
      h1, h2, h3, h4 { color: #B41B74; }
      table { background: #FFFFFF; }
      th, td { border: 1px solid #DDDDDD; }
      th { background: #F3F4F6; color: #111111; }
      blockquote { background: #F9FAFB; border-left-color: #B41B74; color: #374151; }
      code { background: #F3F4F6; color: #1F2937; }
      pre { background: #F9FAFB; border-color: #E5E7EB; }
    }
  </style>
</head>
<body>
  <h1>${title}</h1>
  <div>${content.replace(/\\n/g, '<br/>')}</div>
</body>
</html>`;
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${safeTitle}.html"`);
      return res.send(styledHtml);
    }

    return res.status(400).json({ error: 'Unsupported format. Choose "md" or "html".' });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Export failed' });
  }
};
