import assert from 'assert';
import spreadsheetService from '../src/services/spreadsheetService.js';
import statisticalService from '../src/services/statisticalService.js';
import { buildUniversalResponse } from '../src/services/universalResponseBuilder.js';

console.log('Testing Range and Covariance calculation and formatting...');

// 1. Create realistic sample dataset matching financial_expense_tracker_100k
const headers = ['Transaction_ID', 'Date', 'Category', 'Amount', 'Payment_Method', 'Month', 'Year'];
const rows = [
  { Transaction_ID: 'TX1001', Date: '2024-01-01', Category: 'Category 1', Amount: 10.02, Payment_Method: 'Card', Month: 1, Year: 2024 },
  { Transaction_ID: 'TX1002', Date: '2024-01-02', Category: 'Category 2', Amount: 1500.50, Payment_Method: 'Cash', Month: 1, Year: 2024 },
  { Transaction_ID: 'TX1003', Date: '2024-01-03', Category: 'Category 3', Amount: 2500.00, Payment_Method: 'Card', Month: 1, Year: 2024 },
  { Transaction_ID: 'TX1004', Date: '2024-01-04', Category: 'Category 2', Amount: 4999.89, Payment_Method: 'Wire', Month: 1, Year: 2024 },
];

const parsedSpreadsheet = {
  filename: 'financial_expense_tracker_100k.xlsx',
  sheetCount: 1,
  sheetNames: ['Expenses'],
  sheets: [
    {
      name: 'Expenses',
      rowCount: 4,
      columnCount: headers.length,
      headers,
      rows,
      columnSchema: {
        Amount: { type: 'numeric' },
        Month: { type: 'numeric' },
        Year: { type: 'numeric' },
      },
    },
  ],
  primarySheet: {
    name: 'Expenses',
    rowCount: 4,
    columnCount: headers.length,
    headers,
    rows,
    columnSchema: {
      Amount: { type: 'numeric' },
      Month: { type: 'numeric' },
      Year: { type: 'numeric' },
    },
  },
};

// Test query from screenshot: "calculate range and covariance"
const analysisResult = spreadsheetService.executeAnalysis(parsedSpreadsheet, 'calculate range and covariance');
assert.ok(analysisResult.success, 'Analysis should succeed');
assert.ok(analysisResult.isStatisticalAnalysis, 'Should be recognized as statistical analysis');
assert.deepStrictEqual(analysisResult.statisticalResult.requestedOperations, ['range', 'covariance']);

const task = {
  taskId: 'test-range-cov',
  category: 'DATA_ANALYSIS',
  status: 'COMPLETED',
  userRequest: 'calculate range and covariance',
  discoveredData: {
    dataAnalysis: analysisResult,
  },
};

const renderedResponse = buildUniversalResponse(task);
console.log('Rendered Response Preview:\n--------------------------');
console.log(renderedResponse);
console.log('--------------------------');

// Assertions on Range
assert.ok(renderedResponse.includes('**1. Range**'), 'Should have Step 1: Range');
assert.ok(renderedResponse.includes('4,999.89 - 10.02'), 'Should show range substitution');
assert.ok(renderedResponse.includes('\\boxed{\\text{Range} = \\$4,989.87}'), 'Range boxed answer must have escaped \\$ for KaTeX!');
assert.ok(!renderedResponse.includes('\\boxed{\\text{Range} = $4,989.87}'), 'Must NOT have unescaped bare $ inside boxed formula!');

// Assertions on Covariance
assert.ok(renderedResponse.includes('**2. Covariance**'), 'Should have Step 2: Covariance');
assert.ok(renderedResponse.includes('Covariance requires two numeric variables'), 'Should prompt for variable selection if 2 columns not specified');
assert.ok(renderedResponse.includes('Amount and Month'), 'Should suggest plausible pairs without ID columns');
assert.ok(!renderedResponse.includes('- **Amount and Transaction_ID**'), 'Transaction_ID must be excluded from bullet suggestions');

console.log('Now testing specified two columns: "calculate covariance between Amount and Year"');
const covSpecificResult = spreadsheetService.executeAnalysis(parsedSpreadsheet, 'calculate covariance between Amount and Year');
const task2 = {
  taskId: 'test-cov-specific',
  category: 'DATA_ANALYSIS',
  status: 'COMPLETED',
  userRequest: 'calculate covariance between Amount and Year',
  discoveredData: {
    dataAnalysis: covSpecificResult,
  },
};
const renderedCovSpecific = buildUniversalResponse(task2);
console.log('Rendered Specific Covariance Preview:\n--------------------------');
console.log(renderedCovSpecific);
console.log('--------------------------');
assert.ok(renderedCovSpecific.includes('\\text{Cov}(X,Y)'), 'Should show Cov(X,Y) formula');
assert.ok(renderedCovSpecific.includes('\\boxed{\\text{Cov}'), 'Should show boxed Cov final answer');

console.log('\n✅ ALL VERIFICATION CHECKS PASSED: ZERO ERRORS, PROPER ESCAPING, PERFECT ROUTING!');
