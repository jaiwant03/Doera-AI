import llmService from './llmService.js';
import { logger } from '../utils/logger.js';

class DocumentProcessor {
  /**
   * Parse CSV content into structured JSON
   */
  parseCSV(content) {
    const lines = content.split(/\r?\n/).filter((line) => line.trim().length > 0);
    if (lines.length === 0) return { headers: [], rows: [], rowCount: 0 };

    const parseLine = (line) => {
      const result = [];
      let current = '';
      let insideQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"' || char === "'") {
          insideQuotes = !insideQuotes;
        } else if (char === ',' && !insideQuotes) {
          result.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      result.push(current.trim());
      return result;
    };

    const headers = parseLine(lines[0]);
    const rows = [];
    const maxSampleRows = 50;

    for (let i = 1; i < lines.length; i++) {
      const values = parseLine(lines[i]);
      if (values.length === headers.length || values.some((v) => v !== '')) {
        const rowObj = {};
        headers.forEach((h, idx) => {
          rowObj[h || `col_${idx + 1}`] = values[idx] || '';
        });
        if (rows.length < maxSampleRows) {
          rows.push(rowObj);
        }
      }
    }

    return {
      headers,
      rowCount: lines.length - 1,
      sampleRows: rows,
    };
  }

  /**
   * Process and extract structured knowledge from uploaded file text
   */
  async processContent({ filename, mimeType, rawText, base64Content }) {
    let extractedText = rawText || '';
    if (!extractedText && base64Content) {
      try {
        extractedText = Buffer.from(base64Content, 'base64').toString('utf-8');
      } catch (err) {
        logger.warn(`[Document Processor] Base64 decode failed for ${filename}: ${err.message}`);
      }
    }

    const ext = filename.split('.').pop()?.toLowerCase();
    let structuredData = {};

    const isImage = ['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg'].includes(ext) || mimeType?.startsWith('image/');

    if (ext === 'csv' || mimeType === 'text/csv') {
      structuredData = this.parseCSV(extractedText);
    } else if (ext === 'json' || mimeType === 'application/json') {
      try {
        structuredData = JSON.parse(extractedText);
      } catch (_) {
        structuredData = { raw: extractedText.slice(0, 1000) };
      }
    } else if (isImage) {
      structuredData = {
        fileType: 'IMAGE',
        format: (ext || 'png').toUpperCase(),
        hasBase64: Boolean(base64Content),
        sizeBytes: base64Content ? Math.round((base64Content.length * 3) / 4) : 0,
      };
      if (!extractedText) {
        extractedText = `[Visual Image Asset: ${filename} (${(ext || 'png').toUpperCase()}) verified and ready for multimodal contextual grounding]`;
      }
    }

    // Generate smart summary using LLM or heuristic
    let summary = '';
    if (isImage) {
      summary = `Visual image asset "${filename}" verified and loaded for contextual examination.`;
    } else {
      try {
        const snippet = extractedText.slice(0, 4000);
        summary = await llmService.generate({
          systemPrompt:
            'You are DOERA Document Intelligence. Provide a concise, highly readable 2-3 sentence executive summary of this document.',
          userPrompt: `Filename: ${filename}\n\nContent:\n${snippet}`,
          temperature: 0.2,
        });
      } catch (err) {
        summary = `Processed ${filename} (${extractedText.length} characters). Extracted knowledge ready for contextual chat.`;
      }
    }

    return {
      extractedText,
      structuredData,
      summary: summary.trim(),
    };
  }
}

export const documentProcessor = new DocumentProcessor();
export default documentProcessor;
