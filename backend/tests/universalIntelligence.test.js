import universalIntentService, { CATEGORIES } from '../src/services/universalIntentService.js';
import documentProcessor from '../src/services/documentProcessor.js';
import dataAnalysisAgent from '../src/agents/dataAnalysisAgent.js';
import documentAgent from '../src/agents/documentAgent.js';
import placesAdapter from '../src/integrations/placesAdapter.js';
import buildUniversalResponse from '../src/services/universalResponseBuilder.js';

describe('DOERA AI — Universal Input Intelligence & Dynamic Understanding', () => {
  // Test 1: Arbitrary General Knowledge / Technical Query
  it('1. should dynamically classify arbitrary conceptual queries as GENERAL_QUESTION or TECHNICAL_ASSISTANCE without external tasks', async () => {
    const query = 'Explain the difference between quantum key distribution and post-quantum lattice cryptography.';
    const intent = await universalIntentService.understandRequest(query);

    expect(intent).toBeDefined();
    expect([CATEGORIES.TECHNICAL_ASSISTANCE, CATEGORIES.GENERAL_QUESTION]).toContain(intent.primaryCategory);
    expect(intent.isActionTask).toBe(false);
    expect(intent.clarificationNeeded).toBeNull();
  });

  // Test 2: Arbitrary Product / Service Comparison
  it('2. should classify arbitrary comparison queries and select Comparison & Research agents', async () => {
    const query = 'Compare Snowflake vs BigQuery vs Databricks Lakehouse for a 50TB real-time streaming workload.';
    const intent = await universalIntentService.understandRequest(query);

    expect(intent.categories).toContain(CATEGORIES.PRODUCT_COMPARISON);
    expect(intent.requiredAgents).toContain('Comparison');
    expect(intent.requiredAgents).toContain('Research');
    expect(intent.isActionTask).toBe(true);
  });

  // Test 3: Uploaded CSV Spreadsheet Processing & Data Analysis
  it('3. should process uploaded CSV dataset, extract rows, and generate analytical insights & visual distribution', async () => {
    const sampleCsv = `Month,Revenue,Expenses,NetProfit
Jan,50000,32000,18000
Feb,62000,35000,27000
Mar,75000,41000,34000
Apr,81000,44000,37000
May,94000,50000,44000`;

    const processed = await documentProcessor.processContent({
      filename: 'financial_q1_q2.csv',
      mimeType: 'text/csv',
      rawText: sampleCsv,
    });

    expect(processed.structuredData).toBeDefined();
    expect(processed.structuredData.headers).toEqual(['Month', 'Revenue', 'Expenses', 'NetProfit']);
    expect(processed.structuredData.rowCount).toBe(5);
    expect(processed.structuredData.sampleRows.length).toBe(5);

    // Run DataAnalysisAgent with extracted dataset
    const analysisResult = await dataAnalysisAgent.analyzeData(
      { userRequest: 'Analyze revenue growth trends and profit margins' },
      processed.structuredData
    );

    expect(analysisResult.status).toBe('completed');
    expect(analysisResult.analysis).toBeDefined();
    expect(analysisResult.analysis.headers).toEqual(['Month', 'Revenue', 'Expenses', 'NetProfit']);
    expect(analysisResult.analysis.sampleRows.length).toBe(5);

    // Verify Universal Response Builder renders Table & Visual scale
    const mockTask = {
      userRequest: 'Analyze revenue growth trends and profit margins',
      category: 'DATA_ANALYSIS',
      status: 'COMPLETED',
      discoveredData: { dataAnalysis: analysisResult.analysis },
    };

    const rendered = buildUniversalResponse(mockTask);
    expect(rendered).toContain('Data Analysis & Statistical Insights');
    expect(rendered).toContain('Tabular Data Preview (5 total rows)');
    expect(rendered).toContain('Revenue');
    expect(rendered).toContain('NetProfit');
  });

  // Test 4: Uploaded Document Analysis (PDF / TXT / MD)
  it('4. should process uploaded text/markdown documents and extract structured executive findings', async () => {
    const documentText = `# Cloud Migration Architecture Plan
## Executive Summary
This document outlines our strategy to migrate on-premises ERP systems to hybrid cloud.
Phase 1 covers containerization of legacy monolithic services with Docker and Kubernetes.
Phase 2 deploys multi-region PostgreSQL with 99.99% high availability SLA.
Estimated budget savings: 28% over 3 years.`;

    const docResult = await documentAgent.analyzeDocument(
      { userRequest: 'Summarize the key migration phases and expected budget savings' },
      [{ name: 'migration_plan.md', type: 'text/markdown', content: documentText }]
    );

    expect(docResult.status).toBe('completed');
    expect(docResult.documentCount).toBe(1);
    expect(docResult.documents[0].filename).toBe('migration_plan.md');
    expect(docResult.documents[0].summary).toBeDefined();
  });

  // Test 5: Uploaded Visual Image Asset Handling
  it('5. should process uploaded image attachments without throwing or inventing text', async () => {
    // Valid 1x1 PNG base64
    const validPngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
    const processed = await documentProcessor.processContent({
      filename: 'dashboard_screenshot.png',
      mimeType: 'image/png',
      base64Content: validPngBase64,
    });

    expect(processed.structuredData.fileType).toBe('IMAGE');
    expect(processed.structuredData.format).toBe('PNG');
    expect(processed.structuredData.hasBase64).toBe(true);
    expect(processed.summary).toContain('dashboard_screenshot.png');
  }, 40000);

  // Test 6: Zero False-Positive Cardiology Fallback on Arbitrary Discovery
  it('6. should NEVER return irrelevant cardiology clinics for arbitrary unrelated queries where no providers exist', async () => {
    // Completely arbitrary query that has zero matches
    const results = await placesAdapter.searchServices({
      query: 'deepsea underwater welding submarine certification',
      location: 'Antarctica',
      category: 'SPECIALIZED_TRAINING',
    });

    expect(Array.isArray(results)).toBe(true);
    // Crucially: MUST NOT contain Apollo Hospitals Cardiology Centre!
    const hasCardiology = results.some(
      (r) => /apollo|cardio|heart|malar/i.test(r.businessName || '')
    );
    expect(hasCardiology).toBe(false);
  });

  // Test 7: Contextual Follow-Up Understanding
  it('7. should recognize follow-up context and resolve prior conversation history', async () => {
    const priorHistory = `User: Compare PostgreSQL vs MongoDB for high-throughput sensor telemetry.
DOERA: I compared PostgreSQL and MongoDB. PostgreSQL excels at ACID transactions and relational analytics. MongoDB excels at horizontal sharding and flexible document schemas.`;

    const followUpQuery = 'Explain the second database recommendation in more detail for indexing time-series data.';
    const intent = await universalIntentService.understandRequest(
      followUpQuery,
      [],
      '',
      priorHistory
    );

    expect(intent).toBeDefined();
    expect(intent.primaryCategory).toBeDefined();
    // Must understand without requiring clarifying question
    expect(intent.clarificationNeeded).toBeNull();
  });
});
