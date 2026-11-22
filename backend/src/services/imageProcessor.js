import sharp from 'sharp';
import { logger } from '../utils/logger.js';

// Optimize libvips native memory for low-memory micro-containers (Render 512MB RAM)
try {
  sharp.cache(false);
  sharp.concurrency(1);
} catch (_) {}

const MAX_IMAGE_SIZE = 25 * 1024 * 1024; // 25MB Security Limit
const SUPPORTED_EXTENSIONS = new Set(['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg']);
const SUPPORTED_MIMES = new Set([
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'image/gif',
  'image/svg+xml',
]);

class ImageProcessor {
  /**
   * Genuine Pixel & Visual Telemetry Extraction Engine
   * Validates image format, size, and integrity.
   * Extracts dimensions, color palette, theme, spatial zones, and OCR text.
   */
  async processImage({
    filename = 'image.png',
    mimeType = 'image/png',
    base64Content = null,
    buffer = null,
    size = 0,
    rawText = '',
  }) {
    const ext = (filename.split('.').pop() || 'png').toLowerCase();

    // 1. Validation: MIME & Extension Check
    const isExtensionSupported = SUPPORTED_EXTENSIONS.has(ext);
    const isMimeSupported = SUPPORTED_MIMES.has(mimeType.toLowerCase()) || mimeType.startsWith('image/');

    if (!isExtensionSupported && !isMimeSupported) {
      throw new Error(`Unsupported image format: ".${ext}" (${mimeType}). Supported formats: PNG, JPG, JPEG, WEBP.`);
    }

    // 2. Buffer Resolution
    let imgBuffer = buffer;
    if (!imgBuffer) {
      if (base64Content) {
        // Strip data URL scheme if present (e.g., data:image/png;base64,...)
        const cleanBase64 = base64Content.includes(',')
          ? base64Content.split(',')[1]
          : base64Content;
        imgBuffer = Buffer.from(cleanBase64, 'base64');
      } else if (rawText) {
        imgBuffer = Buffer.from(rawText, 'utf8');
      }
    }

    if (!imgBuffer || imgBuffer.length === 0) {
      throw new Error(`Empty image payload received for "${filename}".`);
    }

    // 3. Validation: Size Enforcement (25MB Limit)
    const effectiveSize = size || imgBuffer.length;
    if (effectiveSize > MAX_IMAGE_SIZE) {
      throw new Error(
        `Image "${filename}" size (${(effectiveSize / (1024 * 1024)).toFixed(1)}MB) exceeds maximum allowable 25MB limit.`
      );
    }

    // 4. File Integrity & Metadata Inspection via Sharp
    let sharpInstance;
    let metadata;
    try {
      sharpInstance = sharp(imgBuffer);
      metadata = await sharpInstance.metadata();
    } catch (err) {
      throw new Error(`Corrupted or invalid image file "${filename}": ${err.message}`);
    }

    if (!metadata || !metadata.width || !metadata.height) {
      throw new Error(`Failed to decode visual dimensions for "${filename}". Invalid image structure.`);
    }

    const width = metadata.width;
    const height = metadata.height;
    const aspectRatio = (width / height).toFixed(2);
    const orientation = width > height ? 'Landscape' : (width < height ? 'Portrait' : 'Square');

    // 5. Pixel Statistics & Color Telemetry
    let stats = null;
    let luminance = 128;
    let theme = 'Dark Theme';
    let dominantColorHues = [];
    let contrastIndex = 50;
    let isMonochrome = false;

    try {
      stats = await sharpInstance.stats();
      if (stats.channels && stats.channels.length >= 3) {
        const rMean = stats.channels[0].mean || 0;
        const gMean = stats.channels[1].mean || 0;
        const bMean = stats.channels[2].mean || 0;

        // ITU-R BT.601 Perceived Luminance
        luminance = Math.round(0.299 * rMean + 0.587 * gMean + 0.114 * bMean);
        theme = luminance < 128 ? 'Dark Theme' : 'Light Theme';

        // Check channel variance for monochrome detection
        const varianceRGB = Math.abs(rMean - gMean) + Math.abs(gMean - bMean) + Math.abs(rMean - bMean);
        isMonochrome = varianceRGB < 15;

        // Calculate contrast index based on standard deviation
        const rStdev = stats.channels[0].stdev || 0;
        const gStdev = stats.channels[1].stdev || 0;
        const bStdev = stats.channels[2].stdev || 0;
        contrastIndex = Math.round((rStdev + gStdev + bStdev) / 3);

        // Identify prominent color profile
        if (isMonochrome) {
          dominantColorHues = luminance > 200 ? ['High-Key White', 'Light Gray'] : (luminance < 60 ? ['Deep Black', 'Charcoal'] : ['Neutral Grayscale']);
        } else {
          const colors = [];
          if (rMean > 140 && rMean > gMean + 20) colors.push('Warm Red / Coral');
          if (gMean > 140 && gMean > rMean + 20) colors.push('Emerald / Green');
          if (bMean > 140 && bMean > rMean + 20) colors.push('Electric Blue / Cyan');
          if (rMean > 140 && bMean > 140 && gMean < 120) colors.push('Neon Magenta / Purple');
          if (rMean > 160 && gMean > 140 && bMean < 100) colors.push('Amber / Gold');
          dominantColorHues = colors.length > 0 ? colors : ['Multi-Hue Balanced'];
        }
      }
    } catch (statErr) {
      logger.warn(`[ImageProcessor] Sharp stats failed for ${filename}:`, statErr.message);
    }

    // 6. Spatial Layout Zone Analysis
    const layoutZones = await this.analyzeLayoutZones(imgBuffer, width, height, luminance);

    // 7. OCR Text Extraction via Tesseract
    const ocrResult = await this.runOCR(imgBuffer, filename);

    // 8. Heuristic Visual Category Classification
    const detectedType = this.classifyVisualType({
      ocrText: ocrResult.text,
      width,
      height,
      aspectRatio,
      layoutZones,
      theme,
      isMonochrome,
    });

    const base64Encoded = imgBuffer.toString('base64');
    const dataUrl = `data:${mimeType || 'image/png'};base64,${base64Encoded}`;

    return {
      filename,
      fileType: 'IMAGE',
      format: (metadata.format || ext).toUpperCase(),
      mimeType: mimeType || `image/${metadata.format || 'png'}`,
      size: effectiveSize,
      dimensions: {
        width,
        height,
        aspectRatio,
        orientation,
      },
      visualMetrics: {
        luminance,
        theme,
        contrastIndex,
        isMonochrome,
        dominantColors: dominantColorHues,
        estimatedWcagContrast: (contrastIndex > 45 ? 'Compliant (> 4.5:1)' : 'Borderline / Low Contrast (< 4.5:1)'),
      },
      layoutZones,
      detectedType,
      ocr: {
        hasText: ocrResult.text.length > 5,
        text: ocrResult.text,
        wordsCount: ocrResult.text ? ocrResult.text.split(/\s+/).filter(Boolean).length : 0,
        confidence: ocrResult.confidence,
        lines: ocrResult.lines || [],
      },
      base64: base64Encoded,
      dataUrl,
      limitations: [],
    };
  }

  /**
   * Analyze layout zones: Header, Body, Sidebar, Footer
   */
  async analyzeLayoutZones(imgBuffer, width, height, baseLuminance) {
    const zones = {
      hasHeaderBar: false,
      headerLuminance: null,
      hasFooterBar: false,
      footerLuminance: null,
      hasSidebar: false,
      sidebarLuminance: null,
      layoutStructure: 'Standard Single Column',
    };

    try {
      // 1. Header Region (Top 10-12%)
      const headerH = Math.max(10, Math.round(height * 0.10));
      const headerBuf = await sharp(imgBuffer)
        .extract({ left: 0, top: 0, width, height: headerH })
        .toBuffer();
      const headerStats = await sharp(headerBuf).stats();

      if (headerStats.channels && headerStats.channels.length >= 3) {
        const hLum = Math.round(
          0.299 * headerStats.channels[0].mean +
          0.587 * headerStats.channels[1].mean +
          0.114 * headerStats.channels[2].mean
        );
        zones.headerLuminance = hLum;
        // Measurable variance in header brightness indicates a distinct top navigation / header bar
        zones.hasHeaderBar = Math.abs(hLum - baseLuminance) >= 4;
      }

      // 2. Sidebar Region (Left 20% on landscape images)
      if (width > height) {
        const sidebarW = Math.max(10, Math.round(width * 0.20));
        const sidebarBuf = await sharp(imgBuffer)
          .extract({ left: 0, top: 0, width: sidebarW, height })
          .toBuffer();
        const sidebarStats = await sharp(sidebarBuf).stats();

        if (sidebarStats.channels && sidebarStats.channels.length >= 3) {
          const sLum = Math.round(
            0.299 * sidebarStats.channels[0].mean +
            0.587 * sidebarStats.channels[1].mean +
            0.114 * sidebarStats.channels[2].mean
          );
          zones.sidebarLuminance = sLum;
          zones.hasSidebar = Math.abs(sLum - baseLuminance) >= 8;
        }
      }

      // 3. Footer Region (Bottom 12%)
      const footerH = Math.max(10, Math.round(height * 0.12));
      const footerTop = height - footerH;
      const footerBuf = await sharp(imgBuffer)
        .extract({ left: 0, top: footerTop, width, height: footerH })
        .toBuffer();
      const footerStats = await sharp(footerBuf).stats();

      if (footerStats.channels && footerStats.channels.length >= 3) {
        const fLum = Math.round(
          0.299 * footerStats.channels[0].mean +
          0.587 * footerStats.channels[1].mean +
          0.114 * footerStats.channels[2].mean
        );
        zones.footerLuminance = fLum;
        zones.hasFooterBar = Math.abs(fLum - baseLuminance) >= 8;
      }

      if (zones.hasHeaderBar && zones.hasSidebar) {
        zones.layoutStructure = 'Application Dashboard (Header + Sidebar + Canvas)';
      } else if (zones.hasHeaderBar) {
        zones.layoutStructure = 'Website Layout (Top Navigation Header + Main Content)';
      } else if (zones.hasSidebar) {
        zones.layoutStructure = 'Sidebar Navigation Workspace';
      }
    } catch (err) {
      logger.warn('[ImageProcessor] Zone extraction notice:', err.message);
    }

    return zones;
  }

  /**
   * Run OCR via Tesseract with safety timeout
   */
  async runOCR(buffer, filename) {
    if (!buffer || buffer.length === 0) return { text: '', confidence: 0, lines: [] };
    try {
      const { createWorker } = await import('tesseract.js');
      const worker = await createWorker('eng');
      const ret = await Promise.race([
        worker.recognize(buffer),
        new Promise((_, reject) => setTimeout(() => reject(new Error('OCR Timeout')), 18000)),
      ]);
      await worker.terminate().catch(() => {});

      const rawText = ret?.data?.text || '';
      const confidence = ret?.data?.confidence || 0;
      const lines = (ret?.data?.lines || [])
        .map((l) => (l.text || '').trim())
        .filter((l) => l.length > 0);

      const cleanText = rawText.replace(/\r\n/g, '\n').trim();
      return {
        text: cleanText,
        confidence: Math.round(confidence),
        lines,
      };
    } catch (ocrErr) {
      logger.warn(`[ImageProcessor] OCR fallback notice for ${filename}:`, ocrErr.message);
      return { text: '', confidence: 0, lines: [] };
    }
  }

  /**
   * Heuristic visual classifier combining OCR tokens, dimensions, and layout
   */
  classifyVisualType({ ocrText = '', width, height, aspectRatio, layoutZones, theme, isMonochrome }) {
    const textLower = ocrText.toLowerCase();

    // 1. Chart / Graph Signals (High specificity)
    const chartKeywords = /(chart|graph|trend|revenue|growth|sales|axis|legend|q1|q2|q3|q4|percentage|%|usd|inr|\$\d+|\d+k|\d+m|bar chart|line chart|pie chart)/i;
    const hasNumbersAndAxes =
      (textLower.match(/\d+%/g) || []).length >= 2 ||
      (textLower.match(/\b(202\d|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\b/g) || []).length >= 2 ||
      (textLower.match(/\b(q[1-4])\b/g) || []).length >= 2;
    if (chartKeywords.test(textLower) && hasNumbersAndAxes) {
      return 'CHART_GRAPH';
    }

    // 2. Website UI Signals (Headers, Navbars, Buttons, Pricing, Login, Dashboard)
    const websiteKeywords = /(home|login|sign in|sign up|dashboard|pricing|about us|contact us|navigation|navbar|search\.\.\.|menu|footer|copyright|terms of service|blog|products)/i;
    if (websiteKeywords.test(textLower) || (layoutZones.hasHeaderBar && (aspectRatio > 1.2 || width >= 1024))) {
      return 'WEBSITE_UI';
    }

    // 3. Mobile / Desktop Application Screenshot
    const appKeywords = /(settings|profile|inbox|notifications|messages|account|mission control|approval center|task|agent|filter|save changes|cancel|confirm)/i;
    if (appKeywords.test(textLower) || layoutZones.hasSidebar || aspectRatio < 0.75) {
      return 'APP_SCREENSHOT';
    }

    // 4. Diagram / Flowchart Signals
    const diagramKeywords = /(flowchart|workflow|architecture|dataflow|pipeline|step \d+|input|output|database|server|client|api|gateway|lambda|docker|kubernetes|node|arrow|start|end)/i;
    const hasDirectionalFlow = /-->|->|<-|==>|process|decision|stage/i.test(textLower);
    if (diagramKeywords.test(textLower) || hasDirectionalFlow) {
      return 'DIAGRAM_FLOWCHART';
    }

    // 5. Document / Table Photographed as Image
    const isDocDensity = ocrText.length > 250 && !layoutZones.hasHeaderBar;
    const tableKeywords = /(table|invoice|receipt|statement|balance|total|amount|due date|description|qty|subtotal|tax)/i;
    if (tableKeywords.test(textLower) || isDocDensity) {
      return 'TABLE_DOCUMENT';
    }

    // 6. Product Image
    if (aspectRatio >= 0.8 && aspectRatio <= 1.25 && ocrText.length < 50 && !isMonochrome) {
      return 'PRODUCT_IMAGE';
    }

    // 7. General Photograph / Graphic
    return 'GENERAL_PHOTOGRAPH';
  }
}

export const imageProcessor = new ImageProcessor();
export default imageProcessor;
