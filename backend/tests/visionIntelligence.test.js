import sharp from 'sharp';
import imageProcessor from '../src/services/imageProcessor.js';
import visionAgent from '../src/agents/visionAgent.js';
import universalIntentService, { CATEGORIES } from '../src/services/universalIntentService.js';
import { buildUniversalResponse } from '../src/services/universalResponseBuilder.js';

describe('DOERA AI — Vision Agent & Universal Image Understanding Suite', () => {
  let websiteUIPngBuffer;
  let chartJpgBuffer;
  let lightThemeWebpBuffer;

  beforeAll(async () => {
    // 1. Generate in-memory dark theme Website UI PNG with Header, Nav, Cards, and Text
    const darkSvg = `
      <svg width="1200" height="800" xmlns="http://www.w3.org/2000/svg">
        <rect width="1200" height="800" fill="#08050B"/>
        <!-- Top Navigation Header -->
        <rect width="1200" height="80" fill="#1B0E23"/>
        <text x="40" y="50" font-family="Arial" font-size="24" font-weight="bold" fill="#FF55BD">DOERA AI Engine</text>
        <text x="800" y="50" font-family="Arial" font-size="16" fill="#EDE4EE">Dashboard  Pricing  Login  Settings</text>
        <!-- Main Content Cards -->
        <rect x="40" y="140" width="540" height="300" rx="16" fill="#150C1C" stroke="#361744" stroke-width="2"/>
        <text x="70" y="190" font-family="Arial" font-size="20" font-weight="bold" fill="#FFFFFF">Autonomous Agent Orchestrator</text>
        <text x="70" y="230" font-family="Arial" font-size="14" fill="#B9AEBE">Status: Operational across 7 real-time nodes.</text>
        <rect x="70" y="260" width="160" height="40" rx="8" fill="#FF55BD"/>
        <text x="100" y="285" font-family="Arial" font-size="14" font-weight="bold" fill="#FFFFFF">Launch Task</text>

        <rect x="620" y="140" width="540" height="300" rx="16" fill="#150C1C" stroke="#361744" stroke-width="2"/>
        <text x="650" y="190" font-family="Arial" font-size="20" font-weight="bold" fill="#FFFFFF">Mission Control Real-Time Telemetry</text>
        <text x="650" y="230" font-family="Arial" font-size="14" fill="#B9AEBE">Proof of Execution hashes and live tracking.</text>
      </svg>
    `;
    websiteUIPngBuffer = await sharp(Buffer.from(darkSvg)).png().toBuffer();

    // 2. Generate in-memory Chart / Graph JPEG
    const chartSvg = `
      <svg width="800" height="600" xmlns="http://www.w3.org/2000/svg">
        <rect width="800" height="600" fill="#0E0715"/>
        <text x="40" y="50" font-family="Arial" font-size="22" font-weight="bold" fill="#FF55BD">Quarterly Revenue Growth Trend</text>
        <!-- Axes -->
        <line x1="80" y1="500" x2="720" y2="500" stroke="#726778" stroke-width="2"/>
        <line x1="80" y1="100" x2="80" y2="500" stroke="#726778" stroke-width="2"/>
        <!-- Labels -->
        <text x="140" y="530" font-family="Arial" font-size="14" fill="#EDE4EE">Q1 2026</text>
        <text x="290" y="530" font-family="Arial" font-size="14" fill="#EDE4EE">Q2 2026</text>
        <text x="440" y="530" font-family="Arial" font-size="14" fill="#EDE4EE">Q3 2026</text>
        <text x="590" y="530" font-family="Arial" font-size="14" fill="#EDE4EE">Q4 2026</text>
        <!-- Bars -->
        <rect x="130" y="320" width="60" height="180" fill="#9C52E8"/>
        <rect x="280" y="240" width="60" height="260" fill="#9C52E8"/>
        <rect x="430" y="180" width="60" height="320" fill="#FF55BD"/>
        <rect x="580" y="110" width="60" height="390" fill="#FF55BD"/>
        <text x="145" y="300" font-family="Arial" font-size="12" fill="#FFFFFF">42%</text>
        <text x="295" y="220" font-family="Arial" font-size="12" fill="#FFFFFF">68%</text>
        <text x="445" y="160" font-family="Arial" font-size="12" fill="#FFFFFF">85%</text>
        <text x="595" y="90" font-family="Arial" font-size="12" fill="#FFFFFF">98%</text>
      </svg>
    `;
    chartJpgBuffer = await sharp(Buffer.from(chartSvg)).jpeg().toBuffer();

    // 3. Generate in-memory Light Theme WebP
    const lightSvg = `
      <svg width="900" height="700" xmlns="http://www.w3.org/2000/svg">
        <rect width="900" height="700" fill="#F8FAFC"/>
        <rect width="900" height="70" fill="#E2E8F0"/>
        <text x="30" y="45" font-family="Arial" font-size="20" font-weight="bold" fill="#0F172A">Enterprise Documentation Portal</text>
        <rect x="30" y="120" width="840" height="400" rx="8" fill="#FFFFFF" stroke="#CBD5E1" stroke-width="1"/>
        <text x="60" y="160" font-family="Arial" font-size="18" fill="#1E293B">API Integration Specifications</text>
        <text x="60" y="200" font-family="Arial" font-size="14" fill="#475569">Detailed REST endpoints, authentication protocols, and webhook payloads.</text>
      </svg>
    `;
    lightThemeWebpBuffer = await sharp(Buffer.from(lightSvg)).webp().toBuffer();
  }, 30000);

  // =========================================================================
  // 1. IMAGE PROCESSOR TESTS (Validation, Pixel Physics, Telemetry, OCR)
  // =========================================================================
  describe('ImageProcessor — Pixel Inspection & Security Validation', () => {
    test('extracts genuine pixel telemetry from website UI PNG', async () => {
      const result = await imageProcessor.processImage({
        filename: 'website_ui.png',
        mimeType: 'image/png',
        buffer: websiteUIPngBuffer,
      });

      expect(result.filename).toBe('website_ui.png');
      expect(result.format).toBe('PNG');
      expect(result.dimensions.width).toBe(1200);
      expect(result.dimensions.height).toBe(800);
      expect(result.dimensions.aspectRatio).toBe('1.50');
      expect(result.dimensions.orientation).toBe('Landscape');
      expect(result.visualMetrics.theme).toBe('Dark Theme');
      expect(result.visualMetrics.luminance).toBeLessThan(120);
      expect(result.layoutZones.hasHeaderBar).toBe(true);
      expect(result.detectedType).toBe('WEBSITE_UI');
      expect(result.ocr.hasText).toBe(true);
      expect(result.ocr.text).toMatch(/DOERA|Dashboard|Pricing|Login/i);
    });

    test('extracts visual metrics from chart JPEG', async () => {
      const result = await imageProcessor.processImage({
        filename: 'revenue_growth.jpg',
        mimeType: 'image/jpeg',
        buffer: chartJpgBuffer,
      });

      expect(result.filename).toBe('revenue_growth.jpg');
      expect(result.format).toBe('JPEG');
      expect(result.dimensions.width).toBe(800);
      expect(result.dimensions.height).toBe(600);
      expect(result.visualMetrics.theme).toBe('Dark Theme');
      expect(result.detectedType).toBe('CHART_GRAPH');
      expect(result.ocr.hasText).toBe(true);
      expect(result.ocr.text).toMatch(/Revenue|Growth|Q1|Q2|Q3|Q4/i);
    });

    test('detects Light Theme on high-luminance WebP image', async () => {
      const result = await imageProcessor.processImage({
        filename: 'documentation.webp',
        mimeType: 'image/webp',
        buffer: lightThemeWebpBuffer,
      });

      expect(result.format).toBe('WEBP');
      expect(result.dimensions.width).toBe(900);
      expect(result.dimensions.height).toBe(700);
      expect(result.visualMetrics.theme).toBe('Light Theme');
      expect(result.visualMetrics.luminance).toBeGreaterThan(150);
      expect(result.ocr.text).toMatch(/Enterprise|Documentation|API|Integration/i);
    });

    test('rejects image files exceeding 25MB security limit', async () => {
      await expect(
        imageProcessor.processImage({
          filename: 'huge_file.png',
          mimeType: 'image/png',
          buffer: websiteUIPngBuffer,
          size: 26 * 1024 * 1024, // 26MB
        })
      ).rejects.toThrow(/exceeds maximum allowable 25MB limit/i);
    });

    test('rejects corrupted or non-image buffers', async () => {
      const corruptBuffer = Buffer.from('NOT_AN_IMAGE_RANDOM_GARBAGE_PAYLOAD');
      await expect(
        imageProcessor.processImage({
          filename: 'corrupted.png',
          mimeType: 'image/png',
          buffer: corruptBuffer,
        })
      ).rejects.toThrow(/Corrupted or invalid image file/i);
    });

    test('rejects unsupported extensions', async () => {
      await expect(
        imageProcessor.processImage({
          filename: 'executable.exe',
          mimeType: 'application/octet-stream',
          buffer: websiteUIPngBuffer,
        })
      ).rejects.toThrow(/Unsupported image format/i);
    });
  });

  // =========================================================================
  // 2. VISION AGENT & DYNAMIC REASONING TESTS
  // =========================================================================
  describe('VisionAgent — Multi-Tier Visual Understanding & Question Answering', () => {
    test('analyzes website UI screenshot and answers specific UI questions', async () => {
      const attachments = [
        {
          name: 'website_ui.png',
          type: 'image/png',
          buffer: websiteUIPngBuffer,
        },
      ];

      const result = await visionAgent.analyzeImage(
        { userRequest: 'Analyze this website UI and inspect the visual hierarchy and alignment' },
        attachments
      );

      expect(result.status).toBe('completed');
      expect(result.imageCount).toBe(1);
      const img = result.images[0];
      expect(img.filename).toBe('website_ui.png');
      expect(img.detectedType).toBe('WEBSITE_UI');
      expect(img.summary).toBeTruthy();
      expect(img.observations.length).toBeGreaterThan(0);
      expect(img.detectedText).toMatch(/DOERA/i);
      expect(img.detailedExplanation).toBeTruthy();
      expect(Array.isArray(img.identifiedIssues)).toBe(true);
      expect(Array.isArray(img.recommendations)).toBe(true);
      expect(img.recommendations.length).toBeGreaterThan(0);
    });

    test('answers different questions on the same image with different detailed explanations', async () => {
      const attachments = [
        {
          name: 'website_ui.png',
          type: 'image/png',
          buffer: websiteUIPngBuffer,
        },
      ];

      // Question A: Accessibility & Contrast
      const resultA = await visionAgent.analyzeImage(
        { userRequest: 'Inspect the color contrast and accessibility compliance of this UI design' },
        attachments
      );

      // Question B: Component Extraction
      const resultB = await visionAgent.analyzeImage(
        { userRequest: 'Extract and list all visible text and interactive component elements' },
        attachments
      );

      expect(resultA.images[0].detailedExplanation).toBeTruthy();
      expect(resultB.images[0].detailedExplanation).toBeTruthy();
      expect(resultA.images[0].detailedExplanation).not.toEqual(resultB.images[0].detailedExplanation);
    });

    test('changing the uploaded image changes the analysis and visual profile accordingly', async () => {
      // Analyze Chart Image
      const chartResult = await visionAgent.analyzeImage(
        { userRequest: 'Explain the trend and values depicted in this chart' },
        [{ name: 'revenue_chart.jpg', type: 'image/jpeg', buffer: chartJpgBuffer }]
      );

      // Analyze Light Theme Documentation Image
      const docResult = await visionAgent.analyzeImage(
        { userRequest: 'Analyze the layout of this documentation page' },
        [{ name: 'documentation.webp', type: 'image/webp', buffer: lightThemeWebpBuffer }]
      );

      expect(chartResult.images[0].detectedType).toBe('CHART_GRAPH');
      expect(chartResult.images[0].visualMetrics.theme).toBe('Dark Theme');
      expect(chartResult.images[0].dimensions.width).toBe(800);

      expect(docResult.images[0].visualMetrics.theme).toBe('Light Theme');
      expect(docResult.images[0].dimensions.width).toBe(900);
      expect(chartResult.images[0].summary).not.toEqual(docResult.images[0].summary);
    });

    test('performs multi-image comparative intelligence when 2+ images are uploaded', async () => {
      const attachments = [
        { name: 'dark_dashboard.png', type: 'image/png', buffer: websiteUIPngBuffer },
        { name: 'light_portal.webp', type: 'image/webp', buffer: lightThemeWebpBuffer },
      ];

      const result = await visionAgent.analyzeImage(
        { userRequest: 'Compare these two interface designs and recommend the superior design for data visibility' },
        attachments
      );

      expect(result.imageCount).toBe(2);
      expect(result.comparison).not.toBeNull();
      expect(result.comparison.summary).toBeTruthy();
      expect(Array.isArray(result.comparison.matrix)).toBe(true);
      expect(result.comparison.matrix.length).toBeGreaterThan(0);
      expect(result.comparison.recommendation).toBeTruthy();
    }, 60000);
  });

  // =========================================================================
  // 3. INTENT UNDERSTANDING & UNIVERSAL RESPONSE BUILDER INTEGRATION
  // =========================================================================
  describe('Universal Intent & Response Integration', () => {
    test('classifies image attachment request as IMAGE_ANALYSIS category and assigns Vision agent', async () => {
      const attachments = [
        { name: 'ui_mockup.png', type: 'image/png', size: 102400 },
      ];

      const intent = await universalIntentService.understandRequest(
        'Analyze this website UI and point out design flaws',
        attachments
      );

      expect(intent.categories).toContain(CATEGORIES.IMAGE_ANALYSIS);
      expect(intent.primaryCategory).toBe(CATEGORIES.IMAGE_ANALYSIS);
      expect(intent.requiredAgents).toContain('Vision');
      expect(intent.isActionTask).toBe(true);
    });

    test('buildUniversalResponse formats full structured vision markdown dossier', () => {
      const task = {
        category: 'IMAGE_ANALYSIS',
        userRequest: 'Analyze this website UI design',
        status: 'COMPLETED',
        discoveredData: {
          vision: [
            {
              filename: 'dashboard.png',
              format: 'PNG',
              dimensions: { width: 1200, height: 800, aspectRatio: '1.50', orientation: 'Landscape' },
              visualMetrics: {
                theme: 'Dark Theme',
                luminance: 42,
                dominantColors: ['Neon Magenta / Purple', 'Charcoal'],
                contrastIndex: 65,
                estimatedWcagContrast: 'Compliant (> 4.5:1)',
              },
              layoutZones: { layoutStructure: 'Application Dashboard (Header + Sidebar + Canvas)' },
              detectedType: 'WEBSITE_UI',
              ocr: { wordsCount: 28, confidence: 94, text: 'DOERA AI Dashboard Home Pricing' },
              summary: 'Modern dark-themed application dashboard with top navigation bar and active worker cards.',
              observations: [
                { category: 'Layout & Alignment', observation: '1200x800px landscape layout with symmetrical cards.' },
                { category: 'Color Palette & Contrast', observation: 'Dark theme (#08050B) with high-contrast neon accents.' },
              ],
              detectedText: 'DOERA AI Dashboard Home Pricing',
              detailedExplanation: 'The layout provides strong focal hierarchy through neon accent buttons.',
              identifiedIssues: [
                { title: 'Subtle Secondary Text Contrast', severity: 'Low', location: 'Subtitles', visualEvidence: 'Small muted gray font size.' },
              ],
              recommendations: [
                'Increase subtitle font size from 12px to 14px for improved scannability.',
              ],
              limitations: [],
            },
          ],
        },
      };

      const responseMd = buildUniversalResponse(task);

      expect(responseMd).toContain('Image Analysis: dashboard.png');
      expect(responseMd).toContain('Visual Asset Profile');
      expect(responseMd).toContain('`WEBSITE_UI`');
      expect(responseMd).toContain('Dark Theme');
      expect(responseMd).toContain('Grounded Visual Observations');
      expect(responseMd).toContain('Detected Text (OCR Transcript)');
      expect(responseMd).toContain('Identified Visual & UX Issues');
      expect(responseMd).toContain('Actionable Recommendations');
      expect(responseMd).toContain('Increase subtitle font size');
    });
  });
});
