import spreadsheetService from '../backend/src/services/spreadsheetService.js';
import { buildUniversalResponse } from '../backend/src/services/universalResponseBuilder.js';
import * as XLSX from 'xlsx';

async function runTests() {
  console.log('=== DOERA AI: SPREADSHEET ANALYTICS VERIFICATION TEST SUITE ===\n');
  let passed = 0;
  let failed = 0;

  function assert(condition, testName) {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName}`);
      failed++;
    }
  }

  // -------------------------------------------------------------
  // TEST 1: Standard Expense Spreadsheet & Clean Structure
  // -------------------------------------------------------------
  console.log('\n--- Test 1: Standard Expense Spreadsheet ---');
  const expenseData = [
    { Category: 'Housing', Amount: 2400, Date: '2024-01-05' },
    { Category: 'Food & Dining', Amount: 850, Date: '2024-01-12' },
    { Category: 'Transportation', Amount: 420, Date: '2024-01-18' },
    { Category: 'Utilities', Amount: 310, Date: '2024-01-22' },
    { Category: 'Housing', Amount: 2400, Date: '2024-02-05' },
    { Category: 'Food & Dining', Amount: 920, Date: '2024-02-14' },
    { Category: 'Entertainment', Amount: 250, Date: '2024-02-20' },
  ];
  const wb1 = XLSX.utils.book_new();
  const ws1 = XLSX.utils.json_to_sheet(expenseData);
  XLSX.utils.book_append_sheet(wb1, ws1, 'Expenses');
  const buf1 = XLSX.write(wb1, { type: 'buffer', bookType: 'xlsx' });

  const parsed1 = await spreadsheetService.parseSpreadsheet({
    buffer: buf1,
    filename: 'monthly_expenses.xlsx',
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });

  const analysis1 = spreadsheetService.executeAnalysis(parsed1, 'Analyze this spreadsheet');
  const task1 = {
    taskId: 'task-test-1',
    userRequest: 'Analyze this spreadsheet',
    category: 'DATA_ANALYSIS',
    status: 'COMPLETED',
    chartConfig: analysis1.chartConfig,
    discoveredData: { dataAnalysis: { calculation: analysis1.calculation, chartConfig: analysis1.chartConfig, spreadsheetSummary: parsed1.summary } },
    bookingDetails: { bookingStatus: 'AWAITING_PROVIDER_CONFIRMATION' }, // Simulated contamination
    pendingApproval: { actionType: 'SEND_OUTREACH' }, // Simulated contamination
  };

  const response1 = buildUniversalResponse(task1);

  assert(response1.includes('### Spreadsheet Analysis Completed'), 'Includes clean header: Spreadsheet Analysis Completed');
  assert(response1.includes('### Key Insights'), 'Includes Key Insights section');
  assert(response1.includes('**Highest Spending Category**: **Housing**'), 'Correctly identifies Housing as top category');
  assert(response1.includes('$4,800') || response1.includes('4,800'), 'Correctly calculates Housing total $4,800');
  assert(response1.includes('7 records') || response1.includes('7** records'), 'Reports exact number of transactions (7)');
  assert(response1.includes('```json:doera-chart'), 'Embeds interactive json:doera-chart block');
  assert(!response1.includes('Appointment Status'), 'ZERO appointment status contamination');
  assert(!response1.includes('Human Authorization Required'), 'ZERO human authorization contamination');
  assert(!response1.includes('Awaiting Provider Confirmation'), 'ZERO awaiting provider confirmation contamination');
  assert(!response1.includes('Authorize & Execute'), 'ZERO authorize & execute button contamination');
  assert(!response1.includes('Executive Summary'), 'No document audit Executive Summary contamination');

  // -------------------------------------------------------------
  // TEST 2: Numeric Category Codes Without Mapping
  // -------------------------------------------------------------
  console.log('\n--- Test 2: Numeric Category Codes Without Mapping ---');
  const codeData = [
    { Code: 1, Amount: 5000 },
    { Code: 2, Amount: 3200 },
    { Code: 3, Amount: 1800 },
    { Code: 4, Amount: 950 },
    { Code: 10, Amount: 400 },
  ];
  const wb2 = XLSX.utils.book_new();
  const ws2 = XLSX.utils.json_to_sheet(codeData);
  XLSX.utils.book_append_sheet(wb2, ws2, 'Sheet1');
  const buf2 = XLSX.write(wb2, { type: 'buffer', bookType: 'xlsx' });

  const parsed2 = await spreadsheetService.parseSpreadsheet({ buffer: buf2, filename: 'codes_dataset.xlsx' });
  const analysis2 = spreadsheetService.executeAnalysis(parsed2, 'Find the highest spending category');
  const task2 = {
    taskId: 'task-test-2',
    userRequest: 'Find the highest spending category',
    category: 'DATA_ANALYSIS',
    status: 'COMPLETED',
    chartConfig: analysis2.chartConfig,
    discoveredData: { dataAnalysis: { calculation: analysis2.calculation, chartConfig: analysis2.chartConfig, spreadsheetSummary: parsed2.summary } },
  };

  const response2 = buildUniversalResponse(task2);

  assert(response2.includes('Category 1'), 'Formats numeric code as Category 1');
  assert(!response2.includes('Food') && !response2.includes('Travel') && !response2.includes('Shopping'), 'Does not invent names like Food/Travel/Shopping');
  assert(response2.includes('Category descriptions are unavailable'), 'Includes explicit note that category descriptions are unavailable');
  assert(response2.includes('### Highest Spending Category'), 'Adapts header to direct Highest Spending Category');

  // -------------------------------------------------------------
  // TEST 3: Multi-Sheet Spreadsheet with Category Mapping Table
  // -------------------------------------------------------------
  console.log('\n--- Test 3: Multi-Sheet Spreadsheet with Mapping Table ---');
  const transactionsSheet = [
    { Category_Code: 101, Expense: 12000 },
    { Category_Code: 102, Expense: 8500 },
    { Category_Code: 103, Expense: 3400 },
  ];
  const mappingSheet = [
    { Code: 101, Category_Name: 'Cloud Infrastructure' },
    { Code: 102, Category_Name: 'Staff Payroll' },
    { Code: 103, Category_Name: 'Office Equipment' },
  ];
  const wb3 = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb3, XLSX.utils.json_to_sheet(transactionsSheet), 'Transactions');
  XLSX.utils.book_append_sheet(wb3, XLSX.utils.json_to_sheet(mappingSheet), 'Category_Mapping');
  const buf3 = XLSX.write(wb3, { type: 'buffer', bookType: 'xlsx' });

  const parsed3 = await spreadsheetService.parseSpreadsheet({ buffer: buf3, filename: 'budget_mapped.xlsx' });
  const analysis3 = spreadsheetService.executeAnalysis(parsed3, 'Analyze expenses by category');
  const task3 = {
    taskId: 'task-test-3',
    userRequest: 'Analyze expenses by category',
    category: 'DATA_ANALYSIS',
    status: 'COMPLETED',
    chartConfig: analysis3.chartConfig,
    discoveredData: { dataAnalysis: { calculation: analysis3.calculation, chartConfig: analysis3.chartConfig, spreadsheetSummary: parsed3.summary } },
  };

  const response3 = buildUniversalResponse(task3);

  assert(response3.includes('Cloud Infrastructure'), 'Resolves Category_Code 101 to Cloud Infrastructure from mapping sheet');
  assert(response3.includes('Staff Payroll'), 'Resolves Category_Code 102 to Staff Payroll from mapping sheet');

  // -------------------------------------------------------------
  // TEST 4: Query Adaptation - Monthly Comparison & Cost Reduction
  // -------------------------------------------------------------
  console.log('\n--- Test 4: Query Adaptation (Monthly & Cost Reduction) ---');
  const analysisMonthly = spreadsheetService.executeAnalysis(parsed1, 'Compare monthly expenses');
  const taskMonthly = {
    taskId: 'task-test-4a',
    userRequest: 'Compare monthly expenses',
    category: 'DATA_ANALYSIS',
    status: 'COMPLETED',
    chartConfig: analysisMonthly.chartConfig,
    discoveredData: { dataAnalysis: { calculation: analysisMonthly.calculation, chartConfig: analysisMonthly.chartConfig, spreadsheetSummary: parsed1.summary } },
  };
  const responseMonthly = buildUniversalResponse(taskMonthly);
  assert(responseMonthly.includes('### Monthly Expense Comparison'), 'Adapts header to Monthly Expense Comparison');
  assert(responseMonthly.includes('Peak Spending Month'), 'Includes Peak Spending Month insight');

  const taskReduce = {
    taskId: 'task-test-4b',
    userRequest: 'Analyze this entire spreadsheet and suggest ways to reduce expenses',
    category: 'DATA_ANALYSIS',
    status: 'COMPLETED',
    chartConfig: analysis1.chartConfig,
    discoveredData: { dataAnalysis: { calculation: analysis1.calculation, chartConfig: analysis1.chartConfig, spreadsheetSummary: parsed1.summary } },
  };
  const responseReduce = buildUniversalResponse(taskReduce);
  assert(responseReduce.includes('### Grounded Cost Optimization Recommendations'), 'Includes grounded cost reduction section');
  assert(responseReduce.includes('Target Housing Expenses'), 'Grounded recommendation targets Housing (top category)');

  // -------------------------------------------------------------
  // TEST 5: Large Dataset (10,000 Rows) & Synchronized Numbers
  // -------------------------------------------------------------
  console.log('\n--- Test 5: Large Dataset (10,000 rows) ---');
  const largeRows = [];
  const categories = ['Engineering', 'Marketing', 'Sales', 'Operations', 'Legal'];
  for (let i = 0; i < 10000; i++) {
    largeRows.push({
      Department: categories[i % categories.length],
      Cost: 100 + (i % 50),
    });
  }
  const wb5 = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb5, XLSX.utils.json_to_sheet(largeRows), 'Data');
  const buf5 = XLSX.write(wb5, { type: 'buffer', bookType: 'xlsx' });

  const parsed5 = await spreadsheetService.parseSpreadsheet({ buffer: buf5, filename: 'large_dataset.xlsx' });
  const analysis5 = spreadsheetService.executeAnalysis(parsed5, 'Analyze costs by department');
  const task5 = {
    taskId: 'task-test-5',
    userRequest: 'Analyze costs by department',
    category: 'DATA_ANALYSIS',
    status: 'COMPLETED',
    chartConfig: analysis5.chartConfig,
    discoveredData: { dataAnalysis: { calculation: analysis5.calculation, chartConfig: analysis5.chartConfig, spreadsheetSummary: parsed5.summary } },
  };
  const response5 = buildUniversalResponse(task5);

  assert(response5.includes('10,000** records') || response5.includes('10,000 records'), 'Accurately reports 10,000 records processed');
  assert(!response5.includes('sample rows'), 'Never claims only sample rows were analyzed');
  assert(analysis5.chartConfig.data.length === 5, 'Chart data has exact 5 departments matching calculation');
  assert(analysis5.chartConfig.summaryStats.total === analysis5.calculation.totalSum, 'Chart total equals calculation totalSum');

  // -------------------------------------------------------------
  // TEST 6: Categorical-Only CSV (e.g. Dataset(PhishAlert).csv)
  // -------------------------------------------------------------
  console.log('\n--- Test 6: Categorical-Only CSV ---');
  const csvContent = `URL,Label\nhttp://example.com,Legitimate\nhttp://fakebank.com,Phishing\nhttp://scamsite.org,Phishing\nhttp://google.com,Legitimate\nhttp://bad-login.xyz,Phishing`;
  const parsed6 = await spreadsheetService.parseSpreadsheet({
    buffer: csvContent,
    filename: 'Dataset(PhishAlert).csv',
    mimeType: 'text/csv',
  });
  const analysis6 = spreadsheetService.executeAnalysis(parsed6, 'Analyze this spreadsheet and create an interactive bar chart.');
  const task6 = {
    taskId: 'task-test-6',
    userRequest: 'Analyze this spreadsheet and create an interactive bar chart.',
    category: 'DATA_ANALYSIS',
    status: 'COMPLETED',
    chartConfig: analysis6.chartConfig,
    discoveredData: { dataAnalysis: { calculation: analysis6.calculation, chartConfig: analysis6.chartConfig, spreadsheetSummary: parsed6.summary } },
  };
  const response6 = buildUniversalResponse(task6);

  assert(analysis6.calculation.isCountBased === true, 'Correctly flags count-based aggregation for non-numeric dataset');
  assert(analysis6.calculation.highest.label === 'Phishing', 'Identifies Phishing as top category (3 records, 60%)');
  assert(response6.includes('5** records') || response6.includes('5 records'), 'Reports 5 records processed');
  assert(response6.includes('```json:doera-chart'), 'Chart created successfully for categorical dataset');

  console.log(`\n========================================`);
  console.log(`TOTAL TESTS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
  console.log(`========================================\n`);

  if (failed > 0) process.exit(1);
}

runTests().catch((e) => {
  console.error('Fatal test error:', e);
  process.exit(1);
});
