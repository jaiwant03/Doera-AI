import * as XLSX from 'xlsx';
import { logger } from '../utils/logger.js';

class SpreadsheetService {
  constructor() {
    this.MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25MB
    this.PALETTE = [
      '#FF55BD', // Neon Pink / Magenta
      '#9C52E8', // Royal Purple
      '#06B6D4', // Cyan
      '#10B981', // Emerald
      '#F59E0B', // Amber
      '#EC4899', // Pink
      '#8B5CF6', // Violet
      '#3B82F6', // Blue
      '#14B8A6', // Teal
      '#F97316', // Orange
    ];
  }

  /**
   * 1. Validate and Parse Spreadsheet (.xlsx, .xls, .csv, .tsv)
   */
  async parseSpreadsheet(input) {
    const { buffer, filename = 'dataset.csv', mimeType = '' } = input;

    if (!buffer || buffer.length === 0) {
      throw new Error(`Spreadsheet "${filename}" is empty or has zero bytes.`);
    }

    let rawBuffer = buffer;

    // Handle string inputs (data URL or raw base64 or CSV text)
    if (typeof rawBuffer === 'string') {
      let clean = rawBuffer.trim();
      if (clean.startsWith('data:')) {
        const commaIdx = clean.indexOf(',');
        if (commaIdx !== -1) {
          clean = clean.substring(commaIdx + 1).trim();
        }
      }
      const extCheck = (filename.split('.').pop() || '').toLowerCase();
      const isBase64Binary = /^UEsDB/i.test(clean.slice(0, 30)) || extCheck === 'xlsx' || extCheck === 'xls';
      if (isBase64Binary) {
        rawBuffer = Buffer.from(clean, 'base64');
      } else {
        rawBuffer = Buffer.from(clean, 'utf8');
      }
    } else if (Buffer.isBuffer(rawBuffer)) {
      // Check if buffer contains ASCII base64 string (starts with "UEsDB" or "data:")
      const preview = rawBuffer.slice(0, 30).toString('utf8');
      if (preview.startsWith('UEsDB') || preview.startsWith('data:')) {
        let cleanStr = rawBuffer.toString('utf8').trim();
        if (cleanStr.startsWith('data:')) {
          const commaIdx = cleanStr.indexOf(',');
          if (commaIdx !== -1) cleanStr = cleanStr.substring(commaIdx + 1).trim();
        }
        rawBuffer = Buffer.from(cleanStr, 'base64');
      }
    }

    if (rawBuffer.length > this.MAX_FILE_SIZE_BYTES) {
      throw new Error(
        `Spreadsheet "${filename}" size (${(rawBuffer.length / 1024 / 1024).toFixed(1)}MB) exceeds allowable limit of 25MB.`
      );
    }

    const ext = (filename.split('.').pop() || '').toLowerCase();
    const isCsv = ext === 'csv' || ext === 'tsv' || mimeType === 'text/csv' || mimeType === 'text/tab-separated-values';

    let workbook;
    try {
      if (isCsv) {
        // Read CSV/TSV with raw preservation of exact strings
        workbook = XLSX.read(rawBuffer, {
          type: 'buffer',
          raw: true,
          codepage: 65001, // UTF-8
        });
      } else {
        // Read Excel (.xlsx, .xls)
        workbook = XLSX.read(rawBuffer, {
          type: 'buffer',
          cellDates: true,
          raw: false,
        });
      }
    } catch (parseErr) {
      logger.error(`[SpreadsheetService] XLSX read failure for ${filename}:`, parseErr.message);
      throw new Error(`Could not parse spreadsheet file "${filename}": ${parseErr.message}`);
    }

    const sheetNames = workbook.SheetNames || [];
    if (sheetNames.length === 0) {
      throw new Error(`Spreadsheet "${filename}" contains no readable worksheets.`);
    }

    const sheets = [];
    let totalNullCells = 0;
    let totalDuplicateRows = 0;

    for (const name of sheetNames) {
      const worksheet = workbook.Sheets[name];
      if (!worksheet) continue;

      // Extract raw JSON rows
      const rawRows = XLSX.utils.sheet_to_json(worksheet, {
        defval: null,
        blankrows: false,
      });

      // Extract headers from worksheet range or first row
      let headers = [];
      if (rawRows.length > 0) {
        headers = Object.keys(rawRows[0]).map((h) => String(h).trim()).filter(Boolean);
      } else {
        // Try reading range directly
        const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:A1');
        for (let C = range.s.c; C <= range.e.c; ++C) {
          const cell = worksheet[XLSX.utils.encode_cell({ r: range.s.r, c: C })];
          if (cell && cell.v !== undefined) {
            headers.push(String(cell.v).trim());
          }
        }
      }

      // Clean rows and preserve original records
      const cleanRows = rawRows.map((row) => {
        const obj = {};
        headers.forEach((h) => {
          let val = row[h];
          if (val instanceof Date && !isNaN(val.getTime())) {
            val = val.toISOString().split('T')[0];
          } else if (typeof val === 'string') {
            val = val.trim();
          }
          obj[h] = val;
        });
        return obj;
      });

      // Duplicate detection
      const rowSignatures = new Set();
      let sheetDuplicates = 0;
      cleanRows.forEach((r) => {
        const sig = JSON.stringify(r);
        if (rowSignatures.has(sig)) {
          sheetDuplicates++;
        } else {
          rowSignatures.add(sig);
        }
      });
      totalDuplicateRows += sheetDuplicates;

      // Column Schema Inference (with fast sample optimization for large datasets)
      const sampleForInference = cleanRows.length > 1000 ? cleanRows.slice(0, 1000) : cleanRows;
      const columnSchema = {};
      let sheetNulls = 0;

      headers.forEach((h) => {
        const sampleValues = sampleForInference.map((r) => r[h]);
        const sampleNonNulls = sampleValues.filter((v) => v !== null && v !== undefined && v !== '');
        
        let nullCount = 0;
        if (cleanRows.length > 2000) {
          const sampleNulls = sampleValues.length - sampleNonNulls.length;
          nullCount = Math.round((sampleNulls / sampleValues.length) * cleanRows.length);
        } else {
          nullCount = cleanRows.filter((r) => r[h] === null || r[h] === undefined || r[h] === '').length;
        }
        sheetNulls += nullCount;

        const inferred = this.inferColumnType(sampleNonNulls, h);

        columnSchema[h] = {
          name: h,
          type: inferred.type,
          nullCount,
          totalCount: cleanRows.length,
          uniqueCount: new Set(sampleNonNulls).size,
          stats: inferred.stats || null,
          topCategories: inferred.topCategories || null,
          dateRange: inferred.dateRange || null,
        };
      });

      totalNullCells += sheetNulls;

      sheets.push({
        name,
        rowCount: cleanRows.length,
        columnCount: headers.length,
        headers,
        rows: cleanRows,
        columnSchema,
        nullCount: sheetNulls,
        duplicateCount: sheetDuplicates,
      });
    }

    const primarySheet = sheets[0] || null;

    return {
      filename,
      fileType: ext.toUpperCase(),
      sheetCount: sheets.length,
      sheetNames,
      sheets,
      primarySheet,
      summary: {
        totalSheets: sheets.length,
        totalRows: sheets.reduce((acc, s) => acc + s.rowCount, 0),
        totalColumns: primarySheet ? primarySheet.columnCount : 0,
        totalNullCells,
        totalDuplicateRows,
        primarySheetName: primarySheet ? primarySheet.name : '',
      },
    };
  }

  /**
   * Helper: Parse flexible numeric strings ($1,234.50, 45%, (500))
   */
  parseNumeric(val) {
    if (typeof val === 'number') return isNaN(val) ? null : val;
    if (val === null || val === undefined || val === '') return null;
    if (typeof val === 'boolean') return null;

    const str = String(val).trim();
    // Check for financial negative parenthesized: (1200) -> -1200
    const isParenNegative = /^\((.*)\)$/.test(str);
    const cleanStr = str.replace(/[$,€£₹% ]/g, '').replace(/^\((.*)\)$/, '$1');
    const num = Number(cleanStr);
    if (!isNaN(num) && cleanStr !== '') {
      return isParenNegative ? -num : num;
    }
    return null;
  }

  /**
   * Helper: Detect and parse dates
   */
  parseDate(val) {
    if (val instanceof Date) return isNaN(val.getTime()) ? null : val;
    if (typeof val === 'number') {
      // Excel serial date number
      if (val > 25569 && val < 60000) {
        return new Date((val - 25569) * 86400 * 1000);
      }
      return null;
    }
    if (typeof val !== 'string' || !val.trim()) return null;

    const s = val.trim();
    // Common date patterns: YYYY-MM, YYYY-MM-DD, DD/MM/YYYY, MM/DD/YYYY, YYYY/MM/DD, Month YYYY, etc.
    const isDatePattern = /^\d{4}[-/.]\d{1,2}([-/.]\d{1,2})?$/.test(s) ||
      /^\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4}$/.test(s) ||
      /^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{4}/i.test(s) ||
      /^\d{4}\s+(q[1-4]|h[1-2])/i.test(s) ||
      /^(q[1-4])\s+\d{4}/i.test(s);

    if (isDatePattern) {
      const d = new Date(s);
      if (!isNaN(d.getTime())) return d;
    }
    return null;
  }

  /**
   * Helper: Detect currency symbol from sample values ($ by default, ₹, €, £)
   */
  detectCurrency(values) {
    if (!Array.isArray(values) || values.length === 0) return '$';
    for (const v of values) {
      if (typeof v === 'string') {
        if (v.includes('₹') || /inr/i.test(v)) return '₹';
        if (v.includes('€') || /eur/i.test(v)) return '€';
        if (v.includes('£') || /gbp/i.test(v)) return '£';
        if (v.includes('$') || /usd/i.test(v)) return '$';
      }
    }
    return '$';
  }

  /**
   * Look for a category code -> name mapping table across sheets or in current sheet
   */
  resolveCategoryMapping(parsedSpreadsheet, targetSheet, dimensionCol) {
    if (!parsedSpreadsheet || !parsedSpreadsheet.sheets || parsedSpreadsheet.sheets.length === 0) {
      return { mapping: {}, hasMapping: false, mappingSheetName: null };
    }

    const mapping = {};
    let hasMapping = false;
    let mappingSheetName = null;

    // 1. Check other sheets in the workbook (e.g. "Mapping", "Categories", "Codes", "Legend", etc.)
    for (const sheet of parsedSpreadsheet.sheets) {
      if (sheet === targetSheet && parsedSpreadsheet.sheets.length > 1) {
        continue;
      }

      const headers = sheet.headers || [];
      const codeCol = headers.find((h) =>
        /(^code$|category.*code|^id$|cat.*id|^category_id$|^code_id$|^key$)/i.test(h.trim())
      );
      const nameCol = headers.find((h) =>
        /(^name$|category.*name|^description$|^label$|^title$|^meaning$|^category$)/i.test(h.trim()) && h !== codeCol
      );

      if (codeCol && nameCol) {
        for (const row of sheet.rows) {
          const rawCode = row[codeCol];
          const rawName = row[nameCol];
          if (rawCode !== null && rawCode !== undefined && String(rawCode).trim() !== '' && rawName) {
            mapping[String(rawCode).trim()] = String(rawName).trim();
            hasMapping = true;
          }
        }
        if (hasMapping) {
          mappingSheetName = sheet.name;
          break;
        }
      }
    }

    // 2. If not found in other sheets and targetSheet has code + name columns:
    if (!hasMapping && targetSheet) {
      const headers = targetSheet.headers || [];
      const codeCol = headers.find((h) =>
        /(^code$|category.*code|^id$|cat.*id|^category_id$)/i.test(h.trim())
      );
      const nameCol = headers.find((h) =>
        /(^name$|category.*name|^description$|^label$)/i.test(h.trim()) && h !== codeCol
      );
      if (codeCol && nameCol) {
        for (const row of targetSheet.rows) {
          const rawCode = row[codeCol];
          const rawName = row[nameCol];
          if (rawCode !== null && rawCode !== undefined && String(rawCode).trim() !== '' && rawName) {
            mapping[String(rawCode).trim()] = String(rawName).trim();
            hasMapping = true;
          }
        }
        if (hasMapping) {
          mappingSheetName = targetSheet.name;
        }
      }
    }

    return { mapping, hasMapping, mappingSheetName };
  }

  /**
   * Infer column data type and compute basic distribution stats
   */
  inferColumnType(values, colName = '') {
    if (values.length === 0) {
      return { type: 'text' };
    }

    const colLower = colName.toLowerCase();
    let numCount = 0;
    let dateCount = 0;
    let boolCount = 0;

    const parsedNumbers = [];
    const parsedDates = [];

    values.forEach((v) => {
      if (typeof v === 'boolean' || v === 'true' || v === 'false' || v === 'yes' || v === 'no') {
        boolCount++;
      }
      const num = this.parseNumeric(v);
      if (num !== null) {
        numCount++;
        parsedNumbers.push(num);
      }
      const dt = this.parseDate(v);
      if (dt !== null) {
        dateCount++;
        parsedDates.push(dt);
      }
    });

    const sampleRatio = values.length;

    // 1. Date Detection
    if (dateCount / sampleRatio >= 0.75 || (/(date|timestamp|period|month|year|day|quarter)/i.test(colLower) && dateCount > 0)) {
      const timestamps = parsedDates.map((d) => d.getTime()).sort((a, b) => a - b);
      return {
        type: 'date',
        dateRange: {
          min: new Date(timestamps[0]).toISOString().split('T')[0],
          max: new Date(timestamps[timestamps.length - 1]).toISOString().split('T')[0],
          sampleCount: parsedDates.length,
        },
      };
    }

    // 2. Numeric Detection
    if (numCount / sampleRatio >= 0.75 && !/(id|ssn|phone|zip|postal|code)/i.test(colLower)) {
      parsedNumbers.sort((a, b) => a - b);
      const sum = parsedNumbers.reduce((a, b) => a + b, 0);
      const avg = sum / parsedNumbers.length;
      const min = parsedNumbers[0];
      const max = parsedNumbers[parsedNumbers.length - 1];
      const mid = Math.floor(parsedNumbers.length / 2);
      const median = parsedNumbers.length % 2 !== 0 ? parsedNumbers[mid] : (parsedNumbers[mid - 1] + parsedNumbers[mid]) / 2;

      // Compute standard deviation
      const variance = parsedNumbers.reduce((acc, val) => acc + Math.pow(val - avg, 2), 0) / parsedNumbers.length;
      const stdev = Math.sqrt(variance);

      return {
        type: 'numeric',
        stats: {
          sum: Number(sum.toFixed(2)),
          avg: Number(avg.toFixed(2)),
          min: Number(min.toFixed(2)),
          max: Number(max.toFixed(2)),
          median: Number(median.toFixed(2)),
          stdev: Number(stdev.toFixed(2)),
          count: parsedNumbers.length,
        },
      };
    }

    // 3. Boolean Detection
    if (boolCount / sampleRatio >= 0.8) {
      return { type: 'boolean' };
    }

    // 4. Categorical vs Free Text
    const uniqueValues = Array.from(new Set(values));
    const cardinalityRatio = uniqueValues.length / sampleRatio;

    // Identifiers and raw URLs should remain text if values are largely unique
    const isIdentifierOrUrl = /(url|link|href|^id$|_id$|uuid|guid|hash|token|email|address)/i.test(colLower);
    if (isIdentifierOrUrl && (cardinalityRatio > 0.7 || uniqueValues.length > 20) && sampleRatio > 2) {
      return { type: 'text' };
    }

    if (uniqueValues.length <= 35 || cardinalityRatio <= 0.4 || /(category|department|status|region|city|type|group|tier|gender|role|brand|product|label|class)/i.test(colLower)) {
      const freqMap = {};
      values.forEach((v) => {
        const k = String(v).trim();
        freqMap[k] = (freqMap[k] || 0) + 1;
      });

      const topCategories = Object.entries(freqMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([label, count]) => ({
          label,
          count,
          percentage: Number(((count / values.length) * 100).toFixed(1)),
        }));

      return {
        type: 'categorical',
        topCategories,
      };
    }

    return { type: 'text' };
  }

  /**
   * 2. Natural-Language Question Answering & Deterministic Calculations
   */
  executeAnalysis(parsedSpreadsheet, userQuery = '') {
    const query = (userQuery || '').trim();
    const queryLower = query.toLowerCase();

    // Select target sheet
    let targetSheet = parsedSpreadsheet.primarySheet;
    for (const sheet of parsedSpreadsheet.sheets) {
      if (queryLower.includes(sheet.name.toLowerCase())) {
        targetSheet = sheet;
        break;
      }
    }

    if (!targetSheet || targetSheet.rows.length === 0) {
      return {
        success: false,
        error: 'The spreadsheet contains no readable rows for analytical computation.',
        calculation: null,
        chartConfig: null,
      };
    }

    const { headers, rows, columnSchema } = targetSheet;

    // Detect numeric, categorical, and date columns
    const numericCols = headers.filter((h) => columnSchema[h]?.type === 'numeric');
    const categoricalCols = headers.filter((h) => columnSchema[h]?.type === 'categorical');
    const dateCols = headers.filter((h) => columnSchema[h]?.type === 'date');

    // Identify primary metric column
    const metricCol = this.findBestColumnMatch(queryLower, numericCols, [
      'amount', 'expense', 'expenses', 'spending', 'cost', 'sales', 'revenue', 'profit', 'price',
      'salary', 'score', 'units', 'quantity', 'total', 'val', 'growth', 'budget', 'balance',
    ]) || numericCols[0] || null;

    // Dimension candidates: avoid picking metricCol when other candidates exist
    const nonMetricHeaders = headers.filter((h) => h !== metricCol);
    const candidateDimensionCols = categoricalCols.filter((c) => c !== metricCol)
      .concat(dateCols.filter((c) => c !== metricCol))
      .concat(nonMetricHeaders)
      .filter((c, idx, arr) => arr.indexOf(c) === idx);

    // Filter out obvious unique IDs/URLs if alternatives exist
    const filteredCandidates = candidateDimensionCols.filter((col) => {
      const isIdentifier = /(url|link|href|uuid|^id$|_id$|guid|transaction.*id|trans_id|invoice_id|record_id|reference|order_id)/i.test(col.toLowerCase());
      const isUniqueAll = columnSchema[col]?.uniqueCount === columnSchema[col]?.totalCount;
      return !(isIdentifier && (isUniqueAll || columnSchema[col]?.uniqueCount > 50) && candidateDimensionCols.length > 1);
    });

    const finalCandidates = filteredCandidates.length > 0 ? filteredCandidates : candidateDimensionCols;

    const dimensionCol = this.findBestColumnMatch(queryLower, finalCandidates, [
      'category', 'product', 'item', 'department', 'label', 'status', 'type', 'name',
      'class', 'region', 'city', 'month', 'date', 'year', 'quarter', 'vendor', 'service',
      'group', 'channel', 'source', 'country', 'target', 'result'
    ]) || finalCandidates[0] || (dateCols.length > 0 ? dateCols[0] : headers[0]);

    // Secondary metric for two-column comparisons / scatter
    const secondaryMetricCol = numericCols.find((c) => c !== metricCol && queryLower.includes(c.toLowerCase())) || null;

    // Identify Query Operation
    let operation = 'GENERAL_SUMMARY';
    if (/(highest|top\s*(five|\d+)?|best|maximum|most|leading|rank)/i.test(queryLower)) {
      operation = 'TOP_N';
    } else if (/(lowest|bottom\s*(five|\d+)?|worst|minimum|least|trailing)/i.test(queryLower)) {
      operation = 'BOTTOM_N';
    } else if (/(total|sum|overall\s*spending|all\s*expenses|total\s*expenses|number\s*of\s*transactions)/i.test(queryLower)) {
      operation = 'TOTAL';
    } else if (/(average|mean|monthly\s*sales|typical)/i.test(queryLower)) {
      operation = 'AVERAGE';
    } else if (/(compare|versus|vs|difference|margin)/i.test(queryLower)) {
      operation = 'COMPARE';
    } else if (/(percentage|proportion|share|ratio|breakdown|pie|donut|doughnut)/i.test(queryLower)) {
      operation = 'PERCENTAGE';
    } else if (/(unusual|anomaly|anomalies|outlier|irregular|suspicious|spike)/i.test(queryLower)) {
      operation = 'OUTLIERS';
    } else if (/(missing|null|empty|incomplete|blank)/i.test(queryLower)) {
      operation = 'MISSING_VALUES';
    } else if (/(trend|growth|over\s*time|monthly|quarterly|yearly|progress|trajectory)/i.test(queryLower)) {
      operation = 'TREND';
    }

    // Extract Top N count if specified (e.g. "top 5", "top three")
    let topN = 5;
    const topMatch = queryLower.match(/top\s*(\d+|one|two|three|four|five|six|seven|eight|nine|ten)/i);
    if (topMatch) {
      const wordMap = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10 };
      topN = isNaN(Number(topMatch[1])) ? wordMap[topMatch[1].toLowerCase()] || 5 : parseInt(topMatch[1], 10);
    }

    // Perform Deterministic Calculations
    const calcResult = this.performDeterministicCalculation({
      operation,
      rows,
      headers,
      metricCol,
      secondaryMetricCol,
      dimensionCol,
      dateCols,
      topN,
      queryLower,
      columnSchema,
      sheetName: targetSheet.name,
      parsedSpreadsheet,
      targetSheet,
    });

    // Intelligent Chart Generation
    const chartConfig = this.buildDynamicChartConfig({
      userQuery: query,
      calcResult,
      rows,
      metricCol,
      secondaryMetricCol,
      dimensionCol,
      columnSchema,
      targetSheet,
    });

    return {
      success: true,
      sheetName: targetSheet.name,
      rowCount: targetSheet.rowCount,
      columnCount: targetSheet.columnCount,
      headers,
      columnSchema,
      detectedOperation: operation,
      metricColumn: metricCol,
      dimensionColumn: dimensionCol,
      calculation: calcResult,
      chartConfig,
    };
  }

  /**
   * Helper: Column string matching
   */
  findBestColumnMatch(queryLower, candidateColumns, keywordPreferences = []) {
    if (!candidateColumns || candidateColumns.length === 0) return null;

    // 1. Direct match in query (full column name)
    for (const col of candidateColumns) {
      if (queryLower.includes(col.toLowerCase())) {
        return col;
      }
    }

    // 2. Tokenized partial match (e.g. "category" matches "Category_Code", "cost" matches "Total_Cost")
    for (const col of candidateColumns) {
      const parts = col.toLowerCase().split(/[^a-z0-9]+/);
      for (const part of parts) {
        if (part.length >= 3 && queryLower.includes(part)) {
          return col;
        }
      }
    }

    // 3. Preference keywords match
    for (const pref of keywordPreferences) {
      const found = candidateColumns.find((c) => {
        const lower = c.toLowerCase();
        return lower === pref || lower.includes(pref) || pref.includes(lower);
      });
      if (found) return found;
    }

    return candidateColumns[0];
  }

  /**
   * Deterministic mathematical calculations on real dataset rows
   */
  performDeterministicCalculation({
    operation,
    rows,
    headers,
    metricCol,
    secondaryMetricCol,
    dimensionCol,
    dateCols,
    topN,
    queryLower,
    columnSchema,
    sheetName,
    parsedSpreadsheet,
    targetSheet,
  }) {
    // Detect currency from available metrics
    const sampleMetricVals = metricCol ? rows.slice(0, 100).map((r) => r[metricCol]).filter(Boolean) : [];
    const currency = this.detectCurrency(sampleMetricVals);

    // 1. OUTLIERS / ANOMALIES
    if (operation === 'OUTLIERS' && metricCol) {
      const validRows = rows
        .map((r, idx) => ({ ...r, _origIdx: idx + 1, _val: this.parseNumeric(r[metricCol]) }))
        .filter((r) => r._val !== null);

      const vals = validRows.map((r) => r._val).sort((a, b) => a - b);
      const sum = vals.reduce((a, b) => a + b, 0);
      const mean = sum / vals.length;
      const variance = vals.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / vals.length;
      const stdev = Math.sqrt(variance);

      const outliers = validRows.filter((r) => Math.abs(r._val - mean) > 1.8 * stdev);

      return {
        operation: 'Outlier & Anomaly Detection',
        targetColumns: [metricCol, dimensionCol],
        formula: `|Value - Mean| > 1.8 * Standard Deviation (Mean: ${mean.toFixed(2)}, StDev: ${stdev.toFixed(2)})`,
        outlierCount: outliers.length,
        totalRowsAnalyzed: rows.length,
        totalTransactions: rows.length,
        currency,
        outliers: outliers.slice(0, 10).map((o) => ({
          row: o._origIdx,
          entity: o[dimensionCol] || `Row #${o._origIdx}`,
          metricValue: o._val,
          zScore: Number(((o._val - mean) / (stdev || 1)).toFixed(2)),
        })),
        summary: `Detected ${outliers.length} anomalous transactions exceeding the statistical threshold in column "${metricCol}". Analyzed ${rows.length} rows.`,
        items: outliers.map((o) => ({
          label: String(o[dimensionCol] || `Row #${o._origIdx}`),
          value: o._val,
        })),
      };
    }

    // 2. MISSING VALUES
    if (operation === 'MISSING_VALUES') {
      const missingReport = [];
      headers.forEach((h) => {
        const nulls = rows.filter((r) => r[h] === null || r[h] === undefined || r[h] === '').length;
        if (nulls > 0) {
          missingReport.push({
            column: h,
            missingCount: nulls,
            missingPercentage: Number(((nulls / rows.length) * 100).toFixed(1)),
          });
        }
      });

      return {
        operation: 'Data Quality & Missing Values Audit',
        targetColumns: headers,
        missingReport,
        totalRowsAnalyzed: rows.length,
        totalTransactions: rows.length,
        totalMissingCells: missingReport.reduce((acc, m) => acc + m.missingCount, 0),
        summary: missingReport.length === 0
          ? `Zero missing values detected across ${rows.length} rows. 100% data completeness.`
          : `Identified missing values across ${missingReport.length} columns in sheet "${sheetName}". Analyzed ${rows.length} rows.`,
        items: missingReport.map((m) => ({
          label: m.column,
          value: m.missingCount,
        })),
      };
    }

    // Resolve Category Mapping across sheets
    const { mapping: categoryMap, hasMapping } = this.resolveCategoryMapping(
      parsedSpreadsheet,
      targetSheet,
      dimensionCol
    );

    // Check if category values are numeric codes (e.g. 1, 2, 3, 4, 10)
    let isNumericCategoryCodes = false;
    const sampleVals = rows.slice(0, 100).map((r) => r[dimensionCol]).filter((v) => v !== null && v !== undefined && v !== '');
    if (sampleVals.length > 0) {
      const numericCount = sampleVals.filter((v) => /^\d+$/.test(String(v).trim())).length;
      if (numericCount / sampleVals.length >= 0.75) {
        isNumericCategoryCodes = true;
      }
    }

    // Check if user is asking for monthly trends or date comparison
    const isMonthlyQuery = /(month|monthly|over time|timeline|trend)/i.test(queryLower);
    const dateCol = (Array.isArray(dateCols) && dateCols.length > 0)
      ? dateCols[0]
      : headers.find((h) => columnSchema[h]?.type === 'date' || /(date|month|period|time)/i.test(h));
    const shouldAggregateByMonth = (operation === 'TREND' || isMonthlyQuery) && Boolean(dateCol);

    // 3. GROUP BY CATEGORY OR MONTH (With or without metric column)
    if (dimensionCol || shouldAggregateByMonth) {
      const activeDimension = shouldAggregateByMonth ? dateCol : dimensionCol;
      const groupMap = {};
      let totalSum = 0;
      let totalCount = 0;
      const isCountBased = !metricCol;

      rows.forEach((row) => {
        let rawKey = row[activeDimension];
        let key;

        if (shouldAggregateByMonth) {
          const dt = this.parseDate(rawKey);
          if (dt) {
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            key = `${months[dt.getMonth()]} ${dt.getFullYear()}`;
          } else {
            key = String(rawKey || 'Unknown Period').trim();
          }
        } else {
          key = rawKey !== null && rawKey !== undefined && String(rawKey).trim() !== ''
            ? String(rawKey).trim()
            : 'Unassigned';

          if (hasMapping && categoryMap[key]) {
            key = categoryMap[key];
          } else if (isNumericCategoryCodes && /^\d+$/.test(key)) {
            key = `Category ${key}`;
          }
        }

        const val = isCountBased ? 1 : (this.parseNumeric(row[metricCol]) || 0);

        if (!groupMap[key]) {
          groupMap[key] = { label: key, sum: 0, count: 0, values: [] };
        }
        groupMap[key].sum += val;
        groupMap[key].count += 1;
        groupMap[key].values.push(val);
        totalSum += val;
        totalCount += 1;
      });

      let items = Object.values(groupMap).map((g) => ({
        label: g.label,
        value: Number(g.sum.toFixed(2)),
        average: Number((g.sum / (g.count || 1)).toFixed(2)),
        count: g.count,
        percentage: totalSum > 0 ? Number(((g.sum / totalSum) * 100).toFixed(1)) : 0,
      }));

      // Sort order
      if (shouldAggregateByMonth) {
        items.sort((a, b) => {
          const da = new Date(a.label);
          const db = new Date(b.label);
          if (!isNaN(da.getTime()) && !isNaN(db.getTime())) {
            return da - db;
          }
          return String(a.label).localeCompare(String(b.label));
        });
      } else if (operation === 'BOTTOM_N') {
        items.sort((a, b) => a.value - b.value);
        items = items.slice(0, topN);
      } else {
        items.sort((a, b) => b.value - a.value);
        if (operation === 'TOP_N') {
          items = items.slice(0, topN);
        }
      }

      const highest = items[0] || null;
      const lowest = items[items.length - 1] || null;
      const overallAvg = isCountBased
        ? Number((totalCount / (items.length || 1)).toFixed(1))
        : Number((totalSum / (rows.length || 1)).toFixed(2));

      const categoryCodesWithoutMapping = !hasMapping && isNumericCategoryCodes && !shouldAggregateByMonth;

      return {
        operation: shouldAggregateByMonth
          ? 'Monthly Expense Progression'
          : (operation === 'TOP_N'
              ? `Top ${topN} ${activeDimension} Rankings`
              : (operation === 'BOTTOM_N' ? `Lowest ${topN} ${activeDimension} Categories` : `Aggregated ${metricCol || 'Records'} by ${activeDimension}`)),
        targetColumns: [activeDimension, metricCol || 'Count'],
        formula: isCountBased
          ? `COUNT(*) GROUP BY ${activeDimension}`
          : `SUM(${metricCol}) GROUP BY ${activeDimension}`,
        totalSum: Number(totalSum.toFixed(2)),
        totalRowsAnalyzed: rows.length,
        totalTransactions: rows.length,
        overallAverage: overallAvg,
        highest,
        lowest,
        items,
        isCountBased,
        currency: isCountBased ? '' : currency,
        categoryCodesWithoutMapping,
        mappingSheetName: hasMapping ? (parsedSpreadsheet.sheets.find(s => s !== targetSheet)?.name || 'Mapping') : null,
        summary: shouldAggregateByMonth
          ? `Calculated monthly totals across ${items.length} periods for ${rows.length} transactions. Peak: "${highest?.label}" (${currency}${highest?.value.toLocaleString()}).`
          : `Calculated total ${metricCol || 'records'} across ${items.length} unique segments. Total: ${isCountBased ? totalSum.toLocaleString() + ' records' : currency + totalSum.toLocaleString()}. Peak: "${highest?.label}" (${isCountBased ? highest?.value.toLocaleString() + ' records' : currency + highest?.value.toLocaleString()} / ${highest?.percentage}%). Analyzed ${rows.length} rows.`,
      };
    }

    // 4. TOTAL / SUM OF SINGLE METRIC
    if (metricCol) {
      const values = rows.map((r) => this.parseNumeric(r[metricCol])).filter((v) => v !== null);
      const total = values.reduce((acc, v) => acc + v, 0);
      const avg = total / (values.length || 1);
      const sorted = [...values].sort((a, b) => a - b);

      return {
        operation: `Aggregate Metrics for ${metricCol}`,
        targetColumns: [metricCol],
        formula: `SUM(${metricCol}) over ${values.length} records`,
        totalSum: Number(total.toFixed(2)),
        totalRowsAnalyzed: rows.length,
        totalTransactions: rows.length,
        overallAverage: Number(avg.toFixed(2)),
        min: sorted[0] || 0,
        max: sorted[sorted.length - 1] || 0,
        count: values.length,
        currency,
        items: rows.slice(0, 10).map((r, i) => ({
          label: String(r[dimensionCol] || `Row #${i + 1}`),
          value: this.parseNumeric(r[metricCol]) || 0,
        })),
        summary: `Total ${metricCol}: ${currency}${total.toLocaleString()} across ${values.length} valid rows. Average: ${currency}${avg.toFixed(2)}.`,
      };
    }

    // Fallback: General Counts
    return {
      operation: 'Dataset Row Count Summary',
      targetColumns: headers.slice(0, 4),
      formula: `COUNT(*)`,
      totalRows: rows.length,
      totalRowsAnalyzed: rows.length,
      totalTransactions: rows.length,
      currency: '',
      items: headers.slice(0, 6).map((h) => ({
        label: h,
        value: rows.filter((r) => r[h] !== null && r[h] !== '').length,
      })),
      summary: `Processed ${rows.length} rows across ${headers.length} attributes.`,
    };
  }

  /**
   * 3. Intelligent Dynamic Chart Config Generator (Recharts compatible)
   */
  buildDynamicChartConfig({
    userQuery = '',
    calcResult,
    rows,
    metricCol,
    secondaryMetricCol,
    dimensionCol,
    columnSchema,
    targetSheet,
  }) {
    if (!calcResult || !calcResult.items || calcResult.items.length === 0) {
      return null;
    }

    const queryLower = (userQuery || '').toLowerCase();
    const dataItems = calcResult.items;

    // Detect user-requested chart type
    let chartType = null;
    if (/(horizontal\s*bar|horizontal)/i.test(queryLower)) {
      chartType = 'horizontal_bar';
    } else if (/(bar\s*chart|\bbar\b)/i.test(queryLower)) {
      chartType = 'bar';
    } else if (/(line\s*chart|\bline\b|trend)/i.test(queryLower)) {
      chartType = 'line';
    } else if (/(doughnut|donut)/i.test(queryLower)) {
      chartType = 'doughnut';
    } else if (/(pie\s*chart|\bpie\b|proportion|share)/i.test(queryLower)) {
      chartType = 'pie';
    } else if (/(area\s*chart|\barea\b)/i.test(queryLower)) {
      chartType = 'area';
    } else if (/(scatter\s*plot|\bscatter\b)/i.test(queryLower)) {
      chartType = 'scatter';
    } else if (/(histogram|distribution|frequency)/i.test(queryLower)) {
      chartType = 'histogram';
    } else if (/(stacked\s*bar|stacked)/i.test(queryLower)) {
      chartType = 'stacked_bar';
    }

    // Intelligent Chart Selection if unspecified
    if (!chartType) {
      const isDateDim = columnSchema[dimensionCol]?.type === 'date' || /(month|date|year|quarter|period)/i.test(dimensionCol) || calcResult.operation?.includes('Monthly');
      if (isDateDim) {
        chartType = 'line';
      } else if (calcResult.operation?.includes('Percentage') || (dataItems.length <= 6 && queryLower.includes('percentage'))) {
        chartType = 'pie';
      } else if (dataItems.length > 7) {
        chartType = 'horizontal_bar';
      } else {
        chartType = 'bar';
      }
    }

    // Prepare clean data array with colors
    const chartData = dataItems.map((item, idx) => ({
      name: item.label,
      label: item.label,
      value: item.value,
      percentage: item.percentage !== undefined ? item.percentage : null,
      color: this.PALETTE[idx % this.PALETTE.length],
    }));

    // Series Definition
    const isCountBased = calcResult.isCountBased;
    const series = [
      {
        key: 'value',
        name: isCountBased ? 'Records' : (metricCol ? `${metricCol}` : 'Metric Value'),
        color: this.PALETTE[0],
      },
    ];

    // Supported alternative chart types user can switch between in the UI
    const availableChartTypes = ['bar', 'horizontal_bar', 'line', 'area', 'pie', 'doughnut'];
    if (metricCol && secondaryMetricCol) {
      availableChartTypes.push('scatter');
    }

    const title = calcResult.operation?.includes('Monthly')
      ? 'Monthly Expense Progression'
      : (metricCol && dimensionCol
          ? `${metricCol} by ${dimensionCol}`
          : `${calcResult.operation || 'Data Visualization'}`);

    const description = `Interactive chart comparing totals across ${chartData.length} categories (${(calcResult.totalRowsAnalyzed || rows.length).toLocaleString()} rows analyzed).`;

    return {
      chartType,
      type: chartType,
      title,
      description,
      xAxis: {
        key: chartType === 'horizontal_bar' ? 'value' : 'name',
        label: chartType === 'horizontal_bar' ? (isCountBased ? 'Records' : (metricCol || 'Value')) : (dimensionCol || 'Category'),
      },
      yAxis: {
        key: chartType === 'horizontal_bar' ? 'name' : 'value',
        label: chartType === 'horizontal_bar' ? (dimensionCol || 'Category') : (isCountBased ? 'Record Count' : (metricCol || 'Total Amount')),
      },
      series,
      data: chartData,
      availableChartTypes,
      summaryStats: {
        total: calcResult.totalSum || chartData.reduce((acc, d) => acc + d.value, 0),
        average: calcResult.overallAverage || (chartData.reduce((acc, d) => acc + d.value, 0) / chartData.length),
        min: calcResult.lowest ? calcResult.lowest.value : Math.min(...chartData.map((d) => d.value)),
        max: calcResult.highest ? calcResult.highest.value : Math.max(...chartData.map((d) => d.value)),
        count: chartData.length,
        topItem: calcResult.highest ? calcResult.highest.label : chartData[0]?.name,
      },
    };
  }

  /**
   * Helper: Convert data points to downloadable CSV format
   */
  exportToCSV(dataPoints, dimensionLabel = 'Dimension', metricLabel = 'Value') {
    if (!Array.isArray(dataPoints) || dataPoints.length === 0) return '';
    const headers = [dimensionLabel, metricLabel, 'Percentage'];
    const lines = [headers.join(',')];
    dataPoints.forEach((d) => {
      const name = `"${String(d.name || d.label || '').replace(/"/g, '""')}"`;
      const val = d.value !== undefined ? d.value : '';
      const pct = d.percentage !== undefined && d.percentage !== null ? `${d.percentage}%` : '';
      lines.push(`${name},${val},${pct}`);
    });
    return lines.join('\n');
  }
}

export const spreadsheetService = new SpreadsheetService();
export default spreadsheetService;
