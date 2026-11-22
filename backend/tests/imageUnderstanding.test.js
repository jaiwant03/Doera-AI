import assert from 'assert';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import visionAgent from '../src/agents/visionAgent.js';
import { buildVisionResponse, buildUniversalResponse } from '../src/services/universalResponseBuilder.js';
import conversationContextEngine from '../src/services/conversationContextEngine.js';
import universalIntentService from '../src/services/universalIntentService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runTests() {
  console.log('================================================================');
  console.log('🧪 DOERA AI — Comprehensive Image Understanding Test Suite');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function test(name, fn) {
    try {
      fn();
      console.log(`  ✅ [PASS] ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ❌ [FAIL] ${name}:`, err.message);
      failed++;
    }
  }

  async function asyncTest(name, fn) {
    try {
      await fn();
      console.log(`  ✅ [PASS] ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ❌ [FAIL] ${name}:`, err.message);
      failed++;
    }
  }

  // Find a test image in user uploaded artifacts
  const userUploadsDir = 'C:/Users/JAIWANT KARRUN.S.A/.gemini/antigravity/brain/53256e6f-5d1b-4d0d-b1cb-d1a42dd7e71d/.user_uploaded';
  const testImagePath1 = path.join(userUploadsDir, 'media_1795327500895_4b12c28a.jpg');
  const testImagePath2 = path.join(userUploadsDir, 'media_1795327462026_97ae5723.jpg');

  const hasImage1 = fs.existsSync(testImagePath1);
  const hasImage2 = fs.existsSync(testImagePath2);
  console.log(`Found test image 1: ${hasImage1}`);
  console.log(`Found test image 2: ${hasImage2}\n`);

  // Section A: Intent Classification Coverage (All 11 Intents)
  console.log('--- SECTION A: Intent Classification (11 Intents) ---');

  test('Intent: GENERAL_IMAGE_DESCRIPTION', () => {
    const intent = visionAgent.classifyVisionQuery('What is this uploaded image about?');
    assert.strictEqual(intent, 'GENERAL_IMAGE_DESCRIPTION');
  });

  test('Intent: IMAGE_CONTENT_IDENTIFICATION', () => {
    const intent = visionAgent.classifyVisionQuery('Describe everything visible in this image.');
    assert.strictEqual(intent, 'IMAGE_CONTENT_IDENTIFICATION');
  });

  test('Intent: IMAGE_TEXT_EXTRACTION', () => {
    const intent = visionAgent.classifyVisionQuery('Extract all text from this screenshot.');
    assert.strictEqual(intent, 'IMAGE_TEXT_EXTRACTION');
  });

  test('Intent: UI_IMPROVEMENT_SUGGESTIONS', () => {
    const intent = visionAgent.classifyVisionQuery('Analyze this website screenshot and suggest improvements.');
    assert.strictEqual(intent, 'UI_IMPROVEMENT_SUGGESTIONS');
  });

  test('Intent: DIAGRAM_EXPLANATION', () => {
    const intent = visionAgent.classifyVisionQuery('What does this flowchart diagram explain?');
    assert.strictEqual(intent, 'DIAGRAM_EXPLANATION');
  });

  test('Intent: CHART_OR_GRAPH_INTERPRETATION', () => {
    const intent = visionAgent.classifyVisionQuery('Explain the trends in this chart.');
    assert.strictEqual(intent, 'CHART_OR_GRAPH_INTERPRETATION');
  });

  test('Intent: OBJECT_IDENTIFICATION', () => {
    const intent = visionAgent.classifyVisionQuery('What objects and elements are visible in this photograph?');
    assert.strictEqual(intent, 'OBJECT_IDENTIFICATION');
  });

  test('Intent: IMAGE_COMPARISON', () => {
    const intent = visionAgent.classifyVisionQuery('Compare these two uploaded screenshots.');
    assert.strictEqual(intent, 'IMAGE_COMPARISON');
  });

  test('Intent: SPECIFIC_VISUAL_QUESTION (Corner check)', () => {
    const intent = visionAgent.classifyVisionQuery('What is written in the top-right corner?');
    assert.strictEqual(intent, 'SPECIFIC_VISUAL_QUESTION');
  });

  test('Intent: SPECIFIC_VISUAL_QUESTION (Headline meaning)', () => {
    const intent = visionAgent.classifyVisionQuery('What does the headline mean?');
    assert.strictEqual(intent, 'SPECIFIC_VISUAL_QUESTION');
  });

  test('Intent: UI_DESIGN_REVIEW', () => {
    const intent = visionAgent.classifyVisionQuery('Give me a UI design review of this landing page.');
    assert.strictEqual(intent, 'UI_DESIGN_REVIEW');
  });

  // Section B: 10 Required Scenarios from Section 10
  console.log('\n--- SECTION B: 10 Scenarios from Section 10 ---');

  const dummyImage1 = {
    filename: 'ai_infrastructure_landing_page.jpg',
    url: testImagePath1,
    mimeType: 'image/jpeg',
    ocrText: 'Real-time AI infrastructure that scales with you Deploy autonomous agent swarms, real-time web execution, deep research, and instant scheduling with verified human-in-the-loop controls. Built for teams that need reliability at scale. TRY IT NOW BOOK A DEMO CLICK AND HOLD',
  };

  const dummyImage2 = {
    filename: 'doera_workspace_banner.jpg',
    url: testImagePath2,
    mimeType: 'image/jpeg',
    ocrText: 'DOERA AI Ready to automate your daily tasks? Join thousands experiencing next-generation autonomous AI execution today. Launch DOERA AI Workspace',
  };

  await asyncTest('Scenario 1: Website screenshot -> "What is this uploaded image about?"', async () => {
    const taskContext = {
      userRequest: 'What is this uploaded image about?',
    };
    const res = await visionAgent.analyzeImage(taskContext, [dummyImage1]);
    assert.strictEqual(res.intentType, 'GENERAL_IMAGE_DESCRIPTION');
    assert.ok(res.formattedAnswer.includes('infrastructure') || res.formattedAnswer.includes('landing page'));
    assert.ok(res.formattedAnswer.includes('scales with you') || res.formattedAnswer.includes('autonomous'));
    assert.ok(res.formattedAnswer.includes('BOOK A DEMO') || res.formattedAnswer.includes('TRY IT NOW') || res.formattedAnswer.includes('action button'));
    assert.ok(res.formattedAnswer.includes('Overall:'));
    // Strict prohibition checks: No unrequested telemetry or fake WCAG
    assert.ok(!res.formattedAnswer.includes('Visual Asset Profile'));
    assert.ok(!res.formattedAnswer.includes('Contrast Index'));
    assert.ok(!res.formattedAnswer.includes('Authorize & Execute'));
  });

  await asyncTest('Scenario 2: Same image -> "Describe everything visible in this image."', async () => {
    const taskContext = {
      userRequest: 'Describe everything visible in this image.',
    };
    const res = await visionAgent.analyzeImage(taskContext, [dummyImage1]);
    assert.strictEqual(res.intentType, 'IMAGE_CONTENT_IDENTIFICATION');
    assert.ok(res.formattedAnswer.includes('Layout') || res.formattedAnswer.includes('Composition') || res.formattedAnswer.includes('structure'));
    assert.ok(res.formattedAnswer.includes('Theme') || res.formattedAnswer.includes('Color') || res.formattedAnswer.includes('dark'));
    assert.ok(res.formattedAnswer.includes('scales with you') || res.formattedAnswer.includes('infrastructure') || res.formattedAnswer.includes('autonomous'));
    assert.ok(!res.formattedAnswer.includes('Authorize & Execute'));
  });

  await asyncTest('Scenario 3: Same image -> "Extract all text."', async () => {
    const taskContext = {
      userRequest: 'Extract all text from this image.',
    };
    const res = await visionAgent.analyzeImage(taskContext, [dummyImage1]);
    assert.strictEqual(res.intentType, 'IMAGE_TEXT_EXTRACTION');
    assert.ok(res.formattedAnswer.includes('Text') || res.formattedAnswer.includes('OCR') || res.formattedAnswer.includes('Transcript'));
    assert.ok(res.formattedAnswer.includes('BOOK A DEMO') || res.formattedAnswer.includes('TRY IT NOW') || res.formattedAnswer.includes('research') || res.formattedAnswer.includes('scales'));
  });

  await asyncTest('Scenario 4: Same image -> "Suggest UI improvements."', async () => {
    const taskContext = {
      userRequest: 'Analyze this website screenshot and suggest improvements.',
    };
    const res = await visionAgent.analyzeImage(taskContext, [dummyImage1]);
    assert.strictEqual(res.intentType, 'UI_IMPROVEMENT_SUGGESTIONS');
    assert.ok(res.formattedAnswer.includes('Improvement') || res.formattedAnswer.includes('Suggestions') || res.formattedAnswer.includes('Review') || res.formattedAnswer.includes('Hierarchy'));
    assert.ok(!res.formattedAnswer.includes('Authorize & Execute'));
  });

  const validBuffer = fs.readFileSync(testImagePath1);

  await asyncTest('Scenario 5: Flowchart diagram -> "Explain this diagram."', async () => {
    const taskContext = {
      userRequest: 'Explain this diagram and workflow.',
    };
    const diagramImage = {
      filename: 'workflow_pipeline.jpg',
      buffer: validBuffer,
      ocrText: 'Input Ingestion -> Validation -> Agent Orchestration -> Verification -> Final Output',
    };
    const res = await visionAgent.analyzeImage(taskContext, [diagramImage]);
    assert.strictEqual(res.intentType, 'DIAGRAM_EXPLANATION');
    assert.ok(res.formattedAnswer.includes('Diagram') || res.formattedAnswer.includes('Workflow') || res.formattedAnswer.includes('Process'));
    assert.ok(!res.formattedAnswer.includes('Authorize & Execute'));
  });

  await asyncTest('Scenario 6: Chart -> "Explain the trends in this chart."', async () => {
    const taskContext = {
      userRequest: 'Explain the trends and data in this chart.',
    };
    const chartImage = {
      filename: 'quarterly_revenue.jpg',
      buffer: validBuffer,
      ocrText: 'Quarterly Revenue Q1 $2.1M Q2 $3.4M Q3 $4.8M Q4 $6.2M Annual Growth',
    };
    const res = await visionAgent.analyzeImage(taskContext, [chartImage]);
    assert.strictEqual(res.intentType, 'CHART_OR_GRAPH_INTERPRETATION');
    assert.ok(res.formattedAnswer.includes('Chart') || res.formattedAnswer.includes('Trend') || res.formattedAnswer.includes('data'));
    assert.ok(!res.formattedAnswer.includes('Authorize & Execute'));
  });

  await asyncTest('Scenario 7: Photograph -> "What objects are visible?"', async () => {
    const taskContext = {
      userRequest: 'What objects and elements are visible in this photograph?',
    };
    const res = await visionAgent.analyzeImage(taskContext, [dummyImage1]);
    assert.strictEqual(res.intentType, 'OBJECT_IDENTIFICATION');
    assert.ok(res.formattedAnswer.includes('Objects') || res.formattedAnswer.includes('Elements') || res.formattedAnswer.includes('visible') || res.formattedAnswer.includes('Layout'));
  });

  await asyncTest('Scenario 8: Two screenshots -> "Compare these images."', async () => {
    const taskContext = {
      userRequest: 'Compare these two uploaded screenshots.',
    };
    const res = await visionAgent.analyzeImage(taskContext, [dummyImage1, dummyImage2]);
    assert.strictEqual(res.intentType, 'IMAGE_COMPARISON');
    assert.ok(res.comparison !== null);
    assert.ok(
      res.formattedAnswer.includes('Differences') ||
      res.formattedAnswer.includes('Difference') ||
      res.formattedAnswer.includes('differ') ||
      res.formattedAnswer.includes('Image 1') ||
      res.formattedAnswer.includes('Comparison')
    );
  });

  await asyncTest('Scenario 9: Follow-up question in continuous conversation referencing prior image', async () => {
    // Simulate conversation context holding previous image analysis
    const contextPayload = {
      isFollowUp: true,
      lastVisionAnalysis: {
        images: [dummyImage1],
        primaryImage: dummyImage1,
        formattedAnswer: 'Initial analysis',
      },
    };

    const taskContext = {
      userRequest: 'What does the headline mean?',
      lastVisionAnalysis: contextPayload.lastVisionAnalysis,
      isFollowUp: true,
    };

    // Analyze follow-up using previous image reference without new attachments
    const res = await visionAgent.analyzeImage(taskContext, []);
    assert.strictEqual(res.intentType, 'SPECIFIC_VISUAL_QUESTION');
    assert.strictEqual(res.imageCount, 1);
    assert.ok(res.formattedAnswer.includes('headline') || res.formattedAnswer.includes('infrastructure') || res.formattedAnswer.includes('scales with you') || res.formattedAnswer.includes('real-time'));
  });

  await asyncTest('Scenario 10: Specific question about a region ("What is written in the top-right corner?")' , async () => {
    const taskContext = {
      userRequest: 'What is written in the top-right corner?',
    };
    const res = await visionAgent.analyzeImage(taskContext, [dummyImage1]);
    assert.strictEqual(res.intentType, 'SPECIFIC_VISUAL_QUESTION');
    assert.ok(res.formattedAnswer.length > 20);
    assert.ok(!res.formattedAnswer.includes('Visual Asset Profile'));
    assert.ok(!res.formattedAnswer.includes('Authorize & Execute'));
  });

  // Section C: Universal Response Builder Interception & Clean Formatting
  console.log('\n--- SECTION C: Response Builder Checks ---');

  test('buildUniversalResponse intercepts IMAGE_ANALYSIS without adding verification/next steps', () => {
    const mockTask = {
      category: 'IMAGE_ANALYSIS',
      userRequest: 'What is this uploaded image about?',
      discoveredData: {
        visionFormattedAnswer: '**This image shows a landing page for an AI infrastructure platform.**\n\nIt features a dark background with pink and purple visual elements.',
        visionIntentType: 'GENERAL_IMAGE_DESCRIPTION',
      },
    };

    const response = buildUniversalResponse(mockTask, mockTask.userRequest);
    assert.ok(response.startsWith('**This image shows a landing page for an AI infrastructure platform.**'));
    assert.ok(!response.includes('Evidence & Verification Dimensions'));
    assert.ok(!response.includes('Authorize & Execute'));
    assert.ok(!response.includes('SOURCE_FOUND'));
    assert.ok(!response.includes('Zero-Transaction Guarantee'));
  });

  // Section D: Universal Intent Service Validation
  console.log('\n--- SECTION D: Intent Service Checks ---');

  await asyncTest('universalIntentService classifies image requests with Vision agent and without Action/Verification gate', async () => {
    const intent = await universalIntentService.understandRequest(
      'What is this uploaded image about?',
      [{ name: 'landing.png', type: 'image/png' }]
    );

    assert.ok(intent.categories.includes('IMAGE_ANALYSIS'));
    assert.ok(intent.requiredAgents.includes('Vision'));
    assert.ok(!intent.requiredAgents.includes('Communication'));
    assert.ok(!intent.requiredAgents.includes('Execution'));
    assert.ok(!intent.requiredAgents.includes('Scheduling'));
    assert.ok(!intent.requiredAgents.includes('FollowUp'));
  });

  // Section E: Context Engine Follow-up Detection
  console.log('\n--- SECTION E: Conversation Context Engine ---');

  test('conversationContextEngine recognizes visual follow-ups referencing images', () => {
    const followUp1 = conversationContextEngine.analyzeFollowUpIntent({
      text: 'What does the headline mean?',
      lower: 'what does the headline mean?',
      lastVisionAnalysis: { images: [dummyImage1] },
      rawMessages: [],
    });
    assert.strictEqual(followUp1.isFollowUp, true);
    assert.strictEqual(followUp1.followUpType, 'IMAGE_INSPECTION');

    const followUp2 = conversationContextEngine.analyzeFollowUpIntent({
      text: 'What is written in the top-right corner?',
      lower: 'what is written in the top-right corner?',
      lastVisionAnalysis: { images: [dummyImage1] },
      rawMessages: [],
    });
    assert.strictEqual(followUp2.isFollowUp, true);
    assert.strictEqual(followUp2.followUpType, 'IMAGE_INSPECTION');
  });

  console.log('\n================================================================');
  console.log(`📊 TEST RESULTS: ${passed} Passed, ${failed} Failed`);
  console.log('================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
