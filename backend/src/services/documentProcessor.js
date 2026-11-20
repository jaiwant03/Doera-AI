import { createRequire } from 'module';
import mammoth from 'mammoth';
import * as XLSX from 'xlsx';
import AdmZip from 'adm-zip';
import imageProcessor from './imageProcessor.js';
import llmService from './llmService.js';
import { logger } from '../utils/logger.js';

const require = createRequire(import.meta.url);
let PDFParseModule;
try {
  PDFParseModule = require('pdf-parse');
} catch (e) {
  logger.warn('[DocumentProcessor] pdf-parse require notice:', e.message);
}

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB

class DocumentProcessor {
  /**
   * Main entry point to extract and structure knowledge from any supported file
   */
  async processContent({ filename = 'document.txt', mimeType = 'text/plain', rawText = '', base64Content = null, size = 0 }) {
    const ext = (filename.split('.').pop() || '').toLowerCase();
    const effectiveSize = size || (base64Content ? Math.round((base64Content.length * 3) / 4) : Buffer.byteLength(rawText || '', 'utf8'));

    // 1. Validation
    if (effectiveSize > MAX_FILE_SIZE) {
      return {
        filename,
        fileType: ext.toUpperCase(),
        extractedText: '',
        structuredData: {},
        summary: '',
        extractionStatus: 'FAILED',
        error: `File size (${(effectiveSize / 1024 / 1024).toFixed(1)}MB) exceeds maximum allowable limit of 25MB.`,
        limitations: ['File exceeded 25MB security limit.'],
      };
    }

    // 2. Obtain binary buffer
    let buffer = null;
    if (base64Content) {
      try {
        buffer = Buffer.from(base64Content, 'base64');
      } catch (err) {
        logger.warn(`[Document Processor] Base64 decode failed for ${filename}: ${err.message}`);
      }
    } else if (rawText) {
      buffer = Buffer.from(rawText, 'utf8');
    }

    let extraction = {
      filename,
      fileType: ext.toUpperCase(),
      extractedText: rawText || '',
      pages: [],
      sections: [],
      tables: [],
      structuredData: {},
      metadata: {
        pageCount: 1,
        wordCount: 0,
        characterCount: 0,
        isScanned: false,
        isOcr: false,
        extractionStatus: 'COMPLETED',
      },
      limitations: [],
    };

    // 3. Format-specific extraction
    try {
      if (ext === 'pdf' || mimeType === 'application/pdf') {
        extraction = await this.extractPDF(buffer, filename);
      } else if (ext === 'docx' || ext === 'doc' || mimeType.includes('wordprocessingml') || mimeType.includes('msword')) {
        extraction = await this.extractWord(buffer, filename, ext);
      } else if (ext === 'pptx' || ext === 'ppt' || mimeType.includes('presentationml') || mimeType.includes('powerpoint')) {
        extraction = await this.extractPowerPoint(buffer, filename, ext);
      } else if (['xlsx', 'xls'].includes(ext) || mimeType.includes('spreadsheetml') || mimeType.includes('excel')) {
        extraction = await this.extractExcel(buffer, filename, ext);
      } else if (['csv', 'tsv'].includes(ext) || mimeType === 'text/csv') {
        const textToParse = buffer ? buffer.toString('utf8') : (rawText || '');
        extraction = this.extractCSV(textToParse, filename, ext);
      } else if (['png', 'jpg', 'jpeg', 'webp', 'bmp', 'tiff'].includes(ext) || mimeType.startsWith('image/')) {
        extraction = await this.extractImage(buffer, filename, ext);
      } else {
        // Plain text, markdown, json, code
        const textContent = buffer ? buffer.toString('utf8') : (rawText || '');
        extraction = this.extractPlainText(textContent, filename, ext);
      }
    } catch (err) {
      logger.error(`[Document Processor] Extraction error for ${filename}: ${err.message}`);
      extraction.extractionStatus = 'FAILED';
      extraction.error = err.message;
      extraction.limitations.push(`Extraction failed: ${err.message}`);
      if (!extraction.extractedText && rawText) {
        extraction.extractedText = rawText;
      }
    }

    // Compute metrics
    const text = (extraction.extractedText || '').trim();
    extraction.metadata.characterCount = text.length;
    extraction.metadata.wordCount = text ? text.split(/\s+/).length : 0;

    // Generate grounded executive summary using configured LLM
    let summary = '';
    if (extraction.metadata.isScanned && text.length < 50) {
      summary = `Scanned or rasterized document "${filename}" (${extraction.metadata.pageCount} pages). Direct text layer was not present; visual inspection registered.`;
    } else if (text.length > 0) {
      try {
        const snippet = text.slice(0, 4000);
        summary = await llmService.generate({
          systemPrompt:
            'You are DOERA Document Intelligence. Provide a concise, professional 2-3 sentence executive summary of this document based strictly on the provided content.',
          userPrompt: `Filename: ${filename}\nPage/Scope: ${extraction.metadata.pageCount || 1} pages/slides/sheets\n\nContent:\n${snippet}`,
          temperature: 0.1,
        });
      } catch (err) {
        summary = `Processed ${filename} (${extraction.metadata.pageCount || 1} pages/slides, ${extraction.metadata.wordCount} words). Extracted structured knowledge ready for contextual queries.`;
      }
    } else {
      summary = `Processed ${filename}. No readable textual characters were extracted.`;
    }

    extraction.summary = (typeof summary === 'string' ? summary : summary.summary || '').trim();

    return extraction;
  }

  /**
   * PDF Extraction with Page Numbers and Scanned Detection
   */
  async extractPDF(buffer, filename) {
    if (!buffer || buffer.length === 0) {
      throw new Error('Empty PDF buffer');
    }

    const { PDFParse } = PDFParseModule || {};
    if (!PDFParse) {
      throw new Error('PDF parsing module not initialized');
    }

    const parser = new PDFParse({ data: buffer });
    await parser.load();

    const info = await parser.getInfo().catch(() => ({}));
    const textData = await parser.getText().catch(() => ({ text: '', pages: [] }));
    await parser.destroy().catch(() => {});

    const totalPages = textData.total || info.total || 1;
    const pages = (textData.pages || []).map((p, idx) => ({
      pageNumber: p.num || idx + 1,
      text: (p.text || '').trim(),
    }));

    // Build structured page-annotated text
    let annotatedText = '';
    if (pages.length > 0) {
      annotatedText = pages.map((p) => `[Page ${p.pageNumber}]\n${p.text}`).join('\n\n');
    } else {
      annotatedText = textData.text || '';
    }

    const isScanned = annotatedText.replace(/\[Page \d+\]/g, '').trim().length < 50;

    let ocrResult = null;
    if (isScanned) {
      logger.info(`[Document Processor] PDF "${filename}" has sparse text layer (<50 chars). Attempting OCR...`);
      ocrResult = await this.runOCR(buffer, filename).catch(() => null);
      if (ocrResult?.text && ocrResult.text.length > 30) {
        annotatedText = `[OCR Extracted Text from Scanned PDF]\n${ocrResult.text}`;
      }
    }

    const limitations = [];
    if (isScanned && (!ocrResult || !ocrResult.text)) {
      limitations.push('Document contains rasterized or scanned images with no embedded searchable text layer.');
    }

    return {
      filename,
      fileType: 'PDF',
      extractedText: annotatedText,
      pages,
      sections: this.detectSectionsFromText(annotatedText),
      tables: [],
      structuredData: {
        pageCount: totalPages,
        pdfInfo: info.info || {},
        isScanned,
        ocrAttempted: Boolean(ocrResult),
      },
      metadata: {
        pageCount: totalPages,
        isScanned,
        isOcr: Boolean(ocrResult?.text),
        extractionStatus: isScanned && !ocrResult?.text ? 'SCANNED_NEEDS_OCR' : 'COMPLETED',
      },
      limitations,
    };
  }

  /**
   * Word Document (.docx / .doc) Extraction with Headings & Tables
   */
  async extractWord(buffer, filename, ext) {
    if (!buffer || buffer.length === 0) {
      throw new Error('Empty Word document buffer');
    }

    // Legacy .doc binary format fallback
    if (ext === 'doc') {
      try {
        const raw = buffer.toString('utf8');
        const clean = raw.replace(/[^\x20-\x7E\t\r\n]/g, ' ').replace(/\s{2,}/g, ' ').trim();
        return {
          filename,
          fileType: 'DOC',
          extractedText: clean.slice(0, 50000),
          pages: [],
          sections: [],
          tables: [],
          structuredData: { legacyDoc: true },
          metadata: { pageCount: 1, isScanned: false, isOcr: false, extractionStatus: 'COMPLETED' },
          limitations: ['Legacy .doc format parsed with text stream heuristics.'],
        };
      } catch (err) {
        throw new Error(`Legacy .doc file could not be parsed: ${err.message}`);
      }
    }

    const rawResult = await mammoth.extractRawText({ buffer });
    const htmlResult = await mammoth.convertToHtml({ buffer }).catch(() => null);

    const rawText = (rawResult.value || '').trim();
    const html = htmlResult?.value || '';

    // Extract structured headings and sections from HTML
    const sections = [];
    const headingRegex = /<h([1-6])>(.*?)<\/h\1>([\s\S]*?)(?=<h[1-6]>|$)/gi;
    let match;
    while ((match = headingRegex.exec(html)) !== null) {
      const level = match[1];
      const title = match[2].replace(/<[^>]+>/g, '').trim();
      const content = match[3].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      if (title) {
        sections.push({ level: Number(level), title, content });
      }
    }

    // Format text with markdown headings
    let formattedText = rawText;
    if (sections.length > 0) {
      formattedText = sections.map((s) => `${'#'.repeat(s.level)} ${s.title}\n${s.content}`).join('\n\n');
    }

    // Extract tables from HTML
    const tables = [];
    const tableRegex = /<table>([\s\S]*?)<\/table>/gi;
    let tableMatch;
    while ((tableMatch = tableRegex.exec(html)) !== null) {
      const tableHtml = tableMatch[1];
      const rows = [];
      const trRegex = /<tr>([\s\S]*?)<\/tr>/gi;
      let trMatch;
      while ((trMatch = trRegex.exec(tableHtml)) !== null) {
        const cells = [];
        const cellRegex = /<t[dh]>([\s\S]*?)<\/t[dh]>/gi;
        let cellMatch;
        while ((cellMatch = cellRegex.exec(trMatch[1])) !== null) {
          cells.push(cellMatch[1].replace(/<[^>]+>/g, '').trim());
        }
        if (cells.length > 0) rows.push(cells);
      }
      if (rows.length > 0) {
        tables.push({ headers: rows[0], rowCount: rows.length - 1, sampleRows: rows.slice(1, 10) });
      }
    }

    return {
      filename,
      fileType: 'DOCX',
      extractedText: formattedText,
      pages: [],
      sections,
      tables,
      structuredData: {
        sectionCount: sections.length,
        tableCount: tables.length,
      },
      metadata: {
        pageCount: Math.max(1, Math.ceil(rawText.length / 3000)),
        isScanned: false,
        isOcr: false,
        extractionStatus: 'COMPLETED',
      },
      limitations: rawResult.messages || [],
    };
  }

  /**
   * PowerPoint (.pptx / .ppt) Extraction with Slide Numbers
   */
  async extractPowerPoint(buffer, filename, ext) {
    if (!buffer || buffer.length === 0) {
      throw new Error('Empty PowerPoint buffer');
    }

    if (ext === 'ppt') {
      const raw = buffer.toString('utf8');
      const clean = raw.replace(/[^\x20-\x7E\t\r\n]/g, ' ').replace(/\s{2,}/g, ' ').trim();
      return {
        filename,
        fileType: 'PPT',
        extractedText: clean.slice(0, 50000),
        pages: [],
        sections: [],
        tables: [],
        structuredData: { legacyPpt: true },
        metadata: { pageCount: 1, isScanned: false, isOcr: false, extractionStatus: 'COMPLETED' },
        limitations: ['Legacy .ppt format extracted with stream heuristics.'],
      };
    }

    const zip = new AdmZip(buffer);
    const zipEntries = zip.getEntries();

    // Filter slide XML entries and sort naturally by slide number
    const slideEntries = zipEntries
      .filter((e) => /^ppt\/slides\/slide\d+\.xml$/i.test(e.entryName))
      .sort((a, b) => {
        const numA = parseInt(a.entryName.match(/slide(\d+)\.xml/i)?.[1] || '0', 10);
        const numB = parseInt(b.entryName.match(/slide(\d+)\.xml/i)?.[1] || '0', 10);
        return numA - numB;
      });

    const slides = [];
    const textPieces = [];

    slideEntries.forEach((entry, idx) => {
      const slideNum = idx + 1;
      const xml = entry.getData().toString('utf8');

      // Extract all text inside <a:t> tags
      const textMatches = [];
      const textTagRegex = /<a:t[^>]*>([\s\S]*?)<\/a:t>/gi;
      let m;
      while ((m = textTagRegex.exec(xml)) !== null) {
        const val = m[1].replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').trim();
        if (val) textMatches.push(val);
      }

      const slideText = textMatches.join(' ').replace(/\s{2,}/g, ' ');
      slides.push({
        slideNumber: slideNum,
        text: slideText,
      });

      textPieces.push(`[Slide ${slideNum}]\n${slideText}`);
    });

    const fullText = textPieces.join('\n\n');

    return {
      filename,
      fileType: 'PPTX',
      extractedText: fullText,
      pages: slides.map((s) => ({ pageNumber: s.slideNumber, text: s.text })),
      sections: slides.map((s) => ({ title: `Slide ${s.slideNumber}`, content: s.text })),
      tables: [],
      structuredData: {
        slideCount: slides.length,
        slides,
      },
      metadata: {
        pageCount: slides.length,
        isScanned: false,
        isOcr: false,
        extractionStatus: 'COMPLETED',
      },
      limitations: slides.length === 0 ? ['No readable slide XML entries found in PPTX.'] : [],
    };
  }

  /**
   * Excel (.xlsx / .xls) Extraction with Sheet Names, Tables & Columns
   */
  async extractExcel(buffer, filename, ext) {
    if (!buffer || buffer.length === 0) {
      throw new Error('Empty Excel buffer');
    }

    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheets = [];
    const formattedPieces = [];

    workbook.SheetNames.forEach((sheetName) => {
      const worksheet = workbook.Sheets[sheetName];
      const jsonRows = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
      const csv = XLSX.utils.sheet_to_csv(worksheet);

      const headers = jsonRows.length > 0 ? Object.keys(jsonRows[0]) : [];

      sheets.push({
        name: sheetName,
        rowCount: jsonRows.length,
        headers,
        sampleRows: jsonRows.slice(0, 20),
      });

      let sheetMd = `[Sheet: ${sheetName}] (Total Rows: ${jsonRows.length})\n`;
      if (headers.length > 0 && jsonRows.length > 0) {
        sheetMd += `| ` + headers.join(' | ') + ` |\n`;
        sheetMd += `| ` + headers.map(() => ':---').join(' | ') + ` |\n`;
        jsonRows.slice(0, 15).forEach((row) => {
          sheetMd += `| ` + headers.map((h) => String(row[h] ?? '')).join(' | ') + ` |\n`;
        });
      } else if (csv) {
        sheetMd += csv.slice(0, 2000);
      }
      formattedPieces.push(sheetMd);
    });

    return {
      filename,
      fileType: ext.toUpperCase(),
      extractedText: formattedPieces.join('\n\n'),
      pages: [],
      sections: sheets.map((s) => ({ title: `Sheet: ${s.name}`, content: `${s.rowCount} rows, columns: ${s.headers.join(', ')}` })),
      tables: sheets,
      structuredData: {
        sheetCount: sheets.length,
        sheets,
      },
      metadata: {
        pageCount: sheets.length,
        isScanned: false,
        isOcr: false,
        extractionStatus: 'COMPLETED',
      },
      limitations: [],
    };
  }

  /**
   * CSV / TSV Extraction into Structured Table
   */
  extractCSV(content, filename, ext) {
    const parsed = this.parseCSV(content);

    let tableMd = `[CSV Table: ${filename}] (Total Rows: ${parsed.rowCount})\n`;
    if (parsed.headers.length > 0 && parsed.sampleRows.length > 0) {
      tableMd += `| ` + parsed.headers.join(' | ') + ` |\n`;
      tableMd += `| ` + parsed.headers.map(() => ':---').join(' | ') + ` |\n`;
      parsed.sampleRows.slice(0, 20).forEach((row) => {
        tableMd += `| ` + parsed.headers.map((h) => String(row[h] ?? '')).join(' | ') + ` |\n`;
      });
    }

    return {
      filename,
      fileType: ext.toUpperCase(),
      extractedText: `${tableMd}\n\n${content.slice(0, 10000)}`,
      pages: [],
      sections: [],
      tables: [parsed],
      structuredData: parsed,
      metadata: {
        pageCount: 1,
        isScanned: false,
        isOcr: false,
        extractionStatus: 'COMPLETED',
      },
      limitations: [],
    };
  }

  /**
   * Image Extraction with Genuine Pixel Telemetry & OCR Engine
   */
  async extractImage(buffer, filename, ext) {
    try {
      const img = await imageProcessor.processImage({
        filename,
        buffer,
      });

      const hasText = Boolean(img.ocr?.text && img.ocr.text.length > 5);
      const textSummary = `[Visual Asset: ${filename} | ${img.detectedType} | ${img.dimensions.width}x${img.dimensions.height}px | ${img.visualMetrics.theme}]\n` +
        (hasText ? `[OCR Extracted Text]:\n${img.ocr.text}` : `[Visual Characteristics]: ${img.layoutZones.layoutStructure}, ${img.visualMetrics.dominantColors.join(', ')} tones.`);

      return {
        filename,
        fileType: 'IMAGE',
        extractedText: textSummary,
        pages: [{ pageNumber: 1, text: img.ocr?.text || '' }],
        sections: [
          { title: 'Visual Telemetry', content: `${img.dimensions.width}x${img.dimensions.height}px, ${img.visualMetrics.theme}, ${img.layoutZones.layoutStructure}` },
        ],
        tables: [],
        structuredData: {
          format: img.format,
          dimensions: img.dimensions,
          visualMetrics: img.visualMetrics,
          layoutZones: img.layoutZones,
          detectedType: img.detectedType,
          ocrConfidence: img.ocr.confidence,
          isOcr: hasText,
        },
        metadata: {
          pageCount: 1,
          isScanned: true,
          isOcr: hasText,
          extractionStatus: 'COMPLETED',
        },
        limitations: img.limitations || [],
      };
    } catch (err) {
      logger.warn(`[Document Processor] Image extraction notice for ${filename}:`, err.message);
      return {
        filename,
        fileType: 'IMAGE',
        extractedText: `[Image: ${filename} - extraction notice: ${err.message}]`,
        pages: [{ pageNumber: 1, text: '' }],
        sections: [],
        tables: [],
        structuredData: {},
        metadata: { pageCount: 1, isScanned: false, isOcr: false, extractionStatus: 'FAILED' },
        limitations: [err.message],
      };
    }
  }

  /**
   * OCR execution wrapper with safety timeout
   */
  async runOCR(buffer, filename) {
    if (!buffer || buffer.length === 0) return { text: '', confidence: 0 };
    try {
      const { createWorker } = await import('tesseract.js');
      const worker = await createWorker('eng');
      const ret = await Promise.race([
        worker.recognize(buffer),
        new Promise((_, reject) => setTimeout(() => reject(new Error('OCR Timeout (12s)')), 12000)),
      ]);
      await worker.terminate().catch(() => {});
      return {
        text: (ret.data?.text || '').trim(),
        confidence: ret.data?.confidence || 0,
        isOcr: true,
      };
    } catch (err) {
      logger.warn(`[Document Processor] OCR notice for ${filename}: ${err.message}`);
      return { text: '', confidence: 0, isOcr: false, error: err.message };
    }
  }

  /**
   * Plain text / markdown extraction
   */
  extractPlainText(content, filename, ext) {
    const cleanText = (content || '').trim();
    return {
      filename,
      fileType: (ext || 'TXT').toUpperCase(),
      extractedText: cleanText,
      pages: [],
      sections: this.detectSectionsFromText(cleanText),
      tables: [],
      structuredData: { charCount: cleanText.length },
      metadata: {
        pageCount: Math.max(1, Math.ceil(cleanText.length / 3000)),
        isScanned: false,
        isOcr: false,
        extractionStatus: 'COMPLETED',
      },
      limitations: [],
    };
  }

  /**
   * Parse CSV helper
   */
  parseCSV(content) {
    const lines = (content || '').split(/\r?\n/).filter((line) => line.trim().length > 0);
    if (lines.length === 0) return { headers: [], rows: [], rowCount: 0, sampleRows: [] };

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
   * Extract markdown headings as sections
   */
  detectSectionsFromText(text) {
    const sections = [];
    const regex = /^(#{1,4})\s+(.+)$/gm;
    let match;
    while ((match = regex.exec(text)) !== null) {
      sections.push({
        level: match[1].length,
        title: match[2].trim(),
      });
    }
    return sections;
  }
}

export const documentProcessor = new DocumentProcessor();
export default documentProcessor;
