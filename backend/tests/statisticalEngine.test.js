/**
 * DOERA AI — COMPREHENSIVE STATISTICAL CALCULATION TEST SUITE
 * 
 * Verifies:
 * 1. 15 independent mathematical & statistical operations on 100,000-row real dataset.
 * 2. Exact user request matching & dynamic response generation (Mean/Med/Mode, Var/SD, Q1/Q3).
 * 3. Clean mathematical answer format (Formula, Actual Substitution, \boxed final answer).
 * 4. Formula delimiter compliance (\[ ... \] block equations, \( ... \) inline expressions).
 * 5. Natural language phrasing variations.
 * 6. Same-chat multi-turn follow-ups without context bleed.
 * 7. Mathematical cross-validations, chart suppression, and zero workflow contamination.
 */

import path from 'path';
import { fileURLToPath } from 'url';
import * as xlsxModule from 'xlsx';
const XLSX = xlsxModule.default || xlsxModule;

import { statisticalService } from '../src/services/statisticalService.js';
import { spreadsheetService } from '../src/services/spreadsheetService.js';
import { universalResponseBuilder } from '../src/services/universalResponseBuilder.js';
import { conversationContextEngine } from '../src/services/conversationContextEngine.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATASET_PATH = 'D:\\Dev\\Projects\\Doera AI\\backend\\uploads\\6af9f47dfd7fce5d5a7e9847\\6b0148a4320bf7b74d0cba2f\\1795246244416-financial_expense_tracker_100k.xlsx';

let passedCount = 0;
let failedCount = 0;

function assert(condition, message) {
  if (condition) {
    passedCount++;
    console.log(`  ✓ PASS: ${message}`);
  } else {
    failedCount++;
    console.error(`  ✗ FAIL: ${message}`);
  }
}

async function runTestSuite() {
  console.log('=================================================================');
  console.log(' DOERA AI — COMPREHENSIVE STATISTICAL CALCULATION TEST SUITE');
  console.log('=================================================================\n');

  console.log(`[1/5] Loading 100,000-row dataset from:\n      ${DATASET_PATH}`);
  const t0 = Date.now();
  const workbook = XLSX.readFile(DATASET_PATH);
  const sheetName = workbook.SheetNames[0];
  const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
  console.log(`      Loaded ${rows.length.toLocaleString()} records in ${Date.now() - t0}ms.\n`);

  assert(rows.length === 100000, 'Dataset record count matches exactly 100,000 rows');

  const headers = Object.keys(rows[0] || {});
  const columnSchema = {};
  for (const h of headers) {
    const val = rows[0][h];
    columnSchema[h] = {
      name: h,
      type: typeof val === 'number' || (!isNaN(parseFloat(val)) && isFinite(val)) ? 'numeric' : 'text',
    };
  }

  const parsedSpreadsheet = {
    filename: 'financial_expense_tracker_100k.xlsx',
    sheets: [{ name: sheetName, rows, headers, rowCount: rows.length }],
    headers,
    totalRows: rows.length,
    columnSchema,
  };

  // =========================================================================
  // SECTION 1: 15 INDEPENDENT STATISTICAL OPERATIONS (CLEAN MATH FORMAT)
  // =========================================================================
  console.log('\n--- Section 1: 15 Independent Statistical Operations (Clean Math Format) ---');

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
  assert(meanResponse.includes('**Mean Calculation**'), 'Mean: Clean calculation title present');
  assert(meanResponse.includes('\\[') && meanResponse.includes('\\bar{x} = \\frac{\\sum x_i}{N}'), 'Mean: Standard LaTeX block formula present');
  assert(meanResponse.includes('251,035,003.20') && meanResponse.includes('100,000'), 'Mean: Actual dataset numerator and denominator substituted');
  assert(meanResponse.includes('\\boxed{\\bar{x} = $2,510.35}'), 'Mean: Boxed final answer present');
  assert(!meanResponse.includes('Variance'), 'Mean: Unrequested Variance is not displayed');
  assert(!meanResponse.includes('Standard Deviation'), 'Mean: Unrequested Standard Deviation is not displayed');
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
  assert(medianResponse.includes('**Median Calculation**'), 'Median: Clean calculation title present');
  assert(medianResponse.includes('\\boxed{\\text{Median} = $2,518.89}'), 'Median: Boxed final answer present');
  assert(!medianResponse.includes('Variance'), 'Median: Unrequested Variance is not displayed');

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
  const modeResponse = universalResponseBuilder.buildDataAnalysisResponse({ statisticalResult: modeRes }, {}, 'Find mode of Amount');
  assert(modeResponse.includes('**Mode Calculation**'), 'Mode: Clean calculation title present');
  assert(modeResponse.includes('\\boxed{\\text{Mode} = $1,678.97 \\quad (\\text{Frequency: } 5)}'), 'Mode: Boxed final answer present');

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
  assert(popVarResponse.includes('**Population variance**'), 'Population Variance: Section specifies Population variance');
  assert(popVarResponse.includes('207,642,270,421.91') && popVarResponse.includes('100,000'), 'Population Variance: Sum of squared diffs substituted');
  assert(popVarResponse.includes('\\boxed{\\sigma^2 = 2,076,422.7042}'), 'Population Variance: Boxed final answer present');
  assert(!popVarResponse.includes('Coefficient of Variation'), 'Population Variance: CV is not displayed');

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
  assert(sampVarResponse.includes('**Sample variance**'), 'Sample Variance: Section specifies Sample variance');
  assert(sampVarResponse.includes('99,999'), 'Sample Variance: n - 1 degrees of freedom substituted');
  assert(sampVarResponse.includes('\\boxed{s^2 = 2,076,443.4687}'), 'Sample Variance: Boxed final answer present');

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
  assert(popSdResponse.includes('**Population Standard Deviation**'), 'Pop SD: Section specifies Population Standard Deviation');
  assert(popSdResponse.includes('\\boxed{\\sigma = $1,440.98}'), 'Pop SD: Boxed final answer present');

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
  assert(sampSdResponse.includes('**Sample Standard Deviation**'), 'Sample SD: Section specifies Sample Standard Deviation');
  assert(sampSdResponse.includes('\\boxed{s = $1,440.99}'), 'Sample SD: Boxed final answer present');

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
  const cvResponse = universalResponseBuilder.buildDataAnalysisResponse({ statisticalResult: cvRes }, {}, 'Calculate coefficient of variation');
  assert(cvResponse.includes('**Coefficient of Variation**'), 'CV: Clean calculation title present');
  assert(cvResponse.includes('\\boxed{CV = 57.40\\%}'), 'CV: Boxed final answer present');

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
  const rangeResponse = universalResponseBuilder.buildDataAnalysisResponse({ statisticalResult: rangeRes }, {}, 'Calculate range');
  assert(rangeResponse.includes('**Range Calculation**'), 'Range: Clean calculation title present');
  assert(rangeResponse.includes('\\boxed{\\text{Range} = $4,989.87}'), 'Range: Boxed final answer present');

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
  const qResponse = universalResponseBuilder.buildDataAnalysisResponse({ statisticalResult: qRes }, {}, 'Calculate Q1, Q2, and Q3');
  assert(qResponse.includes('\\boxed{\\text{IQR} = $2,501.22}'), 'Quartiles: Boxed IQR final answer present');

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
  const outResponse = universalResponseBuilder.buildDataAnalysisResponse({ statisticalResult: outRes }, {}, 'Identify outliers using the IQR method');
  assert(outResponse.includes('\\boxed{\\text{Outliers Identified} = 0'), 'Outliers: Boxed zero outliers final answer present');

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
  const skewResponse = universalResponseBuilder.buildDataAnalysisResponse({ statisticalResult: skewRes }, {}, 'Calculate skewness');
  assert(skewResponse.includes('\\boxed{G_1 = -0.0061}'), 'Skewness: Boxed G_1 final answer present');

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
  const kurtResponse = universalResponseBuilder.buildDataAnalysisResponse({ statisticalResult: kurtRes }, {}, 'Calculate kurtosis');
  assert(kurtResponse.includes('\\boxed{G_2 = -1.2026}'), 'Kurtosis: Boxed G_2 final answer present');

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
  assert(corrResponse.includes('\\boxed{r = 0.0002}'), 'Correlation: Boxed Pearson r final answer present');

  // 15. Complete Statistical Summary (Explicit user request for full analysis)
  const sumRes = statisticalService.executeStatisticalAnalysis({
    rows,
    headers,
    columnSchema,
    query: 'Generate a complete statistical summary',
    filename: parsedSpreadsheet.filename,
    sheetName,
  });
  assert(sumRes.isFullSummary, 'Summary: Marked as full summary');
  const sumResponse = universalResponseBuilder.buildDataAnalysisResponse({ statisticalResult: sumRes }, {}, 'Generate a complete statistical summary');
  assert(sumResponse.includes('| Statistical Measure | Calculated Value | Definition / Convention |'), 'Summary: Full 3-column table included');
  assert(sumResponse.includes('Mean'), 'Summary: Table contains Mean');
  assert(sumResponse.includes('Median'), 'Summary: Table contains Median');
  assert(sumResponse.includes('Population Variance'), 'Summary: Table contains Population Variance');
  assert(sumResponse.includes('Sample Variance'), 'Summary: Table contains Sample Variance');
  assert(sumResponse.includes('Coefficient of Variation'), 'Summary: Table contains CV');

  // =========================================================================
  // SECTION 2: EXACT REQUEST MATCHING & DYNAMIC FILTERING (CLEAN MATH FORMAT)
  // =========================================================================
  console.log('\n--- Section 2: Exact User Request Matching & Dynamic Filtering ---');

  // TEST 1: "Calculate the mean, median and mode." -> MUST return ONLY Mean, Median, Mode in clean math format
  const qMeanMedMode = 'Calculate the mean, median and mode.';
  const resMeanMedMode = statisticalService.executeStatisticalAnalysis({
    rows,
    headers,
    columnSchema,
    query: qMeanMedMode,
    filename: parsedSpreadsheet.filename,
    sheetName,
  });
  assert(resMeanMedMode.requestedOperations.length === 3, 'Mean/Med/Mode: Allowlist contains exactly 3 operations');
  assert(resMeanMedMode.requestedOperations.includes('mean'), 'Mean/Med/Mode: Contains mean');
  assert(resMeanMedMode.requestedOperations.includes('median'), 'Mean/Med/Mode: Contains median');
  assert(resMeanMedMode.requestedOperations.includes('mode'), 'Mean/Med/Mode: Contains mode');
  assert(!resMeanMedMode.requestedOperations.includes('variance'), 'Mean/Med/Mode: Does NOT contain variance');

  const textMeanMedMode = universalResponseBuilder.buildDataAnalysisResponse({ statisticalResult: resMeanMedMode }, {}, qMeanMedMode);
  assert(textMeanMedMode.includes('**Statistical Calculations**'), 'Mean/Med/Mode: Header is **Statistical Calculations**');
  assert(textMeanMedMode.includes('**1. Mean**') && textMeanMedMode.includes('\\boxed{\\bar{x} = $2,510.35}'), 'Mean/Med/Mode: Has 1. Mean with boxed final answer');
  assert(textMeanMedMode.includes('**2. Median**') && textMeanMedMode.includes('\\boxed{\\text{Median} = $2,518.89}'), 'Mean/Med/Mode: Has 2. Median with boxed final answer');
  assert(textMeanMedMode.includes('**3. Mode**') && textMeanMedMode.includes('\\boxed{\\text{Mode} = $1,678.97'), 'Mean/Med/Mode: Has 3. Mode with boxed final answer');

  // Strict negative verification: Unrequested metrics MUST NOT be displayed
  assert(!textMeanMedMode.includes('Variance'), 'Mean/Med/Mode: STRICT - Zero Variance displayed');
  assert(!textMeanMedMode.includes('Standard Deviation'), 'Mean/Med/Mode: STRICT - Zero Standard Deviation displayed');
  assert(!textMeanMedMode.includes('Coefficient of Variation'), 'Mean/Med/Mode: STRICT - Zero CV displayed');
  assert(!textMeanMedMode.includes('Quartile'), 'Mean/Med/Mode: STRICT - Zero Quartiles displayed');
  assert(!textMeanMedMode.includes('Skewness'), 'Mean/Med/Mode: STRICT - Zero Skewness displayed');
  assert(!textMeanMedMode.includes('Kurtosis'), 'Mean/Med/Mode: STRICT - Zero Kurtosis displayed');
  assert(!textMeanMedMode.includes('Outlier'), 'Mean/Med/Mode: STRICT - Zero Outlier displayed');
  assert(!textMeanMedMode.includes('```json:doera-chart'), 'Mean/Med/Mode: STRICT - Zero chart generated');

  // TEST 2: "Calculate mean and median." -> ONLY Mean and Median
  const qMeanMed = 'Calculate mean and median.';
  const resMeanMed = statisticalService.executeStatisticalAnalysis({
    rows,
    headers,
    columnSchema,
    query: qMeanMed,
    filename: parsedSpreadsheet.filename,
    sheetName,
  });
  assert(resMeanMed.requestedOperations.length === 2, 'Mean/Med: Allowlist has exactly 2 operations');
  const textMeanMed = universalResponseBuilder.buildDataAnalysisResponse({ statisticalResult: resMeanMed }, {}, qMeanMed);
  assert(textMeanMed.includes('\\boxed{\\bar{x} = $2,510.35}'), 'Mean/Med: Has Mean boxed answer');
  assert(textMeanMed.includes('\\boxed{\\text{Median} = $2,518.89}'), 'Mean/Med: Has Median boxed answer');
  assert(!textMeanMed.includes('Mode'), 'Mean/Med: STRICT - Zero Mode displayed');
  assert(!textMeanMed.includes('Variance'), 'Mean/Med: STRICT - Zero Variance displayed');

  // TEST 3: "Calculate variance and standard deviation." -> ONLY Variance and Standard Deviation
  const qVarSd = 'Calculate variance and standard deviation.';
  const resVarSd = statisticalService.executeStatisticalAnalysis({
    rows,
    headers,
    columnSchema,
    query: qVarSd,
    filename: parsedSpreadsheet.filename,
    sheetName,
  });
  assert(resVarSd.requestedOperations.includes('variance') && resVarSd.requestedOperations.includes('standard_deviation'), 'Var/SD: Detected variance and SD');
  const textVarSd = universalResponseBuilder.buildDataAnalysisResponse({ statisticalResult: resVarSd }, {}, qVarSd);
  assert(textVarSd.includes('Variance'), 'Var/SD: Has Variance section');
  assert(textVarSd.includes('Standard Deviation'), 'Var/SD: Has Standard Deviation section');
  assert(!textVarSd.includes('**Mean**'), 'Var/SD: STRICT - Mean is not displayed');
  assert(!textVarSd.includes('**Mode**'), 'Var/SD: STRICT - Mode is not displayed');
  assert(!textVarSd.includes('Quartile'), 'Var/SD: STRICT - Quartiles are not displayed');

  // TEST 4: "Calculate Q1 and Q3." -> ONLY Q1, Q3 (and supporting IQR)
  const qQ1Q3 = 'Calculate Q1 and Q3.';
  const resQ1Q3 = statisticalService.executeStatisticalAnalysis({
    rows,
    headers,
    columnSchema,
    query: qQ1Q3,
    filename: parsedSpreadsheet.filename,
    sheetName,
  });
  assert(resQ1Q3.requestedOperations.includes('q1') && resQ1Q3.requestedOperations.includes('q3'), 'Q1/Q3: Detected Q1 and Q3');
  const textQ1Q3 = universalResponseBuilder.buildDataAnalysisResponse({ statisticalResult: resQ1Q3 }, {}, qQ1Q3);
  assert(textQ1Q3.includes('$1,259.69'), 'Q1/Q3: Has Q1 value');
  assert(textQ1Q3.includes('$3,760.90'), 'Q1/Q3: Has Q3 value');
  assert(!textQ1Q3.includes('Mean'), 'Q1/Q3: STRICT - Mean not displayed');
  assert(!textQ1Q3.includes('Mode'), 'Q1/Q3: STRICT - Mode not displayed');
  assert(!textQ1Q3.includes('Variance'), 'Q1/Q3: STRICT - Variance not displayed');

  // TEST 5: "Calculate mean, median, mode and standard deviation." -> EXACTLY 4 metrics
  const q4Metrics = 'Calculate mean, median, mode and standard deviation.';
  const res4Metrics = statisticalService.executeStatisticalAnalysis({
    rows,
    headers,
    columnSchema,
    query: q4Metrics,
    filename: parsedSpreadsheet.filename,
    sheetName,
  });
  assert(res4Metrics.requestedOperations.length === 4, '4-Metrics: Exactly 4 metrics in allowlist');
  const text4Metrics = universalResponseBuilder.buildDataAnalysisResponse({ statisticalResult: res4Metrics }, {}, q4Metrics);
  assert(text4Metrics.includes('Mean'), '4-Metrics: Has Mean');
  assert(text4Metrics.includes('Median'), '4-Metrics: Has Median');
  assert(text4Metrics.includes('Mode'), '4-Metrics: Has Mode');
  assert(text4Metrics.includes('Standard Deviation'), '4-Metrics: Has Standard Deviation');
  assert(!text4Metrics.includes('Variance'), '4-Metrics: STRICT - Zero Variance displayed');
  assert(!text4Metrics.includes('Quartile'), '4-Metrics: STRICT - Zero Quartile displayed');
  assert(!text4Metrics.includes('Skewness'), '4-Metrics: STRICT - Zero Skewness displayed');

  // =========================================================================
  // SECTION 3: NATURAL LANGUAGE VARIATIONS
  // =========================================================================
  console.log('\n--- Section 3: Natural Language Variations ---');

  // NL 1: "What's the average transaction amount?" -> Mean only
  const nl1 = "What's the average transaction amount?";
  const resNl1 = statisticalService.executeStatisticalAnalysis({
    rows,
    headers,
    columnSchema,
    query: nl1,
    filename: parsedSpreadsheet.filename,
    sheetName,
  });
  assert(resNl1.primaryOperation === 'MEAN', 'NL 1: "average transaction amount" maps to MEAN');
  const textNl1 = universalResponseBuilder.buildDataAnalysisResponse({ statisticalResult: resNl1 }, {}, nl1);
  assert(textNl1.includes('$2,510.35'), 'NL 1: Mean value $2,510.35 present');
  assert(!textNl1.includes('Variance'), 'NL 1: Zero Variance displayed');

  // NL 2: "Tell me the middle value." -> Median only
  const nl2 = 'Tell me the middle value.';
  const resNl2 = statisticalService.executeStatisticalAnalysis({
    rows,
    headers,
    columnSchema,
    query: nl2,
    filename: parsedSpreadsheet.filename,
    sheetName,
  });
  assert(resNl2.primaryOperation === 'MEDIAN', 'NL 2: "middle value" maps to MEDIAN');
  const textNl2 = universalResponseBuilder.buildDataAnalysisResponse({ statisticalResult: resNl2 }, {}, nl2);
  assert(textNl2.includes('$2,518.89'), 'NL 2: Median value $2,518.89 present');

  // NL 3: "Which amount occurs most frequently?" -> Mode only
  const nl3 = 'Which amount occurs most frequently?';
  const resNl3 = statisticalService.executeStatisticalAnalysis({
    rows,
    headers,
    columnSchema,
    query: nl3,
    filename: parsedSpreadsheet.filename,
    sheetName,
  });
  assert(resNl3.primaryOperation === 'MODE', 'NL 3: "occurs most frequently" maps to MODE');
  const textNl3 = universalResponseBuilder.buildDataAnalysisResponse({ statisticalResult: resNl3 }, {}, nl3);
  assert(textNl3.includes('$1,678.97'), 'NL 3: Mode value $1,678.97 present');

  // NL 4: "Find the spread of these values." -> Range only
  const nl4 = 'Find the spread of these values.';
  const resNl4 = statisticalService.executeStatisticalAnalysis({
    rows,
    headers,
    columnSchema,
    query: nl4,
    filename: parsedSpreadsheet.filename,
    sheetName,
  });
  assert(resNl4.primaryOperation === 'RANGE', 'NL 4: "spread of these values" maps to RANGE');
  const textNl4 = universalResponseBuilder.buildDataAnalysisResponse({ statisticalResult: resNl4 }, {}, nl4);
  assert(textNl4.includes('$4,989.87'), 'NL 4: Range spread $4,989.87 present');

  // NL 5: "How much variation is present in the expenses?" -> Variance & SD
  const nl5 = 'How much variation is present in the expenses?';
  const resNl5 = statisticalService.executeStatisticalAnalysis({
    rows,
    headers,
    columnSchema,
    query: nl5,
    filename: parsedSpreadsheet.filename,
    sheetName,
  });
  assert(resNl5.requestedOperations.includes('variance') || resNl5.requestedOperations.includes('standard_deviation'), 'NL 5: "variation present" maps to variability');
  const textNl5 = universalResponseBuilder.buildDataAnalysisResponse({ statisticalResult: resNl5 }, {}, nl5);
  assert(textNl5.includes('Variance') || textNl5.includes('Standard Deviation'), 'NL 5: Variability metrics present');
  assert(!textNl5.includes('Quartile'), 'NL 5: Zero Quartiles displayed');

  // =========================================================================
  // SECTION 4: SAME-CHAT MULTI-TURN FOLLOW-UP SEQUENCE
  // =========================================================================
  console.log('\n--- Section 4: Phase 6 — Same-Chat Multi-Turn Follow-Ups without Context Pollution ---');

  const conversationHistory = [];
  const resolveIntent = (query, lastCalc) => {
    return conversationContextEngine.analyzeFollowUpIntent({
      text: query,
      lower: query.toLowerCase(),
      rawMessages: conversationHistory,
      activeCategory: 'DATA_ANALYSIS',
      hasEffectiveAttachments: true,
      lastCalculation: lastCalc,
      lastChartConfig: null,
    });
  };

  // Turn 1: "Calculate the mean, median and mode."
  const t1Query = 'Calculate the mean, median and mode.';
  const t1Analysis = await spreadsheetService.executeAnalysis(parsedSpreadsheet, t1Query);
  assert(t1Analysis.isStatisticalAnalysis, 'Turn 1: Statistical analysis executed');
  assert(t1Analysis.statisticalResult.requestedOperations.length === 3, 'Turn 1: Exact 3 operations detected');
  const t1Text = universalResponseBuilder.buildDataAnalysisResponse(t1Analysis, {}, t1Query);
  assert(t1Text.includes('**1. Mean**') && t1Text.includes('**2. Median**') && t1Text.includes('**3. Mode**'), 'Turn 1: Renders exactly Mean, Median, Mode');
  assert(!t1Text.includes('Variance'), 'Turn 1: Zero Variance displayed');
  conversationHistory.push({ role: 'user', content: t1Query });
  conversationHistory.push({
    role: 'assistant',
    content: t1Text,
    dataContext: { calculation: t1Analysis.calculation, statisticalResult: t1Analysis.statisticalResult },
  });

  // Turn 2: "Now calculate the variance." -> Must display ONLY Variance
  const t2Query = 'Now calculate the variance.';
  const t2Intent = resolveIntent(t2Query, t1Analysis.calculation);
  assert(t2Intent.isFollowUp, 'Turn 2: Follow-up intent detected');
  const t2Analysis = await spreadsheetService.executeAnalysis(parsedSpreadsheet, t2Query);
  assert(t2Analysis.statisticalResult.primaryOperation === 'VARIANCE', 'Turn 2: Primary op is strictly VARIANCE');
  assert(t2Analysis.statisticalResult.requestedOperations.length === 1, 'Turn 2: Does not bleed Mean/Median/Mode from Turn 1');
  const t2Text = universalResponseBuilder.buildDataAnalysisResponse(t2Analysis, {}, t2Query);
  assert(t2Text.includes('**Variance Calculation**'), 'Turn 2: Variance header displayed');
  assert(!t2Text.includes('**Median**'), 'Turn 2: Median is NOT repeated in Turn 2');
  assert(!t2Text.includes('**Mode**'), 'Turn 2: Mode is NOT repeated in Turn 2');
  conversationHistory.push({ role: 'user', content: t2Query });
  conversationHistory.push({
    role: 'assistant',
    content: t2Text,
    dataContext: { calculation: t2Analysis.calculation, statisticalResult: t2Analysis.statisticalResult },
  });

  // Turn 3: "Explain the variance."
  const t3Query = 'Explain the variance.';
  const t3Analysis = await spreadsheetService.executeAnalysis(parsedSpreadsheet, t3Query);
  assert(t3Analysis.statisticalResult.primaryOperation === 'VARIANCE', 'Turn 3: Evaluates variance');
  const t3Text = universalResponseBuilder.buildDataAnalysisResponse(t3Analysis, {}, t3Query);
  assert(t3Text.includes('2,076,422.7042') || t3Text.includes('2,076,443.4687'), 'Turn 3: Exact calculated variance values present');
  conversationHistory.push({ role: 'user', content: t3Query });
  conversationHistory.push({
    role: 'assistant',
    content: t3Text,
    dataContext: { calculation: t3Analysis.calculation, statisticalResult: t3Analysis.statisticalResult },
  });

  // Turn 4: "Calculate the coefficient of variation."
  const t4Query = 'Calculate the coefficient of variation.';
  const t4Analysis = await spreadsheetService.executeAnalysis(parsedSpreadsheet, t4Query);
  assert(t4Analysis.statisticalResult.primaryOperation === 'COEFFICIENT_OF_VARIATION', 'Turn 4: Op is COEFFICIENT_OF_VARIATION');
  const t4Text = universalResponseBuilder.buildDataAnalysisResponse(t4Analysis, {}, t4Query);
  assert(t4Text.includes('57.40%') || t4Text.includes('57.40\\%'), 'Turn 4: CV 57.40% present');
  conversationHistory.push({ role: 'user', content: t4Query });
  conversationHistory.push({
    role: 'assistant',
    content: t4Text,
    dataContext: { calculation: t4Analysis.calculation, statisticalResult: t4Analysis.statisticalResult },
  });

  // Turn 5: "Give me a complete statistical summary."
  const t5Query = 'Give me a complete statistical summary.';
  const t5Analysis = await spreadsheetService.executeAnalysis(parsedSpreadsheet, t5Query);
  assert(t5Analysis.statisticalResult.isFullSummary, 'Turn 5: Full summary recognized');
  const t5Text = universalResponseBuilder.buildDataAnalysisResponse(t5Analysis, {}, t5Query);
  assert(t5Text.includes('## Complete Statistical Analysis Report'), 'Turn 5: Full report header present');
  assert(t5Text.includes('| Statistical Measure | Calculated Value | Definition / Convention |'), 'Turn 5: Full table present');

  // =========================================================================
  // SECTION 5: MATHEMATICAL CROSS-VALIDATION
  // =========================================================================
  console.log('\n--- Section 5: Mathematical Cross-Validation ---');

  const fullStat = statisticalService.executeStatisticalAnalysis({
    rows,
    headers,
    columnSchema,
    query: 'complete statistical analysis',
    filename: parsedSpreadsheet.filename,
    sheetName,
  });

  const { mean, median, variance, standardDeviation, coefficientOfVariation, quartiles, range } = fullStat.results;

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
  const noChartAnalysis = await spreadsheetService.executeAnalysis(parsedSpreadsheet, 'Calculate the variance and standard deviation');
  assert(!noChartAnalysis.chartConfig, 'Cross-Val 10: Zero chart generated when user did not request visualization');

  // 7. Zero workflow contamination in any statistical response
  const responsesToCheck = [meanResponse, medianResponse, popVarResponse, sampVarResponse, popSdResponse, sampSdResponse, textMeanMedMode, textMeanMed, textVarSd, t5Text];
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
