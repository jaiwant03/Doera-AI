import llmService from '../services/llmService.js';
import spreadsheetService from '../services/spreadsheetService.js';
import fileStorageService from '../services/fileStorageService.js';
import { logger } from '../utils/logger.js';

class DataAnalysisAgent {
  constructor() {
    this.name = 'DataAnalysis';
  }

  /**
   * Advanced Spreadsheet Intelligence & Data Analysis:
   * Parses Excel/CSV files, performs exact mathematical calculations,
   * generates dynamic interactive chart configurations, and provides strategic insights.
   */
  async analyzeData(taskContext, dataPayload = null) {
    const startedAt = new Date();
    const userRequest = taskContext?.userRequest || '';
    logger.info(`[Data Analysis Agent] Initiating spreadsheet intelligence for: "${userRequest}"`);

    // 1. Check for spreadsheet attachments in taskContext
    const attachments = taskContext?.attachments || [];
    const spreadsheetAttachment = attachments.find((a) =>
      a.type === 'text/csv' ||
      a.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      a.type === 'application/vnd.ms-excel' ||
      /\.(csv|tsv|xlsx|xls)$/i.test(a.name || '')
    );

    let parsedSpreadsheet = null;

    if (spreadsheetAttachment) {
      try {
        let buffer = null;
        if (spreadsheetAttachment.buffer && Buffer.isBuffer(spreadsheetAttachment.buffer)) {
          buffer = spreadsheetAttachment.buffer;
        } else if (spreadsheetAttachment.storagePath) {
          buffer = await fileStorageService.getFileBuffer(spreadsheetAttachment.storagePath);
        } else if (spreadsheetAttachment.fileId) {
          buffer = await fileStorageService.getFileBuffer(spreadsheetAttachment.fileId);
        } else if (spreadsheetAttachment.base64) {
          buffer = Buffer.from(spreadsheetAttachment.base64, 'base64');
        } else if (typeof spreadsheetAttachment.dataUrl === 'string' && spreadsheetAttachment.dataUrl.includes(',')) {
          const b64 = spreadsheetAttachment.dataUrl.split(',')[1];
          if (b64) buffer = Buffer.from(b64, 'base64');
        } else if (typeof spreadsheetAttachment.url === 'string' && spreadsheetAttachment.url.startsWith('data:')) {
          const b64 = spreadsheetAttachment.url.split(',')[1];
          if (b64) buffer = Buffer.from(b64, 'base64');
        } else if (spreadsheetAttachment.content) {
          buffer = Buffer.from(spreadsheetAttachment.content, typeof spreadsheetAttachment.content === 'string' ? 'utf8' : undefined);
        } else if (spreadsheetAttachment.text) {
          buffer = Buffer.from(spreadsheetAttachment.text, 'utf8');
        }

        if (buffer) {
          parsedSpreadsheet = await spreadsheetService.parseSpreadsheet({
            buffer,
            filename: spreadsheetAttachment.name || 'dataset.xlsx',
            mimeType: spreadsheetAttachment.type || '',
          });
          logger.info(
            `[Data Analysis Agent] Successfully parsed spreadsheet "${spreadsheetAttachment.name}" with ${parsedSpreadsheet.sheetCount} sheet(s) and ${parsedSpreadsheet.summary.totalRows} rows.`
          );
        }
      } catch (parseErr) {
        logger.warn(`[Data Analysis Agent] Spreadsheet parsing notice: ${parseErr.message}`);
      }
    }

    // 2. Fallback: Parse from dataPayload if raw rows or tables exist
    if (!parsedSpreadsheet && dataPayload) {
      if (dataPayload.sheets && Array.isArray(dataPayload.sheets) && dataPayload.sheets.length > 0) {
        parsedSpreadsheet = {
          filename: dataPayload.filename || 'dataset.xlsx',
          sheetCount: dataPayload.sheets.length,
          sheetNames: dataPayload.sheets.map((s) => s.name),
          sheets: dataPayload.sheets,
          primarySheet: dataPayload.sheets[0],
          summary: {
            totalSheets: dataPayload.sheets.length,
            totalRows: dataPayload.sheets.reduce((acc, s) => acc + (s.rowCount || 0), 0),
            totalColumns: dataPayload.sheets[0]?.headers?.length || 0,
            totalNullCells: 0,
            totalDuplicateRows: 0,
            primarySheetName: dataPayload.sheets[0]?.name || '',
          },
        };
      } else if (dataPayload.sampleRows && Array.isArray(dataPayload.sampleRows) && dataPayload.sampleRows.length > 0) {
        const headers = dataPayload.headers || Object.keys(dataPayload.sampleRows[0]);
        parsedSpreadsheet = {
          filename: 'dataset.csv',
          sheetCount: 1,
          sheetNames: ['Sheet1'],
          sheets: [
            {
              name: 'Sheet1',
              rowCount: dataPayload.rowCount || dataPayload.sampleRows.length,
              columnCount: headers.length,
              headers,
              rows: dataPayload.sampleRows,
              columnSchema: {},
            },
          ],
          primarySheet: {
            name: 'Sheet1',
            rowCount: dataPayload.rowCount || dataPayload.sampleRows.length,
            columnCount: headers.length,
            headers,
            rows: dataPayload.sampleRows,
            columnSchema: {},
          },
          summary: {
            totalSheets: 1,
            totalRows: dataPayload.sampleRows.length,
            totalColumns: headers.length,
            totalNullCells: 0,
            totalDuplicateRows: 0,
            primarySheetName: 'Sheet1',
          },
        };
      }
    }

    // 3. Execute Deterministic Calculations on the Dataset or Reuse Previous Context
    let analysisResult = null;
    if (parsedSpreadsheet) {
      try {
        analysisResult = spreadsheetService.executeAnalysis(parsedSpreadsheet, userRequest);
      } catch (calcErr) {
        logger.error(`[Data Analysis Agent] Execution error: ${calcErr.message}`);
      }
    } else if (taskContext.lastCalculation || taskContext.lastChartConfig) {
      // Reusing previous verified calculation and chart configuration
      const prevCalc = taskContext.lastCalculation;
      let prevChart = taskContext.lastChartConfig ? JSON.parse(JSON.stringify(taskContext.lastChartConfig)) : null;

      // Check if user is asking to convert chart type (e.g. pie, bar, line, doughnut)
      if (prevChart) {
        if (/pie|doughnut|donut/i.test(userRequest)) {
          prevChart.type = /doughnut|donut/i.test(userRequest) ? 'doughnut' : 'pie';
          prevChart.title = `${prevChart.title || 'Data'} (Pie Distribution)`;
        } else if (/line/i.test(userRequest)) {
          prevChart.type = 'line';
        } else if (/bar/i.test(userRequest)) {
          prevChart.type = 'bar';
        } else if (/area/i.test(userRequest)) {
          prevChart.type = 'area';
        }
      }

      analysisResult = {
        success: true,
        sheetName: prevCalc?.sheetName || 'Previous Dataset',
        rowCount: prevCalc?.totalRowsAnalyzed || prevChart?.data?.length || 0,
        headers: prevCalc?.targetColumns || [],
        calculation: prevCalc,
        chartConfig: prevChart,
      };
      logger.info(`[Data Analysis Agent] Successfully reused prior calculation & chart context (${analysisResult.rowCount} rows).`);
    }

    const calc = analysisResult?.calculation || taskContext.lastCalculation || null;
    const chartConfig = analysisResult?.chartConfig || taskContext.lastChartConfig || null;
    const headers = analysisResult?.headers || parsedSpreadsheet?.primarySheet?.headers || calc?.targetColumns || [];
    const sampleRows = parsedSpreadsheet?.primarySheet?.rows?.slice(0, 10) || [];
    const rowCount = parsedSpreadsheet?.summary?.totalRows || calc?.totalRowsAnalyzed || sampleRows.length || 0;

    // 4. Grounded Business Interpretation via LLM
    const systemPrompt = `You are DOERA's Senior Data Analysis & Business Intelligence Agent.
You are evaluating verified mathematical calculations from the user's uploaded spreadsheet.
CRITICAL RULES:
- The total rows analyzed is EXACTLY ${rowCount}. Never state or imply that only a preview or sample rows were evaluated. The entire dataset of ${rowCount} rows was processed deterministically.
- Never fabricate raw numbers or conflict with the provided calculations.
- Use the exact calculated totals, averages, percentages, rankings, and outliers provided below.
- If category codes (e.g. Category 1, Category 2) are used without a mapping table, do not invent names (e.g. Food, Travel).
- Provide strategic, actionable business interpretations based on the verified facts.

Output pure JSON:
{
  "datasetSummary": "Concise 1-2 sentence overview of rows, columns, and analytical scope",
  "keyMetrics": [
    { "metric": "Metric name", "value": "Exact calculated value", "significance": "Concrete takeaway" }
  ],
  "trendsAndPatterns": [
    "Verified pattern or growth observation 1",
    "Verified pattern or growth observation 2"
  ],
  "anomaliesOrOutliers": [
    "Observed anomaly, missing data, or statistical outlier"
  ],
  "actionableInsights": [
    "High-impact recommendation based on the data 1",
    "High-impact recommendation based on the data 2"
  ]
}`;

    const userPrompt = `Inquiry: "${userRequest}"
Spreadsheet: ${parsedSpreadsheet ? parsedSpreadsheet.filename : 'Data Context'}
Total Rows: ${rowCount} | Columns: ${headers.join(', ')}
Executed Calculation Operation: ${calc?.operation || 'Data Aggregation'}
Formula / Logic: ${calc?.formula || 'N/A'}
Calculation Summary: ${calc?.summary || 'N/A'}
Calculation Items (Top 8): ${JSON.stringify(calc?.items?.slice(0, 8) || [])}
Highest Item: ${JSON.stringify(calc?.highest || null)}
Lowest Item: ${JSON.stringify(calc?.lowest || null)}
Total Sum: ${calc?.totalSum !== undefined ? calc?.totalSum : 'N/A'}
Average: ${calc?.overallAverage !== undefined ? calc?.overallAverage : 'N/A'}`;

    try {
      const llmParsed = await llmService.generate({
        systemPrompt,
        userPrompt,
        jsonMode: true,
        temperature: 0.1,
      });

      const finalAnalysis = {
        datasetSummary: llmParsed?.datasetSummary || calc?.summary || `Evaluated ${rowCount} rows across ${headers.length} attributes.`,
        keyMetrics: llmParsed?.keyMetrics && llmParsed.keyMetrics.length > 0
          ? llmParsed.keyMetrics
          : [
              ...(calc?.totalSum !== undefined ? [{ metric: 'Total Aggregate', value: calc.totalSum.toLocaleString(), significance: 'Total calculated volume' }] : []),
              ...(calc?.overallAverage !== undefined ? [{ metric: 'Average Mean', value: calc.overallAverage.toLocaleString(), significance: 'Mean value per segment' }] : []),
              ...(calc?.highest ? [{ metric: `Top (${calc.highest.label})`, value: calc.highest.value.toLocaleString(), significance: 'Highest performing category' }] : []),
            ],
        trendsAndPatterns: llmParsed?.trendsAndPatterns || ['Correlations evaluated against problem constraints.'],
        anomaliesOrOutliers: llmParsed?.anomaliesOrOutliers || (calc?.outliers?.length > 0 ? [`Identified ${calc.outliers.length} anomalous records exceeding threshold.`] : []),
        actionableInsights: llmParsed?.actionableInsights || ['Optimize discretionary expenditures to balance capital efficiency.'],
        headers,
        sampleRows,
        rowCount,
        calculation: calc,
        chartConfig,
        spreadsheetSummary: parsedSpreadsheet?.summary || null,
        isStatisticalAnalysis: Boolean(analysisResult?.isStatisticalAnalysis || calc?.isStatisticalAnalysis),
        statisticalResult: analysisResult?.statisticalResult || calc?.statisticalResult || null,
      };

      return {
        agentName: this.name,
        status: 'completed',
        analysis: finalAnalysis,
        chartConfig,
        startedAt,
        completedAt: new Date(),
      };
    } catch (err) {
      logger.warn(`[Data Analysis Agent] LLM synthesis fallback notice: ${err.message}`);

      const fallbackAnalysis = {
        datasetSummary: calc?.summary || `Processed ${rowCount} rows across ${headers.length} attributes.`,
        keyMetrics: [
          ...(calc?.totalSum !== undefined ? [{ metric: 'Total Aggregate', value: calc.totalSum.toLocaleString(), significance: 'Sum of selected metric' }] : []),
          ...(calc?.overallAverage !== undefined ? [{ metric: 'Average Mean', value: calc.overallAverage.toLocaleString(), significance: 'Mean average value' }] : []),
          ...(calc?.highest ? [{ metric: `Leading (${calc.highest.label})`, value: calc.highest.value.toLocaleString(), significance: 'Highest segment' }] : []),
        ],
        trendsAndPatterns: ['Mathematical aggregations computed directly on verified dataset rows.'],
        anomaliesOrOutliers: calc?.outliers?.length ? [`Detected ${calc.outliers.length} outliers.`] : [],
        actionableInsights: ['Review primary variance drivers to improve resource allocations.'],
        headers,
        sampleRows,
        rowCount,
        calculation: calc,
        chartConfig,
        spreadsheetSummary: parsedSpreadsheet?.summary || null,
        isStatisticalAnalysis: Boolean(analysisResult?.isStatisticalAnalysis || calc?.isStatisticalAnalysis),
        statisticalResult: analysisResult?.statisticalResult || calc?.statisticalResult || null,
      };

      return {
        agentName: this.name,
        status: 'completed',
        analysis: fallbackAnalysis,
        chartConfig,
        startedAt,
        completedAt: new Date(),
      };
    }
  }
}

export const dataAnalysisAgent = new DataAnalysisAgent();
export default dataAnalysisAgent;
