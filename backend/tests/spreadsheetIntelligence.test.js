import { describe, test, expect, beforeAll } from '@jest/globals';
import * as XLSX from 'xlsx';
import spreadsheetService from '../src/services/spreadsheetService.js';
import dataAnalysisAgent from '../src/agents/dataAnalysisAgent.js';
import universalIntentService from '../src/services/universalIntentService.js';
import { buildUniversalResponse } from '../src/services/universalResponseBuilder.js';

describe('DOERA AI — Spreadsheet Intelligence, Data Analysis & Dynamic Charts Suite', () => {
  let sampleExcelBuffer;
  let sampleCsvBuffer;

  beforeAll(async () => {
    // 1. Create In-Memory Multi-Sheet Excel Workbook (.xlsx)
    const workbook = XLSX.utils.book_new();

    // Sheet 1: Expenses
    const expensesData = [
      { Category: 'Marketing', Amount: 45000, Date: '2026-01-15', Vendor: 'Google Ads', Department: 'Growth' },
      { Category: 'Engineering', Amount: 38000, Date: '2026-01-18', Vendor: 'AWS Cloud', Department: 'Tech' },
      { Category: 'Operations', Amount: 22000, Date: '2026-01-20', Vendor: 'Office Supply Co', Department: 'Admin' },
      { Category: 'Marketing', Amount: 25000, Date: '2026-02-10', Vendor: 'Meta Ads', Department: 'Growth' },
      { Category: 'Engineering', Amount: 42000, Date: '2026-02-15', Vendor: 'Datadog', Department: 'Tech' },
      { Category: 'Sales', Amount: 18000, Date: '2026-02-22', Vendor: 'Salesforce', Department: 'Revenue' },
      { Category: 'Operations', Amount: 15000, Date: '2026-03-05', Vendor: 'WeWork', Department: 'Admin' },
      { Category: 'Facilities', Amount: 9500, Date: '2026-03-12', Vendor: 'CleanCorp', Department: 'Admin' },
      // Duplicate row to verify duplicate detection
      { Category: 'Facilities', Amount: 9500, Date: '2026-03-12', Vendor: 'CleanCorp', Department: 'Admin' },
      // Row with missing/null amount to test missing value handling
      { Category: 'Legal', Amount: null, Date: '2026-03-20', Vendor: 'Law Partners', Department: 'Legal' },
      // Outlier record ($180,000) to test anomaly detection
      { Category: 'Executive', Amount: 180000, Date: '2026-03-25', Vendor: 'Acquisition Corp', Department: 'Exec' },
    ];
    const expensesSheet = XLSX.utils.json_to_sheet(expensesData);
    XLSX.utils.book_append_sheet(workbook, expensesSheet, 'Expenses');

    // Sheet 2: Product_Sales
    const salesData = [
      { Product: 'DOERA Pro Subscription', Quarter: 'Q1 2026', Units_Sold: 1200, Revenue: 72000, Profit_Margin: '42%' },
      { Product: 'Enterprise API License', Quarter: 'Q1 2026', Units_Sold: 45, Revenue: 135000, Profit_Margin: '68%' },
      { Product: 'Autonomous Agent Addon', Quarter: 'Q1 2026', Units_Sold: 850, Revenue: 34000, Profit_Margin: '55%' },
      { Product: 'Dedicated Worker Node', Quarter: 'Q1 2026', Units_Sold: 110, Revenue: 55000, Profit_Margin: '38%' },
      { Product: 'Consulting Onboarding', Quarter: 'Q1 2026', Units_Sold: 15, Revenue: 22500, Profit_Margin: '75%' },
      { Product: 'Legacy Adapter Plugin', Quarter: 'Q1 2026', Units_Sold: 30, Revenue: 6000, Profit_Margin: '20%' },
    ];
    const salesSheet = XLSX.utils.json_to_sheet(salesData);
    XLSX.utils.book_append_sheet(workbook, salesSheet, 'Product_Sales');

    sampleExcelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    // 2. Create In-Memory CSV Dataset
    const csvContent = `Month,Income,Expenses,Net_Savings
2026-01,85000,52000,33000
2026-02,92000,58000,34000
2026-03,110000,64000,46000
2026-04,105000,61000,44000
2026-05,125000,72000,53000
2026-06,140000,78000,62000`;
    sampleCsvBuffer = Buffer.from(csvContent, 'utf8');
  });

  // =========================================================================
  // 1. PARSING & DATA UNDERSTANDING
  // =========================================================================
  describe('SpreadsheetService — Multi-Format Parsing & Data Integrity', () => {
    test('extracts multiple worksheets, columns and rows from Excel file', async () => {
      const parsed = await spreadsheetService.parseSpreadsheet({
        buffer: sampleExcelBuffer,
        filename: 'corporate_q1.xlsx',
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });

      expect(parsed.filename).toBe('corporate_q1.xlsx');
      expect(parsed.fileType).toBe('XLSX');
      expect(parsed.sheetCount).toBe(2);
      expect(parsed.sheetNames).toEqual(['Expenses', 'Product_Sales']);

      const expensesSheet = parsed.sheets.find((s) => s.name === 'Expenses');
      expect(expensesSheet).toBeDefined();
      expect(expensesSheet.rowCount).toBe(11);
      expect(expensesSheet.headers).toContain('Category');
      expect(expensesSheet.headers).toContain('Amount');
      expect(expensesSheet.headers).toContain('Date');

      // Verify data type inference
      expect(expensesSheet.columnSchema.Amount.type).toBe('numeric');
      expect(expensesSheet.columnSchema.Category.type).toBe('categorical');
      expect(expensesSheet.columnSchema.Date.type).toBe('date');

      // Verify duplicate & null detection
      expect(expensesSheet.duplicateCount).toBe(1);
      expect(expensesSheet.columnSchema.Amount.nullCount).toBe(1);
    });

    test('extracts clean structured records from CSV file', async () => {
      const parsed = await spreadsheetService.parseSpreadsheet({
        buffer: sampleCsvBuffer,
        filename: 'monthly_cashflow.csv',
        mimeType: 'text/csv',
      });

      expect(parsed.filename).toBe('monthly_cashflow.csv');
      expect(parsed.fileType).toBe('CSV');
      expect(parsed.sheetCount).toBe(1);
      expect(parsed.primarySheet.rowCount).toBe(6);
      expect(parsed.primarySheet.headers).toEqual(['Month', 'Income', 'Expenses', 'Net_Savings']);
      expect(parsed.primarySheet.columnSchema.Income.type).toBe('numeric');
      expect(parsed.primarySheet.columnSchema.Month.type).toBe('date');
      expect(parsed.summary.totalDuplicateRows).toBe(0);
      expect(parsed.summary.totalNullCells).toBe(0);
    });

    test('rejects files exceeding 25MB security limit', async () => {
      const hugeBuffer = Buffer.alloc(26 * 1024 * 1024);
      await expect(
        spreadsheetService.parseSpreadsheet({
          buffer: hugeBuffer,
          filename: 'oversized_database.xlsx',
        })
      ).rejects.toThrow(/25MB/);
    });

    test('rejects empty or zero-byte buffers gracefully', async () => {
      await expect(
        spreadsheetService.parseSpreadsheet({
          buffer: Buffer.alloc(0),
          filename: 'empty.xlsx',
        })
      ).rejects.toThrow(/empty or has zero bytes/);
    });
  });

  // =========================================================================
  // 2. NATURAL-LANGUAGE DETERMINISTIC CALCULATIONS
  // =========================================================================
  describe('SpreadsheetService — Deterministic Mathematical Computations', () => {
    test('calculates highest spending category and aggregates totals accurately', async () => {
      const parsed = await spreadsheetService.parseSpreadsheet({
        buffer: sampleExcelBuffer,
        filename: 'corporate_q1.xlsx',
      });

      const result = spreadsheetService.executeAnalysis(parsed, 'Find the highest spending category');

      expect(result.success).toBe(true);
      expect(result.detectedOperation).toBe('TOP_N');
      expect(result.calculation).toBeDefined();

      // Executive is 180,000, Marketing is 70,000 (45k + 25k), Engineering is 80,000 (38k + 42k)
      expect(result.calculation.highest.label).toBe('Executive');
      expect(result.calculation.highest.value).toBe(180000);

      const engItem = result.calculation.items.find((i) => i.label === 'Engineering');
      expect(engItem.value).toBe(80000);

      const mktItem = result.calculation.items.find((i) => i.label === 'Marketing');
      expect(mktItem.value).toBe(70000);
    });

    test('calculates total expenses across all valid records', async () => {
      const parsed = await spreadsheetService.parseSpreadsheet({
        buffer: sampleExcelBuffer,
        filename: 'corporate_q1.xlsx',
      });

      const result = spreadsheetService.executeAnalysis(parsed, 'Calculate total expenses');
      expect(result.success).toBe(true);
      expect(result.detectedOperation).toBe('TOTAL');

      // 45k + 38k + 22k + 25k + 42k + 18k + 15k + 9.5k + 9.5k + 180k = 404,000
      expect(result.calculation.totalSum).toBe(404000);
    });

    test('ranks top products by revenue from secondary worksheet', async () => {
      const parsed = await spreadsheetService.parseSpreadsheet({
        buffer: sampleExcelBuffer,
        filename: 'corporate_q1.xlsx',
      });

      const result = spreadsheetService.executeAnalysis(parsed, 'From Product_Sales find the top 5 products by revenue');
      expect(result.success).toBe(true);
      expect(result.sheetName).toBe('Product_Sales');
      expect(result.calculation.items.length).toBeLessThanOrEqual(5);
      expect(result.calculation.highest.label).toBe('Enterprise API License');
      expect(result.calculation.highest.value).toBe(135000);
    });

    test('identifies statistical outliers and unusual transactions', async () => {
      const parsed = await spreadsheetService.parseSpreadsheet({
        buffer: sampleExcelBuffer,
        filename: 'corporate_q1.xlsx',
      });

      const result = spreadsheetService.executeAnalysis(parsed, 'Identify unusual transactions and outliers in expenses');
      expect(result.success).toBe(true);
      expect(result.detectedOperation).toBe('OUTLIERS');
      expect(result.calculation.outlierCount).toBeGreaterThanOrEqual(1);

      const topOutlier = result.calculation.outliers[0];
      expect(topOutlier.entity).toBe('Executive');
      expect(topOutlier.metricValue).toBe(180000);
    });

    test('audits data completeness and detects missing values', async () => {
      const parsed = await spreadsheetService.parseSpreadsheet({
        buffer: sampleExcelBuffer,
        filename: 'corporate_q1.xlsx',
      });

      const result = spreadsheetService.executeAnalysis(parsed, 'Find missing values in this spreadsheet');
      expect(result.success).toBe(true);
      expect(result.detectedOperation).toBe('MISSING_VALUES');
      expect(result.calculation.totalMissingCells).toBe(1);
      expect(result.calculation.missingReport[0].column).toBe('Amount');
    });
  });

  // =========================================================================
  // 3. DYNAMIC CHART CONFIGURATION & INTELLIGENT SELECTION
  // =========================================================================
  describe('SpreadsheetService — Dynamic Chart Configuration Engine', () => {
    test('generates dynamic Bar Chart config when user requests bar chart', async () => {
      const parsed = await spreadsheetService.parseSpreadsheet({
        buffer: sampleExcelBuffer,
        filename: 'corporate_q1.xlsx',
      });

      const result = spreadsheetService.executeAnalysis(parsed, 'Create a bar chart showing expenses by category');
      expect(result.chartConfig).toBeDefined();
      expect(result.chartConfig.chartType).toBe('bar');
      expect(result.chartConfig.data.length).toBeGreaterThan(0);
      expect(result.chartConfig.xAxis.key).toBe('name');
      expect(result.chartConfig.series[0].key).toBe('value');
      expect(result.chartConfig.availableChartTypes).toContain('horizontal_bar');
      expect(result.chartConfig.availableChartTypes).toContain('pie');
    });

    test('generates Line Chart config for time series / monthly data', async () => {
      const parsed = await spreadsheetService.parseSpreadsheet({
        buffer: sampleCsvBuffer,
        filename: 'monthly_cashflow.csv',
      });

      const result = spreadsheetService.executeAnalysis(parsed, 'Show my monthly expenses as a line chart');
      expect(result.chartConfig).toBeDefined();
      expect(result.chartConfig.chartType).toBe('line');
      expect(result.chartConfig.data.length).toBe(6);
      expect(result.chartConfig.data[0].name).toBe('2026-01');
      expect(result.chartConfig.data[0].value).toBe(52000);
    });

    test('generates Pie / Doughnut Chart with percentages when share is requested', async () => {
      const parsed = await spreadsheetService.parseSpreadsheet({
        buffer: sampleExcelBuffer,
        filename: 'corporate_q1.xlsx',
      });

      const result = spreadsheetService.executeAnalysis(parsed, 'Show the percentage of expenses in each category as a pie chart');
      expect(result.chartConfig).toBeDefined();
      expect(['pie', 'doughnut']).toContain(result.chartConfig.chartType);
      expect(result.chartConfig.data[0].percentage).toBeGreaterThan(0);
    });

    test('selects suitable visualization automatically when user says "visualize this data"', async () => {
      const parsed = await spreadsheetService.parseSpreadsheet({
        buffer: sampleCsvBuffer,
        filename: 'monthly_cashflow.csv',
      });

      const result = spreadsheetService.executeAnalysis(parsed, 'visualize this data');
      expect(result.chartConfig).toBeDefined();
      // Since Monthly Cashflow has dates, it should automatically choose line
      expect(result.chartConfig.chartType).toBe('line');
    });

    test('exports aggregated chart points to CSV format', () => {
      const dataPoints = [
        { name: 'Marketing', value: 70000, percentage: 35.0 },
        { name: 'Engineering', value: 80000, percentage: 40.0 },
      ];
      const csv = spreadsheetService.exportToCSV(dataPoints, 'Department', 'Expense_USD');
      expect(csv).toContain('Department,Expense_USD,Percentage');
      expect(csv).toContain('"Marketing",70000,35%');
      expect(csv).toContain('"Engineering",80000,40%');
    });
  });

  // =========================================================================
  // 4. AGENT & INTENT INTEGRATION
  // =========================================================================
  describe('Universal Intent & DataAnalysis Agent Integration', () => {
    test('classifies Excel spreadsheet attachment as DATA_ANALYSIS and activates DataAnalysis agent', async () => {
      const intent = await universalIntentService.understandRequest(
        'Analyze this spreadsheet and create a bar chart of expenses by category',
        [
          {
            name: 'company_expenses.xlsx',
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            size: sampleExcelBuffer.length,
          },
        ]
      );

      expect(intent.primaryCategory).toBe('DATA_ANALYSIS');
      expect(intent.requiredAgents).toContain('DataAnalysis');
    });

    test('dataAnalysisAgent executes grounded analysis and returns structured chartConfig', async () => {
      const taskContext = {
        userRequest: 'Analyze this spreadsheet, find the highest spending category, and create a bar chart',
        attachments: [
          {
            name: 'expenses.xlsx',
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            buffer: sampleExcelBuffer,
          },
        ],
      };

      const result = await dataAnalysisAgent.analyzeData(taskContext);
      expect(result.status).toBe('completed');
      expect(result.analysis).toBeDefined();
      expect(result.chartConfig).toBeDefined();
      expect(result.chartConfig.data.length).toBeGreaterThan(0);
      expect(result.analysis.calculation.highest.label).toBe('Executive');
      expect(result.analysis.calculation.highest.value).toBe(180000);
    });

    test('buildUniversalResponse formats complete structured dossier with interactive chart directive', async () => {
      const taskContext = {
        userRequest: 'Find the highest spending category and generate a chart',
        attachments: [
          {
            name: 'expenses.xlsx',
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            buffer: sampleExcelBuffer,
          },
        ],
      };

      const agentResult = await dataAnalysisAgent.analyzeData(taskContext);

      const fakeTask = {
        taskId: 'task-test-sheet-123',
        userRequest: 'Find the highest spending category and generate a chart',
        category: 'DATA_ANALYSIS',
        status: 'COMPLETED',
        discoveredData: {
          dataAnalysis: agentResult.analysis,
        },
        chartConfig: agentResult.chartConfig,
      };

      const markdown = buildUniversalResponse(fakeTask);

      expect(markdown).toContain('Spreadsheet Intelligence & Data Analysis');
      expect(markdown).toContain('Dataset Architecture & Quality Audit');
      expect(markdown).toContain('Verified Computational Findings');
      expect(markdown).toContain('Interactive Visualization');
      expect(markdown).toContain('```json:doera-chart');
      expect(markdown).toContain('Executive');
      expect(markdown).toContain('180,000');
    });
  });
});
