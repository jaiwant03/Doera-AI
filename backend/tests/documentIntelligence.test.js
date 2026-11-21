import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import documentProcessor from '../src/services/documentProcessor.js';
import documentAgent from '../src/agents/documentAgent.js';
import universalIntentService from '../src/services/universalIntentService.js';
import { buildUniversalResponse, buildDocumentAnalysisResponse } from '../src/services/universalResponseBuilder.js';
import conversationContextEngine from '../src/services/conversationContextEngine.js';
import Conversation from '../src/models/Conversation.js';
import Message from '../src/models/Message.js';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/doera-ai';

async function runDocumentTests() {
  console.log('=== DOERA AI — UNIVERSAL FILE INTELLIGENCE & DOCUMENT ANALYSIS SUITE ===\n');

  try {
    await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
    console.log('✓ Connected to MongoDB');
  } catch (err) {
    console.warn('⚠️ MongoDB connection note:', err.message);
  }

  let passed = 0;
  let total = 0;

  function assert(condition, message) {
    total++;
    if (condition) {
      passed++;
      console.log(`  ✓ PASS: ${message}`);
    } else {
      console.error(`  ✗ FAIL: ${message}`);
      throw new Error(`Assertion failed: ${message}`);
    }
  }

  // Sample Mock Project Proposal Content
  const mockPptText = `
[Slide 1: Cloud-Native Microservices Architecture Proposal]
Enterprise E-Commerce Modernization Platform
Prepared by: Cloud Architecture Team

[Slide 2: System Architecture Overview]
Frontend: Next.js React 19 Client with Tailwind CSS and Server Components
Backend: Node.js Express API Gateway and Python FastAPI microservices
Database: PostgreSQL for transactional order records, MongoDB for product catalog, Redis cluster for caching
APIs and Integrations: Stripe Payment Gateway REST API, SendGrid Notification API, OAuth2 Authentication
Communication: gRPC inter-service RPC mesh and Apache Kafka event streaming for asynchronous message publishing
System Workflow: Web/Mobile client initiates HTTPS requests to API Gateway, which performs JWT validation and delegates synchronous queries via gRPC to microservices; state mutations publish change events to Apache Kafka topics.

[Slide 3: Technical Requirements & Specifications]
Requirement 1: System must support 10,000 concurrent active checkout sessions.
Requirement 2: API Gateway P99 response latency must remain under 120ms.
Requirement 3: Payment webhook ingestion must guarantee at-least-once delivery with idempotency keys.
Requirement 4: Database clusters must run in multi-AZ automated failover with 15-minute point-in-time recovery.

[Slide 4: Known Architectural Vulnerabilities & Risks]
Weakness 1: Single Point of Failure in API Gateway tier due to single-instance ingress deployment without Anycast load balancing.
Weakness 2: Lack of Asynchronous Dead-Letter Queues (DLQ) in Kafka consumers leads to dropped messages on unhandled schema mismatches.
Weakness 3: Synchronous database connection exhaustion under sudden traffic spikes due to missing client-side connection pooling.

[Slide 5: Implementation Timeline & Milestone Dates]
October 15, 2026: Architecture Design Review & Final Institutional Sign-off
November 1, 2026: Core API Gateway & Microservices Infrastructure Deployment
December 15, 2026: Payment & Kafka Event Streaming End-to-End Integration Testing
January 20, 2027: Enterprise Production Rollout & High-Availability Verification
`;

  // ========================================================
  // TEST GROUP 1: Intent Detection & Agent Routing
  // ========================================================
  console.log('\n--- TEST GROUP 1: Universal Document Intent Classification & Routing ---');

  const intentArch = universalIntentService.deterministicClassify(
    'Analyze this project proposal PPT to examine system architecture, identify weaknesses, and recommend improvements.',
    { hasAttachments: false, isDocAnalysis: true, isDataAnalysis: false, isGeneralKnowledge: false }
  );
  assert(intentArch.primaryCategory === 'DOCUMENT_ANALYSIS', 'Proposal architecture request classified as DOCUMENT_ANALYSIS');
  assert(intentArch.requiredAgents.includes('Document'), 'Document agent activated');
  assert(intentArch.requiredAgents.includes('Verification'), 'Verification agent activated');
  assert(!intentArch.requiredAgents.includes('Planner'), 'Planner agent cleanly excluded for pure document tasks');
  assert(!intentArch.requiredAgents.includes('LocalService'), 'LocalService agent not activated');
  assert(!intentArch.requiredAgents.includes('Scheduling'), 'Scheduling agent not activated');

  const intentSummary = universalIntentService.deterministicClassify(
    'Summarize this PDF report.',
    { hasAttachments: false, isDocAnalysis: true, isDataAnalysis: false, isGeneralKnowledge: false }
  );
  assert(intentSummary.primaryCategory === 'DOCUMENT_ANALYSIS', 'PDF summary classified as DOCUMENT_ANALYSIS');

  const intentDates = universalIntentService.deterministicClassify(
    'Extract all important dates from this document.',
    { hasAttachments: false, isDocAnalysis: true, isDataAnalysis: false, isGeneralKnowledge: false }
  );
  assert(intentDates.primaryCategory === 'DOCUMENT_ANALYSIS', 'Dates extraction classified as DOCUMENT_ANALYSIS');

  const intentSlide = universalIntentService.deterministicClassify(
    'Explain slide 5 in simple terms.',
    { hasAttachments: false, isDocAnalysis: true, isDataAnalysis: false, isGeneralKnowledge: false }
  );
  assert(intentSlide.primaryCategory === 'DOCUMENT_ANALYSIS', 'Slide explanation classified as DOCUMENT_ANALYSIS');

  // ========================================================
  // TEST GROUP 2: Format Support & Document Processor
  // ========================================================
  console.log('\n--- TEST GROUP 2: Multi-Format Extraction Pipeline ---');

  // 1. Text extraction
  const txtProc = await documentProcessor.processContent({
    filename: 'architecture_notes.txt',
    mimeType: 'text/plain',
    rawText: mockPptText,
  });
  assert(txtProc.extractionStatus === 'COMPLETED', 'TXT format extracted with status COMPLETED');
  assert(txtProc.metadata.wordCount > 50, 'TXT word count calculated correctly');

  // 2. CSV extraction
  const csvProc = await documentProcessor.processContent({
    filename: 'test_data.csv',
    mimeType: 'text/csv',
    rawText: 'Item,Price,Quantity\nLaptop,1200,5\nMouse,25,50',
  });
  assert(csvProc.extractionStatus === 'COMPLETED', 'CSV format processed with status COMPLETED');
  assert(csvProc.tables?.length > 0, 'CSV table headers extracted');

  // ========================================================
  // TEST GROUP 3: Request-Specific Grounded Analysis
  // ========================================================
  console.log('\n--- TEST GROUP 3: Request-Specific Grounded Analysis ---');

  // Mock processed document
  const mockProcessed = {
    filename: 'ECommerce_Architecture_Proposal.pptx',
    fileType: 'PPTX',
    extractedText: mockPptText,
    metadata: { pageCount: 5, wordCount: 320, isScanned: false, isOcr: false, extractionStatus: 'COMPLETED' },
    pages: [
      { pageNumber: 1, text: 'Cloud-Native Microservices Architecture Proposal\nEnterprise E-Commerce Modernization Platform' },
      { pageNumber: 2, text: 'System Architecture Overview\nFrontend: Next.js React 19 Client with Tailwind CSS\nBackend: Node.js Express API Gateway and Python FastAPI microservices\nDatabase: PostgreSQL for transactional order records, MongoDB for product catalog, Redis cluster for caching\nAPIs and Integrations: Stripe Payment Gateway REST API, SendGrid Notification API\nCommunication: gRPC inter-service RPC mesh and Apache Kafka event streaming\nSystem Workflow: Web/Mobile client initiates HTTPS requests to API Gateway, routed via gRPC to microservices' },
      { pageNumber: 3, text: 'Technical Requirements & Specifications\nRequirement 1: System must support 10,000 concurrent active checkout sessions.\nRequirement 2: API Gateway P99 response latency must remain under 120ms.\nRequirement 3: Payment webhook ingestion must guarantee at-least-once delivery with idempotency keys.' },
      { pageNumber: 4, text: 'Known Architectural Vulnerabilities & Risks\nWeakness 1: Single Point of Failure in API Gateway tier due to single-instance ingress deployment\nWeakness 2: Lack of Asynchronous Dead-Letter Queues (DLQ) in Kafka consumers leads to dropped messages\nWeakness 3: Synchronous database connection exhaustion under sudden traffic spikes' },
      { pageNumber: 5, text: 'Implementation Timeline & Milestone Dates\nOctober 15, 2026: Architecture Design Review & Final Institutional Sign-off\nNovember 1, 2026: Core API Gateway & Microservices Infrastructure Deployment\nDecember 15, 2026: Payment & Kafka Event Streaming End-to-End Integration Testing\nJanuary 20, 2027: Enterprise Production Rollout & High-Availability Verification' },
    ],
  };

  // 1. Architecture Analysis Request
  const archResult = await documentAgent.extractDocumentIntelligence(
    mockProcessed,
    'Analyze this project proposal PPT to examine system architecture, identify weaknesses, and recommend improvements.'
  );
  assert(archResult.requestIntent === 'ARCHITECTURE_ANALYSIS', 'Request intent recognized as ARCHITECTURE_ANALYSIS');
  assert(Boolean(archResult.architectureAnalysis?.frontend), 'Frontend component extracted with citations');
  assert(Boolean(archResult.architectureAnalysis?.backend), 'Backend component extracted with citations');
  assert(Boolean(archResult.architectureAnalysis?.database), 'Database component extracted with citations');
  assert(Boolean(archResult.architectureAnalysis?.communication), 'Communication broker (Kafka/gRPC) extracted');
  assert(archResult.identifiedWeaknesses?.length >= 2, 'Identified at least 2 architectural weaknesses');
  assert(archResult.recommendations?.length >= 2, 'Generated at least 2 actionable recommendations');

  // Response Builder Formatting for Architecture
  const mockTaskArch = {
    category: 'DOCUMENT_ANALYSIS',
    userRequest: 'Analyze this project proposal PPT to examine system architecture, identify weaknesses, and recommend improvements.',
    discoveredData: {
      documents: [{
        filename: mockProcessed.filename,
        fileType: mockProcessed.fileType,
        pageCount: mockProcessed.metadata.pageCount,
        wordCount: mockProcessed.metadata.wordCount,
        ...archResult,
      }],
    },
  };
  const archResponse = buildUniversalResponse(mockTaskArch);

  assert(archResponse.includes('## Project Proposal Analysis'), 'Response contains ## Project Proposal Analysis');
  assert(archResponse.includes('### Document Analysis'), 'Response contains ### Document Analysis');
  assert(archResponse.includes('### 1. Executive Summary'), 'Response contains ### 1. Executive Summary');
  assert(archResponse.includes('### 2. System Architecture'), 'Response contains ### 2. System Architecture');
  assert(archResponse.includes('### 3. Identified Weaknesses'), 'Response contains ### 3. Identified Weaknesses');
  assert(archResponse.includes('### 4. Recommended Improvements'), 'Response contains ### 4. Recommended Improvements');
  assert(archResponse.includes('### 5. Overall Assessment'), 'Response contains ### 5. Overall Assessment');
  assert(!archResponse.includes('[Slide'), 'Visible [Slide X] citations removed from response');
  assert(!archResponse.includes('[Page'), 'Visible [Page X] citations removed from response');
  assert(archResult.architectureAnalysis.citations?.length > 0 || archResult.identifiedWeaknesses.some(w => w.citation), 'Internal citations preserved in document metadata');

  // ZERO CONTAMINATION AUDIT
  assert(!archResponse.includes('Appointment Status'), 'AUDIT: Zero Appointment Status in response');
  assert(!archResponse.includes('Awaiting Provider Confirmation'), 'AUDIT: Zero Awaiting Provider Confirmation');
  assert(!archResponse.includes('Human Authorization Required'), 'AUDIT: Zero Human Authorization Required');
  assert(!archResponse.includes('Authorize & Execute Action'), 'AUDIT: Zero Authorize & Execute Action');
  assert(!archResponse.includes('SOURCE_FOUND'), 'AUDIT: Zero generic evidence dimensions (SOURCE_FOUND)');
  assert(!archResponse.includes('DOERA-TRACK-PENDING'), 'AUDIT: Zero booking tracking references');

  // 2. Summarization Request
  const sumResult = await documentAgent.extractDocumentIntelligence(
    mockProcessed,
    'Summarize this PDF.'
  );
  assert(sumResult.requestIntent === 'SUMMARIZATION', 'Request intent recognized as SUMMARIZATION');
  const mockTaskSum = {
    category: 'DOCUMENT_ANALYSIS',
    userRequest: 'Summarize this PDF.',
    discoveredData: {
      documents: [{
        filename: mockProcessed.filename,
        fileType: 'PDF',
        pageCount: 5,
        wordCount: 320,
        ...sumResult,
      }],
    },
  };
  const sumResponse = buildUniversalResponse(mockTaskSum);
  assert(sumResponse.includes('## Document Summary'), 'Response contains ## Document Summary');
  assert(sumResponse.includes('### 1. Main Subject'), 'Response contains ### 1. Main Subject');
  assert(sumResponse.includes('### 2. Important Points'), 'Response contains ### 2. Important Points');
  assert(sumResponse.includes('### 3. Key Findings'), 'Response contains ### 3. Key Findings');
  assert(sumResponse.includes('### 4. Conclusion'), 'Response contains ### 4. Conclusion');
  assert(!sumResponse.includes('System Architecture'), 'Summary does NOT include unrequested System Architecture');
  assert(!sumResponse.includes('[Page'), 'Visible [Page X] citations removed from summary');

  // 3. Dates Extraction Request
  const datesResult = await documentAgent.extractDocumentIntelligence(
    mockProcessed,
    'Extract all important dates from this document.'
  );
  assert(datesResult.requestIntent === 'DATES_EXTRACTION', 'Request intent recognized as DATES_EXTRACTION');
  assert(datesResult.datesExtraction?.dates?.length >= 3, 'Extracted at least 3 project milestone dates');
  const mockTaskDates = {
    category: 'DOCUMENT_ANALYSIS',
    userRequest: 'Extract all important dates from this document.',
    discoveredData: {
      documents: [{
        filename: mockProcessed.filename,
        fileType: 'PPTX',
        ...datesResult,
      }],
    },
  };
  const datesResponse = buildUniversalResponse(mockTaskDates);
  assert(datesResponse.includes('## Important Dates & Deadlines'), 'Response contains ## Important Dates & Deadlines');
  assert(datesResponse.includes('October 15, 2026') || datesResponse.includes('November 1, 2026'), 'Extracted real dates from Slide 5');
  assert(!datesResponse.includes('[Slide 5]'), 'Visible citations removed from dates table');
  assert(datesResult.datesExtraction.dates.some(d => d.citation?.includes('Slide 5')), 'Internal citation preserved in dates metadata');

  // 4. Slide 5 Explanation Request
  const slideResult = await documentAgent.extractDocumentIntelligence(
    mockProcessed,
    'Explain slide 5 in simple terms.'
  );
  assert(slideResult.requestIntent === 'SLIDE_EXPLANATION', 'Request intent recognized as SLIDE_EXPLANATION');
  assert(slideResult.slideExplanation?.slideNumber === 5, 'Targeted Slide 5 specifically');
  const mockTaskSlide = {
    category: 'DOCUMENT_ANALYSIS',
    userRequest: 'Explain slide 5 in simple terms.',
    discoveredData: {
      documents: [{
        filename: mockProcessed.filename,
        ...slideResult,
      }],
    },
  };
  const slideResponse = buildUniversalResponse(mockTaskSlide);
  assert(slideResponse.includes('## Slide 5 Explanation'), 'Response contains ## Slide 5 Explanation');
  assert(slideResponse.includes('Key Takeaways'), 'Response includes Key Takeaways');

  // 5. Technical Requirements Extraction
  const reqsResult = await documentAgent.extractDocumentIntelligence(
    mockProcessed,
    'What are the technical requirements mentioned in this PPT?'
  );
  assert(reqsResult.requestIntent === 'REQUIREMENTS_EXTRACTION', 'Request intent recognized as REQUIREMENTS_EXTRACTION');
  const mockTaskReqs = {
    category: 'DOCUMENT_ANALYSIS',
    userRequest: 'What are the technical requirements mentioned in this PPT?',
    discoveredData: {
      documents: [{
        filename: mockProcessed.filename,
        ...reqsResult,
      }],
    },
  };
  const reqsResponse = buildUniversalResponse(mockTaskReqs);
  assert(reqsResponse.includes('## Technical Requirements'), 'Response contains ## Technical Requirements');
  assert(reqsResponse.includes('10,000') || reqsResponse.includes('latency') || reqsResponse.includes('sessions'), 'Requirements extracted from Slide 3');

  // 6. Multi-Document Comparison
  const doc2 = {
    filename: 'Legacy_Monolith_Architecture.docx',
    fileType: 'DOCX',
    pageCount: 3,
    wordCount: 180,
    technologies: ['Ruby on Rails', 'MySQL', 'Sidekiq', 'REST API'],
    extractedText: 'Legacy Monolith Application built with Ruby on Rails and monolithic MySQL database.',
  };
  const comparison = await documentAgent.performMultiDocComparison([mockProcessed, doc2], 'Compare these two project proposal documents.');
  assert(Boolean(comparison.comparisonSummary), 'Comparative summary generated');
  assert(comparison.comparisonMatrix?.length > 0, 'Comparative matrix generated');
  const compResponse = buildDocumentAnalysisResponse([mockProcessed, doc2], comparison, null, 'Compare these two project proposal documents.');
  assert(compResponse.includes('## Document Comparison'), 'Response contains ## Document Comparison');
  assert(compResponse.includes('Comparative Matrix') || compResponse.includes('Side-by-Side Comparison'), 'Response contains Comparative Matrix');

  // 7. Dynamic User Request: "Examine the system architecture and identify weaknesses."
  const archWeakResponse = buildDocumentAnalysisResponse(
    [{ ...mockProcessed, ...archResult }],
    null,
    null,
    'Examine the system architecture and identify weaknesses.'
  );
  assert(archWeakResponse.includes('System Architecture'), 'Dynamic Architecture & Weaknesses: System Architecture present');
  assert(archWeakResponse.includes('Identified Weaknesses'), 'Dynamic Architecture & Weaknesses: Identified Weaknesses present');
  assert(!archWeakResponse.includes('Recommended Improvements'), 'Dynamic Architecture & Weaknesses: STRICT - Recommended Improvements excluded');

  // 8. Dynamic User Request: "Recommend improvements for this project."
  const impResult = await documentAgent.extractDocumentIntelligence(mockProcessed, 'Recommend improvements for this project.');
  const impResponse = buildDocumentAnalysisResponse(
    [{ ...mockProcessed, ...impResult }],
    null,
    null,
    'Recommend improvements for this project.'
  );
  assert(impResponse.includes('Recommended Improvements'), 'Dynamic Improvements: Recommended Improvements present');
  assert(!impResponse.includes('### 1. System Architecture'), 'Dynamic Improvements: STRICT - System Architecture excluded');

  // 9. Dynamic User Request: "Explain the database design."
  const dbResult = await documentAgent.extractDocumentIntelligence(mockProcessed, 'Explain the database design.');
  const dbResponse = buildDocumentAnalysisResponse(
    [{ ...mockProcessed, ...dbResult }],
    null,
    null,
    'Explain the database design.'
  );
  assert(dbResponse.includes('Database Overview'), 'Dynamic Database: Database Overview present');
  assert(dbResponse.includes('Data Organization'), 'Dynamic Database: Data Organization present');

  // ========================================================
  // TEST GROUP 4: Same-Chat Multi-Turn File Context Memory
  // ========================================================
  console.log('\n--- TEST GROUP 4: Same-Chat Multi-Turn File Context Memory ---');

  const userId = new mongoose.Types.ObjectId();
  const testConv = await Conversation.create({
    userId,
    title: 'Project Proposal Discussion',
    activeCategory: 'DOCUMENT_ANALYSIS',
    lastDocumentAnalysis: {
      documents: [{
        filename: mockProcessed.filename,
        fileType: mockProcessed.fileType,
        pageCount: mockProcessed.metadata.pageCount,
        wordCount: mockProcessed.metadata.wordCount,
        extractedText: mockProcessed.extractedText,
        importantSections: mockProcessed.pages.map(p => ({ title: `Slide ${p.pageNumber}`, content: p.text })),
        architectureAnalysis: archResult.architectureAnalysis,
        identifiedWeaknesses: archResult.identifiedWeaknesses,
        recommendations: archResult.recommendations,
      }],
    },
  });

  // Follow-up 1: "What are the weaknesses?" without uploading file again
  const followUp1 = conversationContextEngine.analyzeFollowUpIntent({
    text: 'What are the weaknesses?',
    lower: 'what are the weaknesses?',
    hasIncomingAttachments: false,
    hasEffectiveAttachments: false,
    lastDocumentAnalysis: testConv.lastDocumentAnalysis,
    activeCategory: testConv.activeCategory,
    rawMessages: [{ sender: 'user', content: 'Analyze this project proposal PPT' }],
  });
  assert(followUp1.isFollowUp === true, 'Turn 2 detected as multi-turn follow-up');
  assert(followUp1.resolvedCategory === 'DOCUMENT_ANALYSIS', 'Turn 2 resolves to DOCUMENT_ANALYSIS');

  // Execute Document Agent with cached document context
  const cachedAnalysis = await documentAgent.analyzeDocument(
    {
      userRequest: 'What are the weaknesses?',
      lastDocumentAnalysis: testConv.lastDocumentAnalysis,
    },
    [] // zero new attachments
  );
  assert(cachedAnalysis.documents.length === 1, 'Reused cached document without asking user to re-upload');
  assert(cachedAnalysis.documents[0].filename === mockProcessed.filename, 'Retained exact filename from Turn 1');

  // Follow-up 2: "How can I improve the backend?"
  const followUp2 = conversationContextEngine.analyzeFollowUpIntent({
    text: 'How can I improve the backend?',
    lower: 'how can i improve the backend?',
    hasIncomingAttachments: false,
    hasEffectiveAttachments: false,
    lastDocumentAnalysis: testConv.lastDocumentAnalysis,
    activeCategory: testConv.activeCategory,
    rawMessages: [{ sender: 'user', content: 'What are the weaknesses?' }],
  });
  assert(followUp2.isFollowUp === true, 'Turn 3 detected as multi-turn follow-up');
  assert(followUp2.resolvedCategory === 'DOCUMENT_ANALYSIS', 'Turn 3 resolves to DOCUMENT_ANALYSIS');

  // Cleanup test conversation
  await Conversation.deleteOne({ _id: testConv._id }).catch(() => {});

  console.log(`\n========================================================`);
  console.log(`✓ DOCUMENT INTELLIGENCE SUITE: ALL ${passed}/${total} TESTS PASSED!`);
  console.log(`========================================================\n`);

  if (mongoose.connection?.readyState === 1) {
    await mongoose.disconnect();
  }
}

runDocumentTests().catch((err) => {
  console.error('\n❌ TEST SUITE FAILED:', err);
  process.exit(1);
});
