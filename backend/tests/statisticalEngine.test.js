/**
 * DOERA AI — Complete Statistical Analysis Engine & Verification Test Suite
 *
 * Verifies all 15 independent statistical calculations, multi-operation parsing,
 * mathematical cross-validations, multi-turn follow-up workflows, and zero contamination
 * on the 100,000-record dataset.
 */

import path from 'path';
import { fileURLToPath } from 'url';
import xlsx from 'xlsx';
import { statisticalService } from '../src/services/statisticalService.js';
import { spreadsheetService } from '../src/services/spreadsheetService.js';
import { universalResponseBuilder } from '../src/services/universalResponseBuilder.js';
import { conversationContextEngine } from '../src/services/conversationContextEngine.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const XLSX = xlsx.default || xlsx;
const SPREADSHEET_PATH = path.join(
  __dirname,
  '../uploads/6af9f47dfd7fce5d5a7e9847/6b0148a4320bf7b74d0cba2f/1795246244416-financial_expense_tracker_100k.xlsx'
);

let passedCount = 0;
let failedCount = 0;

function assert(condition, testName, details = '') {
  if (condition) {
    passedCount++;
    console.log(`  ✓ PASS: ${testName}`);
  } else {
    failedCount++;
    console.error(`  ✗ FAIL: ${testName} ${details ? `(${details})` : ''}`);
  }
}

async function runTestSuite() {
  console.log('\n=================================================================');
  console.log(' DOERA AI — COMPREHENSIVE STATISTICAL CALCULATION TEST SUITE');
  console.log('=================================================================\n');

  console.log(`[1/5] Loading 100,000-row dataset from:\n      ${SPREADSHEET_PATH}`);
  const t0 = Date.now();
  const wb = XLSX.readFile(SPREADSHEET_PATH);
  const sheetName = wb.SheetNames[0];
  const sheet = wb.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet);
  const headers = Object.keys(rows[0]);
  const columnSchema = {};
  headers.forEach((h) => {
    columnSchema[h] = { type: typeof rows[0][h] === 'number' ? 'numeric' : 'text' };
  });

  const parsedSpreadsheet = {
    filename: 'financial_expense_tracker_100k.xlsx',
    sheets: [{ name: sheetName, headers, rows, columnSchema, rowCount: rows.length }],
    totalRows: rows.length,
    headers,
  };

  console.log(`      Loaded ${rows.length.toLocaleString()} records in ${Date.now() - t0}ms.\n`);
  assert(rows.length === 100000, 'Dataset record count matches exactly 100,000 rows');

  // =========================================================================
  // SECTION 1: PHASE 12 — 15 INDEPENDENT STATISTICAL CALCULATIONS
  // =========================================================================
  console.log('\n--- Section 1: Phase 12 — 15 Independent Statistical Operations ---');

  // 1. Mean
  const meanRes = statisticalService.executeStatisticalAnalysis({
    rows,
    headers,
    columnSchema,
    query: 'Calculate mean of Amount',
    filename: parsedSpreadsheet.filename,
    sheetName,
  });
  assert(meanRes.success, 'Mean: Calculation executed successfully');
  assert(meanRes.primaryOperation === 'MEAN', 'Mean: Primary operation classified as MEAN');
  assert(Math.abs(meanRes.results.mean - 2510.35) < 0.05, `Mean: Value is $2,510.35 (actual: ${meanRes.results.mean.toFixed(2)})`);

  const meanResponse = universalResponseBuilder.buildDataAnalysisResponse({ statisticalResult: meanRes }, {}, 'Calculate mean of Amount');
  assert(meanResponse.includes('## Mean (Arithmetic Average)'), 'Mean: Dedicated markdown header present');
  assert(meanResponse.includes('$2,510.35'), 'Mean: Formatted value appears in response');
  assert(!meanResponse.includes('Appointment Status'), 'Mean: Zero appointment contamination');

  // 2. Median
  const medianRes = statisticalService.executeStatisticalAnalysis({
    rows,
    headers,
    columnSchema,
    query: 'Calculate median of Amount',
    filename: parsedSpreadsheet.filename,
    sheetName,
  });
  assert(medianRes.primaryOperation === 'MEDIAN', 'Median: Primary operation classified as MEDIAN');
  assert(Math.abs(medianRes.results.median - 2518.89) < 0.05, `Median: Value is $2,518.89 (actual: ${medianRes.results.median.toFixed(2)})`);

  const medianResponse = universalResponseBuilder.buildDataAnalysisResponse({ statisticalResult: medianRes }, {}, 'Calculate median of Amount');
  assert(medianResponse.includes('## Median'), 'Median: Dedicated markdown header present');
  assert(medianResponse.includes('$2,518.89'), 'Median: Formatted median present in response');

  // 3. Mode
  const modeRes = statisticalService.executeStatisticalAnalysis({
    rows,
    headers,
    columnSchema,
    query: 'Find mode of Amount',
    filename: parsedSpreadsheet.filename,
    sheetName,
  });
  assert(modeRes.primaryOperation === 'MODE', 'Mode: Primary operation classified as MODE');
  assert(modeRes.results.mode.hasMode, 'Mode: Successfully identified dataset mode');
  assert(modeRes.results.mode.modeValue === 1678.97, `Mode: Value is $1,678.97 (actual: ${modeRes.results.mode.modeValue})`);
  assert(modeRes.results.mode.frequency === 5, `Mode: Frequency is 5 occurrences (actual: ${modeRes.results.mode.frequency})`);

  // 4. Population Variance
  const popVarRes = statisticalService.executeStatisticalAnalysis({
    rows,
    headers,
    columnSchema,
    query: 'Calculate population variance',
    filename: parsedSpreadsheet.filename,
    sheetName,
  });
  assert(popVarRes.primaryOperation === 'VARIANCE', 'Population Variance: Primary operation classified as VARIANCE');
  assert(Math.abs(popVarRes.results.variance.populationVariance - 2076422.70) < 1.0, `Pop Variance: Value is ~2,076,422.70 (actual: ${popVarRes.results.variance.populationVariance.toFixed(2)})`);
  const popVarResponse = universalResponseBuilder.buildDataAnalysisResponse({ statisticalResult: popVarRes }, {}, 'Calculate population variance');
  assert(popVarResponse.includes('## Population Variance'), 'Population Variance: Header specifies Population Variance');

  // 5. Sample Variance
  const sampVarRes = statisticalService.executeStatisticalAnalysis({
    rows,
    headers,
    columnSchema,
    query: 'Calculate sample variance',
    filename: parsedSpreadsheet.filename,
    sheetName,
  });
  assert(sampVarRes.primaryOperation === 'VARIANCE', 'Sample Variance: Primary operation classified as VARIANCE');
  assert(Math.abs(sampVarRes.results.variance.sampleVariance - 2076443.47) < 1.0, `Sample Variance: Value is ~2,076,443.47 (actual: ${sampVarRes.results.variance.sampleVariance.toFixed(2)})`);
  const sampVarResponse = universalResponseBuilder.buildDataAnalysisResponse({ statisticalResult: sampVarRes }, {}, 'Calculate sample variance');
  assert(sampVarResponse.includes('## Sample Variance'), 'Sample Variance: Header specifies Sample Variance');

  // 6. Population Standard Deviation
  const popSdRes = statisticalService.executeStatisticalAnalysis({
    rows,
    headers,
    columnSchema,
    query: 'Calculate population standard deviation',
    filename: parsedSpreadsheet.filename,
    sheetName,
  });
  assert(popSdRes.primaryOperation === 'STANDARD_DEVIATION', 'Pop SD: Primary operation classified as STANDARD_DEVIATION');
  assert(Math.abs(popSdRes.results.standardDeviation.populationStandardDeviation - 1440.98) < 0.05, `Pop SD: Value is $1,440.98 (actual: ${popSdRes.results.standardDeviation.populationStandardDeviation.toFixed(2)})`);
  const popSdResponse = universalResponseBuilder.buildDataAnalysisResponse({ statisticalResult: popSdRes }, {}, 'Calculate population standard deviation');
  assert(popSdResponse.includes('## Population Standard Deviation'), 'Pop SD: Header specifies Population Standard Deviation');

  // 7. Sample Standard Deviation
  const sampSdRes = statisticalService.executeStatisticalAnalysis({
    rows,
    headers,
    columnSchema,
    query: 'Calculate sample standard deviation',
    filename: parsedSpreadsheet.filename,
    sheetName,
  });
  assert(sampSdRes.primaryOperation === 'STANDARD_DEVIATION', 'Sample SD: Primary operation classified as STANDARD_DEVIATION');
  assert(Math.abs(sampSdRes.results.standardDeviation.sampleStandardDeviation - 1440.99) < 0.05, `Sample SD: Value is $1,440.99 (actual: ${sampSdRes.results.standardDeviation.sampleStandardDeviation.toFixed(2)})`);
  const sampSdResponse = universalResponseBuilder.buildDataAnalysisResponse({ statisticalResult: sampSdRes }, {}, 'Calculate sample standard deviation');
  assert(sampSdResponse.includes('## Sample Standard Deviation'), 'Sample SD: Header specifies Sample Standard Deviation');

  // 8. Coefficient of Variation
  const cvRes = statisticalService.executeStatisticalAnalysis({
    rows,
    headers,
    columnSchema,
    query: 'Calculate coefficient of variation',
    filename: parsedSpreadsheet.filename,
    sheetName,
  });
  assert(cvRes.primaryOperation === 'COEFFICIENT_OF_VARIATION', 'CV: Primary operation classified as COEFFICIENT_OF_VARIATION');
  assert(cvRes.results.coefficientOfVariation.isMeaningful, 'CV: Verified mathematically meaningful (mean > 0)');
  assert(Math.abs(cvRes.results.coefficientOfVariation.sampleCV - 57.40) < 0.05, `CV: Sample CV is 57.40% (actual: ${cvRes.results.coefficientOfVariation.sampleCV.toFixed(2)}%)`);
  assert(Math.abs(cvRes.results.coefficientOfVariation.populationCV - 57.40) < 0.05, `CV: Population CV is 57.40% (actual: ${cvRes.results.coefficientOfVariation.populationCV.toFixed(2)}%)`);

  // 9. Range
  const rangeRes = statisticalService.executeStatisticalAnalysis({
    rows,
    headers,
    columnSchema,
    query: 'Calculate range',
    filename: parsedSpreadsheet.filename,
    sheetName,
  });
  assert(rangeRes.primaryOperation === 'RANGE', 'Range: Primary operation classified as RANGE');
  assert(rangeRes.results.range.min === 10.02, `Range Min: $10.02 (actual: ${rangeRes.results.range.min})`);
  assert(rangeRes.results.range.max === 4999.89, `Range Max: $4999.89 (actual: ${rangeRes.results.range.max})`);
  assert(Math.abs(rangeRes.results.range.range - 4989.87) < 0.01, `Range Spread: $4,989.87 (actual: ${rangeRes.results.range.range})`);

  // 10. Quartiles (Q1, Q2, Q3)
  const qRes = statisticalService.executeStatisticalAnalysis({
    rows,
    headers,
    columnSchema,
    query: 'Calculate Q1, Q2, and Q3',
    filename: parsedSpreadsheet.filename,
    sheetName,
  });
  assert(qRes.primaryOperation === 'QUARTILES', 'Quartiles: Primary operation classified as QUARTILES');
  assert(Math.abs(qRes.results.quartiles.q1 - 1259.69) < 0.05, `Quartiles: Q1 is $1,259.69 (actual: ${qRes.results.quartiles.q1.toFixed(2)})`);
  assert(Math.abs(qRes.results.quartiles.q2 - 2518.89) < 0.05, `Quartiles: Q2 is $2,518.89 (actual: ${qRes.results.quartiles.q2.toFixed(2)})`);
  assert(Math.abs(qRes.results.quartiles.q3 - 3760.90) < 0.05, `Quartiles: Q3 is $3,760.90 (actual: ${qRes.results.quartiles.q3.toFixed(2)})`);
  assert(Math.abs(qRes.results.quartiles.iqr - 2501.22) < 0.05, `Quartiles: IQR is $2,501.22 (actual: ${qRes.results.quartiles.iqr.toFixed(2)})`);

  // 11. Outlier Detection using IQR Method
  const outRes = statisticalService.executeStatisticalAnalysis({
    rows,
    headers,
    columnSchema,
    query: 'Identify outliers using the IQR method',
    filename: parsedSpreadsheet.filename,
    sheetName,
  });
  assert(outRes.primaryOperation === 'OUTLIERS', 'Outliers: Primary operation classified as OUTLIERS');
  assert(outRes.results.outliers.outlierCount === 0, `Outliers: Exactly 0 outliers in uniform dataset (actual: ${outRes.results.outliers.outlierCount})`);
  assert(outRes.results.outliers.lowerBound < 0, 'Outliers: Lower bound is below zero (-$2,492.14)');
  assert(outRes.results.outliers.upperBound > 5000, 'Outliers: Upper bound is above 5,000 ($7,512.73)');

  // 12. Skewness
  const skewRes = statisticalService.executeStatisticalAnalysis({
    rows,
    headers,
    columnSchema,
    query: 'Calculate skewness',
    filename: parsedSpreadsheet.filename,
    sheetName,
  });
  assert(skewRes.primaryOperation === 'SKEWNESS', 'Skewness: Primary operation classified as SKEWNESS');
  assert(Math.abs(skewRes.results.distribution.sampleSkewness) < 0.05, `Skewness: Approximately symmetric (~ -0.0061, actual: ${skewRes.results.distribution.sampleSkewness.toFixed(4)})`);

  // 13. Kurtosis
  const kurtRes = statisticalService.executeStatisticalAnalysis({
    rows,
    headers,
    columnSchema,
    query: 'Calculate kurtosis',
    filename: parsedSpreadsheet.filename,
    sheetName,
  });
  assert(kurtRes.primaryOperation === 'KURTOSIS', 'Kurtosis: Primary operation classified as KURTOSIS');
  assert(Math.abs(kurtRes.results.distribution.sampleExcessKurtosis - (-1.20)) < 0.05, `Kurtosis: Platykurtic uniform distribution (~ -1.20, actual: ${kurtRes.results.distribution.sampleExcessKurtosis.toFixed(4)})`);

  // 14. Correlation between Year and Amount
  const corrRes = statisticalService.executeStatisticalAnalysis({
    rows,
    headers,
    columnSchema,
    query: 'Calculate correlation between Year and Amount',
    filename: parsedSpreadsheet.filename,
    sheetName,
  });
  assert(corrRes.primaryOperation === 'CORRELATION', 'Correlation: Primary operation classified as CORRELATION');
  assert(corrRes.results.correlation !== null, 'Correlation: Result object generated');
  assert(corrRes.results.correlation.pearson.n === 100000, 'Correlation: Evaluated on 100,000 paired observations');
  assert(Math.abs(corrRes.results.correlation.pearson.pearsonR - 0.0002) < 0.005, `Correlation: Pearson r is near 0 (~0.0002, actual: ${corrRes.results.correlation.pearson.pearsonR})`);
  const corrResponse = universalResponseBuilder.buildDataAnalysisResponse({ statisticalResult: corrRes }, {}, 'Calculate correlation between Year and Amount');
  assert(corrResponse.includes('Correlation measures linear association and does NOT imply causation'), 'Correlation: Standard statistical caution present');

  // 15. Complete Statistical Summary
  const sumRes = statisticalService.executeStatisticalAnalysis({
    rows,
    headers,
    columnSchema,
    query: 'Generate a complete statistical summary',
    filename: parsedSpreadsheet.filename,
    sheetName,
  });
  assert(sumRes.isMultiStat, 'Summary: Marked as multi-statistic report');
  assert(sumRes.primaryOperation === 'MULTI_STATISTICAL_REPORT', 'Summary: Primary op classified as MULTI_STATISTICAL_REPORT');
  const sumResponse = universalResponseBuilder.buildDataAnalysisResponse({ statisticalResult: sumRes }, {}, 'Generate a complete statistical summary');
  assert(sumResponse.includes('| Statistical Measure | Calculated Value | Definition / Convention |'), 'Summary: Multi-stat Markdown table included');
  assert(sumResponse.includes('Mean (Arithmetic Average)'), 'Summary: Table contains Mean');
  assert(sumResponse.includes('Median (Q2 / 50th %ile)'), 'Summary: Table contains Median');
  assert(sumResponse.includes('Population Variance'), 'Summary: Table contains Population Variance');
  assert(sumResponse.includes('Sample Variance'), 'Summary: Table contains Sample Variance');
  assert(sumResponse.includes('Coefficient of Variation'), 'Summary: Table contains CV');

  // =========================================================================
  // SECTION 2: PHASE 8 — MULTIPLE CALCULATIONS IN A SINGLE REQUEST
  // =========================================================================
  console.log('\n--- Section 2: Phase 8 — Multi-Statistic Query in Single Request ---');

  const multiQuery = 'Calculate the mean, median, mode, variance, standard deviation and coefficient of variation of the Amount column';
  const multiRes = statisticalService.executeStatisticalAnalysis({
    rows,
    headers,
    columnSchema,
    query: multiQuery,
    filename: parsedSpreadsheet.filename,
    sheetName,
  });
  assert(multiRes.isMultiStat, 'Multi-Query: Correctly detected as multi-statistical request');
  assert(multiRes.targetColumn === 'Amount', 'Multi-Query: Target column correctly identified as Amount');
  const multiResponse = universalResponseBuilder.buildDataAnalysisResponse({ statisticalResult: multiRes }, {}, multiQuery);
  assert(multiResponse.includes('| Statistical Measure | Calculated Value |'), 'Multi-Query: Structured table generated');
  assert(multiResponse.includes('$2,510.35'), 'Multi-Query: Mean $2,510.35 present in table');
  assert(multiResponse.includes('$2,518.89'), 'Multi-Query: Median $2,518.89 present in table');
  assert(multiResponse.includes('57.40%'), 'Multi-Query: CV 57.40% present in table');
  assert(!multiResponse.includes('Appointment Status'), 'Multi-Query: Zero appointment contamination');
  assert(!multiResponse.includes('```json:doera-chart'), 'Multi-Query: No unsolicited chart generated');

  // =========================================================================
  // SECTION 3: PHASE 9 — SAME-CHAT 7-TURN STATISTICAL FOLLOW-UP SEQUENCE
  // =========================================================================
  console.log('\n--- Section 3: Phase 9 — Same-Chat 7-Turn Statistical Follow-Up Sequence ---');

  const conversationHistory = [];

  // Turn 1: "Calculate the mean of Amount."
  const t1Query = 'Calculate the mean of Amount.';
  const t1Analysis = await spreadsheetService.executeAnalysis({
    parsedSpreadsheet,
    userQuery: t1Query,
  });
  assert(t1Analysis.isStatisticalAnalysis, 'Turn 1: Classified as statistical analysis');
  assert(t1Analysis.statisticalResult.results.mean > 2500, 'Turn 1: Mean computed successfully');
  const t1Text = universalResponseBuilder.buildDataAnalysisResponse(t1Analysis, {}, t1Query);
  conversationHistory.push({ role: 'user', content: t1Query });
  conversationHistory.push({
    role: 'assistant',
    content: t1Text,
    dataContext: { calculation: t1Analysis.calculation, statisticalResult: t1Analysis.statisticalResult },
  });

  // Helper for context follow-up intent resolution
  const resolveIntent = (query) => {
    return conversationContextEngine.analyzeFollowUpIntent({
      text: query,
      lower: query.toLowerCase(),
      rawMessages: conversationHistory,
      activeCategory: 'DATA_ANALYSIS',
      hasEffectiveAttachments: true,
      lastCalculation: t1Analysis.calculation,
      lastChartConfig: null,
    });
  };

  // Turn 2: "Now calculate the median."
  const t2Query = 'Now calculate the median.';
  const t2Intent = resolveIntent(t2Query);
  assert(t2Intent.isFollowUp, 'Turn 2: Follow-up intent detected');
  assert(t2Intent.followUpType === 'STATISTICAL_INSPECTION', 'Turn 2: Follow-up type is STATISTICAL_INSPECTION');
  const t2Analysis = await spreadsheetService.executeAnalysis({
    parsedSpreadsheet,
    userQuery: t2Query,
  });
  assert(t2Analysis.statisticalResult.primaryOperation === 'MEDIAN', 'Turn 2: Primary op is MEDIAN');
  const t2Text = universalResponseBuilder.buildDataAnalysisResponse(t2Analysis, {}, t2Query);
  conversationHistory.push({ role: 'user', content: t2Query });
  conversationHistory.push({
    role: 'assistant',
    content: t2Text,
    dataContext: { calculation: t2Analysis.calculation, statisticalResult: t2Analysis.statisticalResult },
  });

  // Turn 3: "Find the standard deviation."
  const t3Query = 'Find the standard deviation.';
  const t3Intent = resolveIntent(t3Query);
  assert(t3Intent.isFollowUp, 'Turn 3: Follow-up intent detected');
  const t3Analysis = await spreadsheetService.executeAnalysis({
    parsedSpreadsheet,
    userQuery: t3Query,
  });
  assert(t3Analysis.statisticalResult.primaryOperation === 'STANDARD_DEVIATION', 'Turn 3: Primary op is STANDARD_DEVIATION');
  const t3Text = universalResponseBuilder.buildDataAnalysisResponse(t3Analysis, {}, t3Query);
  conversationHistory.push({ role: 'user', content: t3Query });
  conversationHistory.push({
    role: 'assistant',
    content: t3Text,
    dataContext: { calculation: t3Analysis.calculation, statisticalResult: t3Analysis.statisticalResult },
  });

  // Turn 4: "Calculate the coefficient of variation."
  const t4Query = 'Calculate the coefficient of variation.';
  const t4Intent = resolveIntent(t4Query);
  assert(t4Intent.isFollowUp, 'Turn 4: Follow-up intent detected');
  const t4Analysis = await spreadsheetService.executeAnalysis({
    parsedSpreadsheet,
    userQuery: t4Query,
  });
  assert(t4Analysis.statisticalResult.primaryOperation === 'COEFFICIENT_OF_VARIATION', 'Turn 4: Primary op is COEFFICIENT_OF_VARIATION');
  const t4Text = universalResponseBuilder.buildDataAnalysisResponse(t4Analysis, {}, t4Query);
  conversationHistory.push({ role: 'user', content: t4Query });
  conversationHistory.push({
    role: 'assistant',
    content: t4Text,
    dataContext: { calculation: t4Analysis.calculation, statisticalResult: t4Analysis.statisticalResult },
  });

  // Turn 5: "Explain what this CV means."
  const t5Query = 'Explain what this CV means.';
  const t5Intent = resolveIntent(t5Query);
  assert(t5Intent.isFollowUp, 'Turn 5: Follow-up intent detected');
  const t5Analysis = await spreadsheetService.executeAnalysis({
    parsedSpreadsheet,
    userQuery: t5Query,
  });
  assert(t5Analysis.statisticalResult.primaryOperation === 'COEFFICIENT_OF_VARIATION', 'Turn 5: Primary op is COEFFICIENT_OF_VARIATION');
  const t5Text = universalResponseBuilder.buildDataAnalysisResponse(t5Analysis, {}, t5Query);
  assert(t5Text.includes('Practical Meaning of this CV'), 'Turn 5: Practical interpretation provided');
  conversationHistory.push({ role: 'user', content: t5Query });
  conversationHistory.push({
    role: 'assistant',
    content: t5Text,
    dataContext: { calculation: t5Analysis.calculation, statisticalResult: t5Analysis.statisticalResult },
  });

  // Turn 6: "Compare it with the previous standard deviation."
  const t6Query = 'Compare it with the previous standard deviation.';
  const t6Intent = resolveIntent(t6Query);
  assert(t6Intent.isFollowUp, 'Turn 6: Follow-up intent detected');
  const t6Analysis = await spreadsheetService.executeAnalysis({
    parsedSpreadsheet,
    userQuery: t6Query,
  });
  assert(t6Analysis.statisticalResult.primaryOperation === 'COMPARE_METRICS', 'Turn 6: Primary op is COMPARE_METRICS');
  const t6Text = universalResponseBuilder.buildDataAnalysisResponse(t6Analysis, {}, t6Query);
  assert(t6Text.includes('Metric Comparison: Standard Deviation vs. Coefficient of Variation'), 'Turn 6: Comparative title rendered');
  assert(t6Text.includes('Absolute vs. Relative Measure'), 'Turn 6: Mathematical distinction explained');
  conversationHistory.push({ role: 'user', content: t6Query });
  conversationHistory.push({
    role: 'assistant',
    content: t6Text,
    dataContext: { calculation: t6Analysis.calculation, statisticalResult: t6Analysis.statisticalResult },
  });

  // Turn 7: "Give me a complete statistical summary."
  const t7Query = 'Give me a complete statistical summary.';
  const t7Intent = resolveIntent(t7Query);
  assert(t7Intent.isFollowUp, 'Turn 7: Follow-up intent detected');
  const t7Analysis = await spreadsheetService.executeAnalysis({
    parsedSpreadsheet,
    userQuery: t7Query,
  });
  assert(t7Analysis.statisticalResult.isMultiStat, 'Turn 7: Recognized complete summary');
  const t7Text = universalResponseBuilder.buildDataAnalysisResponse(t7Analysis, {}, t7Query);
  assert(t7Text.includes('Statistical Analysis Report'), 'Turn 7: Comprehensive report rendered');
  assert(t7Text.includes('| Statistical Measure | Calculated Value |'), 'Turn 7: Comprehensive table rendered');

  // =========================================================================
  // SECTION 4: PHASE 13 — MATHEMATICAL CROSS-VALIDATION
  // =========================================================================
  console.log('\n--- Section 4: Phase 13 — Mathematical Cross-Validation ---');

  const fullStat = statisticalService.executeStatisticalAnalysis({
    rows,
    headers,
    columnSchema,
    query: 'statistical summary',
    filename: parsedSpreadsheet.filename,
    sheetName,
  });

  const { mean, median, variance, standardDeviation, coefficientOfVariation, quartiles, range, seriesMetadata } = fullStat.results;

  // 1. Median == Q2
  assert(Math.abs(median - quartiles.q2) < 0.0001, 'Cross-Val 1: Median equals Q2 (50th percentile)');

  // 2. (SD)^2 == Variance
  const popSdSquared = Math.pow(standardDeviation.populationStandardDeviation, 2);
  const sampSdSquared = Math.pow(standardDeviation.sampleStandardDeviation, 2);
  assert(Math.abs(popSdSquared - variance.populationVariance) < 0.001, 'Cross-Val 2: (Pop SD)^2 equals Pop Variance');
  assert(Math.abs(sampSdSquared - variance.sampleVariance) < 0.001, 'Cross-Val 3: (Sample SD)^2 equals Sample Variance');

  // 3. CV == (SD / Mean) * 100
  const expectedPopCV = (standardDeviation.populationStandardDeviation / mean) * 100;
  const expectedSampCV = (standardDeviation.sampleStandardDeviation / mean) * 100;
  assert(Math.abs(coefficientOfVariation.populationCV - expectedPopCV) < 0.001, 'Cross-Val 4: Pop CV equals (Pop SD / Mean) * 100');
  assert(Math.abs(coefficientOfVariation.sampleCV - expectedSampCV) < 0.001, 'Cross-Val 5: Sample CV equals (Sample SD / Mean) * 100');

  // 4. Range == Max - Min
  assert(Math.abs(range.range - (range.max - range.min)) < 0.0001, 'Cross-Val 6: Range equals Max - Min');

  // 5. Total count == Valid observations
  assert(fullStat.seriesMetadata.validCount === 100000, 'Cross-Val 7: Valid count equals total 100,000 observations');
  assert(fullStat.seriesMetadata.missingCount === 0, 'Cross-Val 8: Missing count is exactly 0');
  assert(fullStat.seriesMetadata.completeness === 100, 'Cross-Val 9: Data completeness is 100%');

  // 6. Zero charts generated when not asked
  const noChartAnalysis = await spreadsheetService.executeAnalysis({
    parsedSpreadsheet,
    userQuery: 'Calculate the variance and standard deviation',
  });
  assert(!noChartAnalysis.chartConfig, 'Cross-Val 10: Zero chart generated when user did not request visualization');

  // 7. Zero workflow contamination in any statistical response
  const responsesToCheck = [meanResponse, medianResponse, popVarResponse, sampVarResponse, popSdResponse, sampSdResponse, multiResponse, t5Text, t6Text, t7Text];
  const contaminationKeywords = [
    'Appointment Status',
    'Awaiting Provider Confirmation',
    'Preferred Window',
    'Internal Tracking Reference',
    'Human Authorization Required',
    'Authorize & Execute Action',
    'Dispatch the inquiry',
    'Provider Confirmation',
    'Next Steps',
    'Booking or reservation status',
  ];

  let hasContamination = false;
  for (const resp of responsesToCheck) {
    for (const kw of contaminationKeywords) {
      if (resp.includes(kw)) {
        hasContamination = true;
        console.error(`Contamination found: "${kw}"`);
      }
    }
  }
  assert(!hasContamination, 'Cross-Val 11: Zero appointment / booking / outreach workflow contamination across all responses');

  // =========================================================================
  // SUMMARY
  // =========================================================================
  console.log('\n=================================================================');
  console.log(` STATISTICAL TEST SUITE FINISHED: ${passedCount} PASSED, ${failedCount} FAILED`);
  console.log('=================================================================\n');

  if (failedCount > 0) {
    process.exit(1);
  }
}

runTestSuite().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
