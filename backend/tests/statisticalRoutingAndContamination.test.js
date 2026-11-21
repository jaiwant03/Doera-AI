import assert from 'assert';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import universalIntentService, { CATEGORIES } from '../src/services/universalIntentService.js';
import statisticalService from '../src/services/statisticalService.js';
import spreadsheetService from '../src/services/spreadsheetService.js';
import { buildUniversalResponse, buildStatisticalResponse } from '../src/services/universalResponseBuilder.js';
import orchestratorAgent from '../src/agents/orchestratorAgent.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runTests() {
  console.log('🧪 Starting Statistical Intent Routing & Contamination Prevention Test Suite...\n');

  // Load the 100k spreadsheet if available
  const sampleFilePath = path.join(__dirname, '../uploads/6af9f47dfd7fce5d5a7e9847/6b0148a4320bf7b74d0cba2f/1795246244416-financial_expense_tracker_100k.xlsx');
  let parsedSpreadsheet = null;
  if (fs.existsSync(sampleFilePath)) {
    console.log(`📁 Loading test dataset from: ${sampleFilePath}`);
    const buffer = fs.readFileSync(sampleFilePath);
    parsedSpreadsheet = await spreadsheetService.parseSpreadsheet({
      buffer,
      filename: 'financial_expense_tracker_100k.xlsx',
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    console.log(`✓ Loaded dataset: ${parsedSpreadsheet.summary.totalRows.toLocaleString()} rows, ${parsedSpreadsheet.primarySheet.headers.length} columns.\n`);
  } else {
    console.log('⚠️ 100k sample file not found on disk, creating synthetic 100k dataset in-memory...');
    const rows = [];
    for (let i = 1; i <= 100000; i++) {
      rows.push({
        Transaction_ID: i,
        User_ID: 1000 + (i % 500),
        Amount: 10.02 + ((i * 4989.87) / 100000),
        Year: 2020 + (i % 5),
        Month: 1 + (i % 12),
        Day: 1 + (i % 28),
      });
    }
    parsedSpreadsheet = {
      filename: 'financial_expense_tracker_100k.xlsx',
      sheetCount: 1,
      sheetNames: ['Transactions'],
      primarySheet: {
        name: 'Transactions',
        rowCount: 100000,
        headers: ['Transaction_ID', 'User_ID', 'Amount', 'Year', 'Month', 'Day'],
        rows,
      },
      summary: { totalRows: 100000, totalColumns: 6 },
    };
  }

  let passed = 0;
  let failed = 0;

  function test(name, fn) {
    try {
      fn();
      console.log(`  ✓ ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ✗ ${name}`);
      console.error(`    ${err.message}`);
      failed++;
    }
  }

  async function asyncTest(name, fn) {
    try {
      await fn();
      console.log(`  ✓ ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ✗ ${name}`);
      console.error(`    ${err.message}`);
      failed++;
    }
  }

  console.log('--- TEST GROUP 1: Intent Classification & Routing for Statistical Queries ---');

  await asyncTest('Query 1: "Calculate the range and covariance and interquartile" maps to DATA_ANALYSIS and no booking/outreach', async () => {
    const intent = await universalIntentService.understandRequest(
      'Calculate the range and covariance and interquartile',
      [{ name: 'financial_expense_tracker_100k.xlsx', type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }]
    );
    assert.strictEqual(intent.primaryCategory, CATEGORIES.DATA_ANALYSIS, 'Must be DATA_ANALYSIS');
    assert(!intent.categories.includes(CATEGORIES.APPOINTMENT_COORDINATION), 'Must NOT include APPOINTMENT_COORDINATION');
    assert(!intent.categories.includes(CATEGORIES.COMMUNICATION), 'Must NOT include COMMUNICATION');
    assert(!intent.categories.includes(CATEGORIES.LOCATION_DISCOVERY), 'Must NOT include LOCATION_DISCOVERY');
    assert(intent.requiredAgents.includes('DataAnalysis'), 'Must include DataAnalysis agent');
    assert(intent.requiredAgents.includes('Verification'), 'Must include Verification agent');
    assert(!intent.requiredAgents.includes('Planner'), 'Must NOT include Planner agent');
    assert(!intent.requiredAgents.includes('Communication'), 'Must NOT include Communication agent');
  });

  await asyncTest('Query 2: "Calculate the mean, median and mode" maps to DATA_ANALYSIS', async () => {
    const intent = await universalIntentService.understandRequest(
      'Calculate the mean, median and mode',
      [{ name: 'expenses.xlsx', type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }]
    );
    assert.strictEqual(intent.primaryCategory, CATEGORIES.DATA_ANALYSIS);
  });

  await asyncTest('Query 3: "Calculate the standard deviation" maps to DATA_ANALYSIS', async () => {
    const intent = await universalIntentService.understandRequest(
      'Calculate the standard deviation',
      [{ name: 'expenses.xlsx', type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }]
    );
    assert.strictEqual(intent.primaryCategory, CATEGORIES.DATA_ANALYSIS);
  });

  await asyncTest('Query 4: "Calculate variance and standard deviation" maps to DATA_ANALYSIS', async () => {
    const intent = await universalIntentService.understandRequest(
      'Calculate variance and standard deviation',
      [{ name: 'expenses.xlsx', type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }]
    );
    assert.strictEqual(intent.primaryCategory, CATEGORIES.DATA_ANALYSIS);
  });

  await asyncTest('Query 5: "Find the interquartile range" maps to DATA_ANALYSIS', async () => {
    const intent = await universalIntentService.understandRequest(
      'Find the interquartile range',
      [{ name: 'expenses.xlsx', type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }]
    );
    assert.strictEqual(intent.primaryCategory, CATEGORIES.DATA_ANALYSIS);
  });

  await asyncTest('Query 6: "Calculate the covariance between Amount and Year" maps to DATA_ANALYSIS', async () => {
    const intent = await universalIntentService.understandRequest(
      'Calculate the covariance between Amount and Year',
      [{ name: 'expenses.xlsx', type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }]
    );
    assert.strictEqual(intent.primaryCategory, CATEGORIES.DATA_ANALYSIS);
  });

  console.log('\n--- TEST GROUP 2: Regression for Non-Statistical Query Categories ---');

  await asyncTest('Query 7: "Find five laptop repair centres in Coimbatore" maps to LOCATION_DISCOVERY', async () => {
    const intent = await universalIntentService.understandRequest('Find five laptop repair centres in Coimbatore', []);
    assert.strictEqual(intent.primaryCategory, CATEGORIES.LOCATION_DISCOVERY);
  });

  await asyncTest('Query 8: "Book an appointment with Dr. Mehta for tomorrow at 4 PM" maps to APPOINTMENT_COORDINATION', async () => {
    const intent = await universalIntentService.understandRequest('Book an appointment with Dr. Mehta for tomorrow at 4 PM', []);
    assert.strictEqual(intent.primaryCategory, CATEGORIES.APPOINTMENT_COORDINATION);
  });

  await asyncTest('Query 9: "Compare the prices of iPhone 15 and Samsung Galaxy S24" maps to PRODUCT_COMPARISON', async () => {
    const intent = await universalIntentService.understandRequest('Compare the prices of iPhone 15 and Samsung Galaxy S24', []);
    assert.strictEqual(intent.primaryCategory, CATEGORIES.PRODUCT_COMPARISON);
  });

  await asyncTest('Query 10: "Plan a two-day hackathon with a budget of 50,000 INR" maps to MISSION_PLANNING', async () => {
    const intent = await universalIntentService.understandRequest('Plan a two-day hackathon with a budget of 50,000 INR', []);
    assert.strictEqual(intent.primaryCategory, CATEGORIES.MISSION_PLANNING);
  });

  await asyncTest('Query 11: "Review this UI design screenshot and check the alignment" maps to IMAGE_ANALYSIS', async () => {
    const intent = await universalIntentService.understandRequest(
      'Review this UI design screenshot and check the alignment',
      [{ name: 'screenshot.png', type: 'image/png' }]
    );
    assert.strictEqual(intent.primaryCategory, CATEGORIES.IMAGE_ANALYSIS);
  });

  await asyncTest('Query 12: "Analyze this project proposal PDF and summarize the weaknesses" maps to DOCUMENT_ANALYSIS', async () => {
    const intent = await universalIntentService.understandRequest(
      'Analyze this project proposal PDF and summarize the weaknesses',
      [{ name: 'proposal.pdf', type: 'application/pdf' }]
    );
    assert.strictEqual(intent.primaryCategory, CATEGORIES.DOCUMENT_ANALYSIS);
  });

  console.log('\n--- TEST GROUP 3: Exact Statistical Calculation Engine on 100k Dataset ---');

  test('Operation Detection: "Calculate the range and covariance and interquartile"', () => {
    const result = statisticalService.executeStatisticalAnalysis({
      rows: parsedSpreadsheet.primarySheet.rows,
      headers: parsedSpreadsheet.primarySheet.headers,
      columnSchema: {},
      filename: 'financial_expense_tracker_100k.xlsx',
      sheetName: 'Transactions',
      query: 'Calculate the range and covariance and interquartile',
    });
    assert(result.isStatisticalAnalysis, 'Must be statistical analysis');
    assert(result.isMultiStat, 'Must be multi-stat');
    assert.deepStrictEqual(result.requestedOperations.sort(), ['covariance', 'iqr', 'range'].sort());
    assert(result.results.range, 'Must calculate range');
    assert(result.results.quartiles, 'Must calculate quartiles/iqr');
    assert(result.results.covariance, 'Must include covariance');
  });

  test('Covariance without specified columns asks user to specify pair and excludes ID columns', () => {
    const result = statisticalService.executeStatisticalAnalysis({
      rows: parsedSpreadsheet.primarySheet.rows,
      headers: parsedSpreadsheet.primarySheet.headers,
      columnSchema: {},
      filename: 'financial_expense_tracker_100k.xlsx',
      sheetName: 'Transactions',
      query: 'Calculate the range and covariance and interquartile',
    });
    const cov = result.results.covariance;
    assert.strictEqual(cov.isSpecified, false, 'Should be marked as unspecified');
    assert(Array.isArray(cov.plausiblePairs), 'Must provide plausible pairs');
    assert(cov.plausiblePairs.length > 0, 'Must have at least one pair');
    cov.plausiblePairs.forEach((pair) => {
      assert(!pair.includes('Transaction_ID'), 'Must not pair with Transaction_ID');
      assert(!pair.includes('User_ID'), 'Must not pair with User_ID');
    });
  });

  test('Covariance with specified columns ("Amount and Year") calculates exact population and sample covariance', () => {
    const result = statisticalService.executeStatisticalAnalysis({
      rows: parsedSpreadsheet.primarySheet.rows,
      headers: parsedSpreadsheet.primarySheet.headers,
      columnSchema: {},
      filename: 'financial_expense_tracker_100k.xlsx',
      sheetName: 'Transactions',
      query: 'Calculate covariance between Amount and Year',
    });
    const cov = result.results.covariance;
    assert.strictEqual(cov.isSpecified, true, 'Should be marked as specified');
    assert.strictEqual(cov.colA, 'Amount');
    assert.strictEqual(cov.colB, 'Year');
    assert(typeof cov.populationCovariance === 'number', 'Population covariance must be numeric');
    assert(typeof cov.sampleCovariance === 'number', 'Sample covariance must be numeric');
    console.log(`    Population Covariance: ${cov.populationCovariance.toFixed(4)}, Sample Covariance: ${cov.sampleCovariance.toFixed(4)}`);
  });

  test('Range calculation on 100k Amount: Range = Max - Min', () => {
    const result = statisticalService.executeStatisticalAnalysis({
      rows: parsedSpreadsheet.primarySheet.rows,
      headers: parsedSpreadsheet.primarySheet.headers,
      columnSchema: {},
      filename: 'financial_expense_tracker_100k.xlsx',
      sheetName: 'Transactions',
      query: 'Calculate range',
    });
    const r = result.results.range;
    assert(typeof r.range === 'number');
    assert(r.max > r.min);
    assert.strictEqual(Number((r.max - r.min).toFixed(2)), Number(r.range.toFixed(2)));
    console.log(`    Min: ${r.min}, Max: ${r.max}, Range: ${r.range}`);
  });

  test('Interquartile Range calculation on 100k Amount: IQR = Q3 - Q1', () => {
    const result = statisticalService.executeStatisticalAnalysis({
      rows: parsedSpreadsheet.primarySheet.rows,
      headers: parsedSpreadsheet.primarySheet.headers,
      columnSchema: {},
      filename: 'financial_expense_tracker_100k.xlsx',
      sheetName: 'Transactions',
      query: 'Calculate interquartile range',
    });
    const q = result.results.quartiles;
    assert(typeof q.iqr === 'number');
    assert(q.q3 > q.q1);
    assert.strictEqual(Number((q.q3 - q.q1).toFixed(2)), Number(q.iqr.toFixed(2)));
    console.log(`    Q1: ${q.q1}, Q3: ${q.q3}, IQR: ${q.iqr}`);
  });

  console.log('\n--- TEST GROUP 4: Zero Workflow Contamination in Markdown Response ---');

  test('Response for "Calculate the range and covariance and interquartile" has ZERO appointment contamination', () => {
    const statResult = statisticalService.executeStatisticalAnalysis({
      rows: parsedSpreadsheet.primarySheet.rows,
      headers: parsedSpreadsheet.primarySheet.headers,
      columnSchema: {},
      filename: 'financial_expense_tracker_100k.xlsx',
      sheetName: 'Transactions',
      query: 'Calculate the range and covariance and interquartile',
    });

    const taskMock = {
      category: 'DATA_ANALYSIS',
      userRequest: 'Calculate the range and covariance and interquartile',
      status: 'COMPLETED',
      statisticalResult: statResult,
      discoveredData: {
        dataAnalysis: {
          isStatisticalAnalysis: true,
          statisticalResult: statResult,
        },
      },
    };

    const response = buildUniversalResponse(taskMock);

    // Contamination checks
    assert(!response.includes('Awaiting Provider Confirmation'), 'ZERO "Awaiting Provider Confirmation"');
    assert(!response.includes('Appointment Status'), 'ZERO "Appointment Status"');
    assert(!response.includes('Preferred Window'), 'ZERO "Preferred Window"');
    assert(!response.includes('Internal Tracking Reference'), 'ZERO "Internal Tracking Reference"');
    assert(!response.includes('DOERA-TRACK-PENDING'), 'ZERO "DOERA-TRACK-PENDING"');
    assert(!response.includes('Human Authorization Required'), 'ZERO "Human Authorization Required"');
    assert(!response.includes('Authorize & Execute'), 'ZERO "Authorize & Execute"');
    assert(!response.includes('Request understood and plan created'), 'ZERO "Request understood and plan created"');
    assert(!response.includes('I found verified options and coordinated the execution process'), 'ZERO legacy frontend fake response');
    assert(!response.includes('Your appointment details are ready'), 'ZERO "Your appointment details are ready"');

    // Expected content checks
    assert(response.includes('Statistical Calculations'), 'Contains "Statistical Calculations" title');
    assert(response.includes('Range'), 'Contains Range section');
    assert(response.includes('Interquartile Range'), 'Contains Interquartile Range section');
    assert(response.includes('Covariance'), 'Contains Covariance section');
    assert(response.includes('\\boxed{'), 'Contains boxed LaTeX final answers');
  });

  console.log(`\n========================================`);
  console.log(`🏁 Test Summary: ${passed} Passed, ${failed} Failed`);
  console.log(`========================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Test runner fatal error:', err);
  process.exit(1);
});
