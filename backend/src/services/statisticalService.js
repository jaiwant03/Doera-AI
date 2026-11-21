/**
 * DOERA AI — Complete Statistical Analysis & Mathematical Calculation Engine
 * 
 * Supports exact deterministic calculations on real datasets:
 * - Central Tendency: Mean, Median, Mode, Geometric Mean, Harmonic Mean, Weighted Mean
 * - Dispersion & Variability: Range, Min, Max, Population & Sample Variance, 
 *   Population & Sample Standard Deviation, Population & Sample Coefficient of Variation,
 *   Quartiles (Q1, Q2, Q3), IQR, Mean Absolute Deviation (MAD), Percentiles, Five-Number Summary
 * - Distribution & Advanced: Skewness, Kurtosis, Z-Scores, Outlier Detection (IQR Method),
 *   Frequency Distribution, Normality Assessment
 * - Correlation & Relationship: Pearson Correlation, Spearman Rank Correlation, 
 *   Covariance, Correlation Matrix
 * - Intelligent Column Detection & Multi-Statistic Request Parsing
 */

import { logger } from '../utils/logger.js';

class StatisticalService {
  constructor() {
    this.name = 'StatisticalService';
  }

  // =========================================================================
  // 1. DATA EXTRACTION & NUMERIC CLEANING
  // =========================================================================

  /**
   * Extracts clean numeric array from dataset rows for a given column.
   * Preserves exact values, records missing, null, and non-numeric counts.
   */
  extractNumericSeries(rows, columnName) {
    if (!Array.isArray(rows) || rows.length === 0 || !columnName) {
      return {
        values: [],
        totalRows: 0,
        validCount: 0,
        missingCount: 0,
        invalidCount: 0,
        columnName,
      };
    }

    const values = [];
    let missingCount = 0;
    let invalidCount = 0;

    for (let i = 0; i < rows.length; i++) {
      const raw = rows[i][columnName];

      if (raw === null || raw === undefined || raw === '') {
        missingCount++;
        continue;
      }

      let num = null;
      if (typeof raw === 'number') {
        num = raw;
      } else if (typeof raw === 'string') {
        // Clean common currency symbols, commas, percent, whitespace
        const clean = raw.replace(/[$,₹€£%\s]/g, '').replace(/,/g, '');
        const parsed = parseFloat(clean);
        if (!isNaN(parsed) && isFinite(parsed)) {
          num = parsed;
        }
      }

      if (num !== null && !isNaN(num) && isFinite(num)) {
        values.push(num);
      } else {
        invalidCount++;
      }
    }

    return {
      values,
      totalRows: rows.length,
      validCount: values.length,
      missingCount,
      invalidCount,
      columnName,
    };
  }

  // =========================================================================
  // 2. CENTRAL TENDENCY
  // =========================================================================

  /**
   * Arithmetic Mean: Sum of values / N
   */
  calculateMean(values) {
    if (!values || values.length === 0) return null;
    let sum = 0;
    for (let i = 0; i < values.length; i++) {
      sum += values[i];
    }
    return sum / values.length;
  }

  /**
   * Median: Middle value of sorted observations
   */
  calculateMedian(values) {
    if (!values || values.length === 0) return null;
    const sorted = [...values].sort((a, b) => a - b);
    const n = sorted.length;
    const mid = Math.floor(n / 2);
    if (n % 2 !== 0) {
      return sorted[mid];
    }
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }

  /**
   * Mode: Most frequently occurring value(s).
   * Reports multiple modes if tied; identifies if all values occur only once.
   */
  calculateMode(values) {
    if (!values || values.length === 0) {
      return { modes: [], frequency: 0, isMultimodal: false, hasMode: false };
    }

    const freqMap = new Map();
    let maxFreq = 0;

    for (let i = 0; i < values.length; i++) {
      const v = values[i];
      const count = (freqMap.get(v) || 0) + 1;
      freqMap.set(v, count);
      if (count > maxFreq) {
        maxFreq = count;
      }
    }

    // If max frequency is 1 and length > 1, all values are unique -> no repeated mode
    if (maxFreq <= 1 && values.length > 1) {
      return {
        modes: [],
        frequency: 1,
        isMultimodal: false,
        hasMode: false,
        note: 'All values appear exactly once; no repeated mode exists in this dataset.',
      };
    }

    const modes = [];
    for (const [val, count] of freqMap.entries()) {
      if (count === maxFreq) {
        modes.push(val);
      }
    }

    return {
      modes: modes.sort((a, b) => a - b),
      frequency: maxFreq,
      isMultimodal: modes.length > 1,
      hasMode: true,
      modeValue: modes.length === 1 ? modes[0] : modes,
    };
  }

  /**
   * Geometric Mean: exp( (1/n) * sum(ln(x)) )
   * Only valid for strictly positive values (x > 0).
   */
  calculateGeometricMean(values) {
    if (!values || values.length === 0) return null;
    for (let i = 0; i < values.length; i++) {
      if (values[i] <= 0) {
        return {
          valid: false,
          value: null,
          reason: 'Geometric mean is undefined for datasets containing zero or negative values.',
        };
      }
    }

    let logSum = 0;
    for (let i = 0; i < values.length; i++) {
      logSum += Math.log(values[i]);
    }
    return {
      valid: true,
      value: Math.exp(logSum / values.length),
    };
  }

  /**
   * Harmonic Mean: n / sum(1 / x)
   * Only valid for strictly positive values.
   */
  calculateHarmonicMean(values) {
    if (!values || values.length === 0) return null;
    let invSum = 0;
    for (let i = 0; i < values.length; i++) {
      if (values[i] <= 0) {
        return {
          valid: false,
          value: null,
          reason: 'Harmonic mean is undefined for datasets containing zero or negative values.',
        };
      }
      invSum += 1 / values[i];
    }
    return {
      valid: true,
      value: values.length / invSum,
    };
  }

  /**
   * Weighted Mean: sum(w_i * x_i) / sum(w_i)
   */
  calculateWeightedMean(values, weights) {
    if (!values || !weights || values.length === 0 || values.length !== weights.length) {
      return null;
    }
    let weightSum = 0;
    let weightedValueSum = 0;
    for (let i = 0; i < values.length; i++) {
      const w = Number(weights[i]) || 0;
      const v = Number(values[i]) || 0;
      weightSum += w;
      weightedValueSum += w * v;
    }
    if (weightSum === 0) return null;
    return weightedValueSum / weightSum;
  }

  // =========================================================================
  // 3. DISPERSION & VARIABILITY
  // =========================================================================

  /**
   * Range, Min, Max
   */
  calculateRange(values) {
    if (!values || values.length === 0) return null;
    let min = values[0];
    let max = values[0];
    for (let i = 1; i < values.length; i++) {
      if (values[i] < min) min = values[i];
      if (values[i] > max) max = values[i];
    }
    return {
      min,
      max,
      range: max - min,
    };
  }

  /**
   * Variance (Population & Sample)
   * Population: sum((x_i - mean)^2) / N
   * Sample: sum((x_i - mean)^2) / (N - 1)
   */
  calculateVariance(values) {
    if (!values || values.length === 0) return null;
    const n = values.length;
    const mean = this.calculateMean(values);

    let sumSquaredDiff = 0;
    for (let i = 0; i < n; i++) {
      const diff = values[i] - mean;
      sumSquaredDiff += diff * diff;
    }

    const populationVariance = sumSquaredDiff / n;
    const sampleVariance = n > 1 ? sumSquaredDiff / (n - 1) : 0;

    return {
      mean,
      sumSquaredDiff,
      n,
      populationVariance,
      sampleVariance,
    };
  }

  /**
   * Standard Deviation (Population & Sample)
   */
  calculateStandardDeviation(values) {
    const varianceObj = this.calculateVariance(values);
    if (!varianceObj) return null;

    const populationStandardDeviation = Math.sqrt(varianceObj.populationVariance);
    const sampleStandardDeviation = Math.sqrt(varianceObj.sampleVariance);

    return {
      ...varianceObj,
      populationStandardDeviation,
      sampleStandardDeviation,
    };
  }

  /**
   * Coefficient of Variation (CV = (SD / Mean) * 100)
   * Reports both sample and population definitions.
   * If mean <= 0, marks as undefined or not meaningful.
   */
  calculateCoefficientOfVariation(values) {
    const sdObj = this.calculateStandardDeviation(values);
    if (!sdObj) return null;

    const mean = sdObj.mean;

    if (mean === 0) {
      return {
        ...sdObj,
        isMeaningful: false,
        reason: 'Mean is exactly zero; Coefficient of Variation is mathematically undefined (division by zero).',
        populationCV: null,
        sampleCV: null,
      };
    }

    if (mean < 0) {
      return {
        ...sdObj,
        isMeaningful: false,
        reason: 'Mean is negative; relative variability via Coefficient of Variation is not meaningful for non-positive scales.',
        populationCV: null,
        sampleCV: null,
      };
    }

    const populationCV = (sdObj.populationStandardDeviation / mean) * 100;
    const sampleCV = (sdObj.sampleStandardDeviation / mean) * 100;

    return {
      ...sdObj,
      isMeaningful: true,
      populationCV,
      sampleCV,
      populationCVFormatted: `${populationCV.toFixed(2)}%`,
      sampleCVFormatted: `${sampleCV.toFixed(2)}%`,
    };
  }

  /**
   * Percentile using Linear Interpolation Method (NIST / standard method)
   * p in [0, 100]
   */
  calculatePercentile(sortedValues, p) {
    if (!sortedValues || sortedValues.length === 0) return null;
    if (p <= 0) return sortedValues[0];
    if (p >= 100) return sortedValues[sortedValues.length - 1];

    const n = sortedValues.length;
    // Rank index in [0, n-1]
    const index = (p / 100) * (n - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    const weight = index - lower;

    if (lower === upper) return sortedValues[lower];
    return sortedValues[lower] * (1 - weight) + sortedValues[upper] * weight;
  }

  /**
   * Quartiles (Q1, Q2, Q3), Interquartile Range (IQR), and Five-Number Summary
   */
  calculateQuartiles(values) {
    if (!values || values.length === 0) return null;
    const sorted = [...values].sort((a, b) => a - b);
    const min = sorted[0];
    const max = sorted[sorted.length - 1];

    const q1 = this.calculatePercentile(sorted, 25);
    const q2 = this.calculatePercentile(sorted, 50); // Equals Median
    const q3 = this.calculatePercentile(sorted, 75);
    const iqr = q3 - q1;

    return {
      min,
      q1,
      q2,
      median: q2,
      q3,
      max,
      iqr,
      fiveNumberSummary: { min, q1, median: q2, q3, max },
    };
  }

  /**
   * Mean Absolute Deviation (MAD): (1/n) * sum(|x_i - mean|)
   */
  calculateMeanAbsoluteDeviation(values) {
    if (!values || values.length === 0) return null;
    const mean = this.calculateMean(values);
    let absSum = 0;
    for (let i = 0; i < values.length; i++) {
      absSum += Math.abs(values[i] - mean);
    }
    return absSum / values.length;
  }

  // =========================================================================
  // 4. DISTRIBUTION & ADVANCED STATISTICS
  // =========================================================================

  /**
   * Skewness & Kurtosis
   * Fisher-Pearson sample skewness and sample excess kurtosis
   */
  calculateSkewnessAndKurtosis(values) {
    if (!values || values.length < 3) return null;
    const n = values.length;
    const mean = this.calculateMean(values);
    const sdObj = this.calculateStandardDeviation(values);
    const s = sdObj.sampleStandardDeviation;

    if (s === 0) {
      return {
        sampleSkewness: 0,
        populationSkewness: 0,
        sampleExcessKurtosis: 0,
        interpretation: 'All values are identical (zero variance).',
      };
    }

    let m3 = 0;
    let m4 = 0;
    for (let i = 0; i < n; i++) {
      const z = (values[i] - mean) / s;
      m3 += Math.pow(z, 3);
      m4 += Math.pow(z, 4);
    }

    // Adjusted Fisher-Pearson sample skewness
    const sampleSkewness = (n / ((n - 1) * (n - 2))) * m3;
    const populationSkewness = m3 / n;

    // Sample excess kurtosis (unbiased estimator)
    let sampleExcessKurtosis = 0;
    if (n >= 4) {
      const factor1 = (n * (n + 1)) / ((n - 1) * (n - 2) * (n - 3));
      const factor2 = (3 * Math.pow(n - 1, 2)) / ((n - 2) * (n - 3));
      sampleExcessKurtosis = factor1 * m4 - factor2;
    } else {
      sampleExcessKurtosis = (m4 / n) - 3;
    }

    let skewnessDescription = 'Approximately symmetric';
    if (sampleSkewness > 1) skewnessDescription = 'Highly positively skewed (right-tailed)';
    else if (sampleSkewness > 0.5) skewnessDescription = 'Moderately positively skewed';
    else if (sampleSkewness < -1) skewnessDescription = 'Highly negatively skewed (left-tailed)';
    else if (sampleSkewness < -0.5) skewnessDescription = 'Moderately negatively skewed';

    let kurtosisDescription = 'Mesokurtic (normal-like tails)';
    if (sampleExcessKurtosis > 1) kurtosisDescription = 'Leptokurtic (heavy-tailed / outlier-prone)';
    else if (sampleExcessKurtosis < -1) kurtosisDescription = 'Platykurtic (light-tailed / flat peak)';

    return {
      sampleSkewness,
      populationSkewness,
      sampleExcessKurtosis,
      skewnessDescription,
      kurtosisDescription,
      convention: 'Fisher-Pearson standardized third moment & unbiased sample excess kurtosis',
    };
  }

  /**
   * Outlier Detection using IQR Method
   * Lower Bound = Q1 - 1.5 * IQR
   * Upper Bound = Q3 + 1.5 * IQR
   */
  detectOutliersIQR(values) {
    if (!values || values.length === 0) return null;
    const quartiles = this.calculateQuartiles(values);
    const { q1, q3, iqr } = quartiles;

    const lowerBound = q1 - 1.5 * iqr;
    const upperBound = q3 + 1.5 * iqr;

    const extremeLowerBound = q1 - 3.0 * iqr;
    const extremeUpperBound = q3 + 3.0 * iqr;

    const outliers = [];
    const mildOutliers = [];
    const extremeOutliers = [];

    for (let i = 0; i < values.length; i++) {
      const val = values[i];
      if (val < lowerBound || val > upperBound) {
        outliers.push({ index: i, value: val });
        if (val < extremeLowerBound || val > extremeUpperBound) {
          extremeOutliers.push(val);
        } else {
          mildOutliers.push(val);
        }
      }
    }

    return {
      ...quartiles,
      lowerBound,
      upperBound,
      extremeLowerBound,
      extremeUpperBound,
      totalObservations: values.length,
      outlierCount: outliers.length,
      outlierPercentage: Number(((outliers.length / values.length) * 100).toFixed(2)),
      mildCount: mildOutliers.length,
      extremeCount: extremeOutliers.length,
      sampleOutliers: outliers.slice(0, 15).map((o) => o.value),
      method: 'Tukey IQR (1.5x IQR Rule)',
      note: 'Values outside [Q1 - 1.5*IQR, Q3 + 1.5*IQR] are statistical outliers; they do not necessarily indicate fraud or error.',
    };
  }

  /**
   * Frequency Distribution (Histogram Bins)
   */
  calculateFrequencyDistribution(values, numBins = 10) {
    if (!values || values.length === 0) return null;
    const rangeObj = this.calculateRange(values);
    const { min, max, range } = rangeObj;

    const n = values.length;
    const binsCount = Math.max(2, Math.min(numBins, Math.ceil(Math.sqrt(n))));
    const binWidth = range === 0 ? 1 : range / binsCount;

    const bins = [];
    for (let i = 0; i < binsCount; i++) {
      const binStart = min + i * binWidth;
      const binEnd = i === binsCount - 1 ? max : binStart + binWidth;
      bins.push({
        binIndex: i + 1,
        rangeLabel: `${binStart.toFixed(2)} - ${binEnd.toFixed(2)}`,
        binStart,
        binEnd,
        count: 0,
        relativeFrequency: 0,
        cumulativeFrequency: 0,
      });
    }

    for (let i = 0; i < n; i++) {
      const v = values[i];
      let bIdx = Math.floor((v - min) / binWidth);
      if (bIdx >= binsCount) bIdx = binsCount - 1;
      if (bIdx < 0) bIdx = 0;
      bins[bIdx].count++;
    }

    let runningCumulative = 0;
    for (let i = 0; i < bins.length; i++) {
      runningCumulative += bins[i].count;
      bins[i].relativeFrequency = Number((bins[i].count / n).toFixed(4));
      bins[i].cumulativeFrequency = runningCumulative;
    }

    return {
      bins,
      min,
      max,
      binWidth,
      totalObservations: n,
    };
  }

  // =========================================================================
  // 5. CORRELATION & RELATIONSHIP ANALYSIS
  // =========================================================================

  /**
   * Pearson Correlation Coefficient (r) & Covariance
   */
  calculatePearsonCorrelation(xVals, yVals) {
    if (!xVals || !yVals || xVals.length === 0 || xVals.length !== yVals.length) {
      return null;
    }
    const n = xVals.length;
    if (n < 2) return null;

    const meanX = this.calculateMean(xVals);
    const meanY = this.calculateMean(yVals);

    let sumDiffProd = 0;
    let sumDiffX2 = 0;
    let sumDiffY2 = 0;

    for (let i = 0; i < n; i++) {
      const dx = xVals[i] - meanX;
      const dy = yVals[i] - meanY;
      sumDiffProd += dx * dy;
      sumDiffX2 += dx * dx;
      sumDiffY2 += dy * dy;
    }

    const denom = Math.sqrt(sumDiffX2 * sumDiffY2);
    const r = denom === 0 ? 0 : sumDiffProd / denom;
    const rSquared = r * r;

    const populationCovariance = sumDiffProd / n;
    const sampleCovariance = sumDiffProd / (n - 1);

    let strength = 'No correlation';
    const absR = Math.abs(r);
    if (absR >= 0.8) strength = 'Very strong';
    else if (absR >= 0.6) strength = 'Strong';
    else if (absR >= 0.4) strength = 'Moderate';
    else if (absR >= 0.2) strength = 'Weak';
    else if (absR > 0) strength = 'Very weak';

    const direction = r > 0 ? 'positive' : (r < 0 ? 'negative' : 'neutral');

    return {
      n,
      pearsonR: Number(r.toFixed(4)),
      rSquared: Number(rSquared.toFixed(4)),
      populationCovariance: Number(populationCovariance.toFixed(4)),
      sampleCovariance: Number(sampleCovariance.toFixed(4)),
      strength,
      direction,
      relationshipSummary: `${strength} ${direction} linear correlation (r = ${r.toFixed(4)})`,
      caution: 'Correlation measures linear association and does NOT imply causation.',
    };
  }

  /**
   * Spearman Rank Correlation
   */
  calculateSpearmanCorrelation(xVals, yVals) {
    if (!xVals || !yVals || xVals.length === 0 || xVals.length !== yVals.length) {
      return null;
    }
    const n = xVals.length;
    if (n < 2) return null;

    const getRanks = (arr) => {
      const indexed = arr.map((v, i) => ({ v, i }));
      indexed.sort((a, b) => a.v - b.v);
      const ranks = new Array(n);
      let i = 0;
      while (i < n) {
        let j = i;
        while (j < n - 1 && indexed[j].v === indexed[j + 1].v) {
          j++;
        }
        const avgRank = 1 + (i + j) / 2;
        for (let k = i; k <= j; k++) {
          ranks[indexed[k].i] = avgRank;
        }
        i = j + 1;
      }
      return ranks;
    };

    const xRanks = getRanks(xVals);
    const yRanks = getRanks(yVals);

    return this.calculatePearsonCorrelation(xRanks, yRanks);
  }

  /**
   * Correlation Matrix across all suitable numerical columns
   */
  calculateCorrelationMatrix(rows, numericColumns) {
    if (!Array.isArray(rows) || !Array.isArray(numericColumns) || numericColumns.length < 2) {
      return null;
    }

    const seriesMap = {};
    for (const col of numericColumns) {
      seriesMap[col] = this.extractNumericSeries(rows, col).values;
    }

    const matrix = [];
    for (let i = 0; i < numericColumns.length; i++) {
      const colA = numericColumns[i];
      const rowResult = { column: colA };
      for (let j = 0; j < numericColumns.length; j++) {
        const colB = numericColumns[j];
        if (i === j) {
          rowResult[colB] = 1.0;
        } else {
          const res = this.calculatePearsonCorrelation(seriesMap[colA], seriesMap[colB]);
          rowResult[colB] = res ? res.pearsonR : 0;
        }
      }
      matrix.push(rowResult);
    }

    return {
      columns: numericColumns,
      matrix,
      caution: 'Correlation measures linear association and does NOT imply causation.',
    };
  }

  // =========================================================================
  // 6. INTELLIGENT COLUMN SELECTION (Phase 6)
  // =========================================================================

  /**
   * Identifies candidate numeric columns and selects the most relevant variable.
   * Respects explicit user specification (e.g., "mean of Year").
   */
  detectTargetNumericColumn(rows, headers, columnSchema, queryLower = '') {
    if (!headers || headers.length === 0) return null;

    // Detect numeric columns based on columnSchema and data sampling
    const numericCandidates = headers.filter((h) => {
      if (columnSchema && columnSchema[h]) {
        return columnSchema[h].type === 'numeric';
      }
      return false;
    });

    // 1. Check if user explicitly mentioned any column name in query
    for (const h of headers) {
      const hLower = h.toLowerCase();
      // Match exact full column name or word boundary
      const regex = new RegExp(`\\b${hLower.replace(/[^a-z0-9]/g, '[_\\s]?')}\\b`, 'i');
      if (regex.test(queryLower) || queryLower.includes(hLower)) {
        return h;
      }
    }

    // 2. Filter out identifier columns (e.g. Transaction_ID, User_ID, ID, Order_ID)
    const filteredNumeric = numericCandidates.filter((col) => {
      const colLower = col.toLowerCase();
      const isId = /(^id$|_id$|^uuid$|^guid$|transaction.*id|user.*id|customer.*id|order.*id|invoice.*id)/i.test(colLower);
      const isCode = /(category_code|payment_code|status_code|zip_code|postal_code)/i.test(colLower);
      return !isId && !isCode;
    });

    const candidates = filteredNumeric.length > 0 ? filteredNumeric : numericCandidates;
    if (candidates.length === 0) return headers[0];

    // 3. Score candidates by financial / measurement keywords
    const priorityKeywords = [
      'amount', 'expense', 'spending', 'cost', 'price', 'total', 'revenue',
      'sales', 'profit', 'balance', 'salary', 'fee', 'charge', 'budget',
      'value', 'rate', 'unit', 'score', 'quantity', 'weight', 'height', 'time'
    ];

    for (const kw of priorityKeywords) {
      const found = candidates.find((c) => c.toLowerCase().includes(kw));
      if (found) return found;
    }

    return candidates[0];
  }

  // =========================================================================
  // 7. MULTI-OPERATION STATISTICAL DISPATCHER (Phases 7 & 8)
  // =========================================================================

  /**
   * Parses user request, extracts requested operations, executes calculations deterministically,
   * and returns structured results.
   */
  executeStatisticalAnalysis({
    rows,
    headers,
    columnSchema,
    query,
    filename = 'dataset.xlsx',
    sheetName = 'Sheet1',
  }) {
    const queryLower = (query || '').toLowerCase();

    // 1. Detect target column
    const targetCol = this.detectTargetNumericColumn(rows, headers, columnSchema, queryLower);
    const seriesData = this.extractNumericSeries(rows, targetCol);
    const values = seriesData.values;

    if (values.length === 0) {
      return {
        success: false,
        error: `No valid numeric observations found in column "${targetCol}".`,
        targetColumn: targetCol,
        totalRows: rows.length,
      };
    }

    // 2. Identify requested operations with exact allowlist matching
    const isFullSummaryRequested = /\b(complete\s*statistical\s*analysis|complete\s*statistical\s*summary|full\s*statistical\s*analysis|complete\s*analysis|all\s*statistical\s*measures|all\s*statistics|full\s*statistics|statistics\s*summary|statistical\s*profile)\b/i.test(queryLower);

    const isMeanRequested = !isFullSummaryRequested && (/\b(mean|average|avg)\b/i.test(queryLower) || /\baverage\s*transaction\b/i.test(queryLower));
    const isMedianRequested = !isFullSummaryRequested && /\b(median|middle\s*value)\b/i.test(queryLower);
    const isModeRequested = !isFullSummaryRequested && /\b(mode|most\s*frequent(ly)?|occurs?\s*most)\b/i.test(queryLower);

    const isPopulationVariance = /\bpopulation\s*(variance|\bvar\b)\b/i.test(queryLower);
    const isSampleVariance = /\bsample\s*(variance|\bvar\b)\b/i.test(queryLower);
    const isGeneralVariationRequested = !isFullSummaryRequested && !/\b(coefficient\s*of\s*variation|\bcv\b)\b/i.test(queryLower) && /\bhow\s*much\s*variation\b/i.test(queryLower);
    const isVarianceRequested = !isFullSummaryRequested && (/\b(variance|\bvar\b)\b/i.test(queryLower) || isPopulationVariance || isSampleVariance || isGeneralVariationRequested);

    const isPopulationStdDev = /\bpopulation\s*(standard\s*deviation|std\s*dev|stdev|sigma)\b/i.test(queryLower);
    const isSampleStdDev = /\bsample\s*(standard\s*deviation|std\s*dev|stdev)\b/i.test(queryLower);
    const isStdDevRequested = !isFullSummaryRequested && (/\b(standard\s*deviation|std\s*dev|stdev|sigma)\b/i.test(queryLower) || isPopulationStdDev || isSampleStdDev || isGeneralVariationRequested);

    const isCVRequested = !isFullSummaryRequested && /\b(coefficient\s*of\s*variation|\bcv\b)\b/i.test(queryLower);
    const isRangeRequested = !isFullSummaryRequested && /\b(range|min\s*and\s*max|spread)\b/i.test(queryLower);
    const isMinRequested = !isFullSummaryRequested && !isRangeRequested && /\b(min|minimum|lowest\s*value)\b/i.test(queryLower);
    const isMaxRequested = !isFullSummaryRequested && !isRangeRequested && /\b(max|maximum|highest\s*value)\b/i.test(queryLower);

    const isOutliersRequested = !isFullSummaryRequested && /\b(outlier|outliers|anomalies|anomalous)\b/i.test(queryLower);
    const isQ1Requested = !isFullSummaryRequested && /\b(q1|first\s*quartile|25th\s*percentile)\b/i.test(queryLower);
    const isQ2Requested = !isFullSummaryRequested && /\b(q2|second\s*quartile)\b/i.test(queryLower);
    const isQ3Requested = !isFullSummaryRequested && /\b(q3|third\s*quartile|75th\s*percentile)\b/i.test(queryLower);
    const isIQRRequested = !isFullSummaryRequested && !isOutliersRequested && /\b(iqr|interquartile\s*range)\b/i.test(queryLower);
    const isQuartilesRequested = !isFullSummaryRequested && (
      /\b(quartiles|five[\s-]number)\b/i.test(queryLower) ||
      (/\bquartile\b/i.test(queryLower) && !isQ1Requested && !isQ2Requested && !isQ3Requested) ||
      (/\biqr\b/i.test(queryLower) && !isOutliersRequested) ||
      (isQ1Requested && isQ2Requested && isQ3Requested)
    );

    const isSkewnessRequested = !isFullSummaryRequested && /\b(skew|skewness)\b/i.test(queryLower);
    const isKurtosisRequested = !isFullSummaryRequested && /\b(kurtosis)\b/i.test(queryLower);
    const isMADRequested = !isFullSummaryRequested && /\b(mean\s*absolute\s*deviation|\bmad\b)\b/i.test(queryLower);
    const isCorrelationRequested = !isFullSummaryRequested && /\b(correlation|pearsons?|spearmans?|relationship|covariance)\b/i.test(queryLower);
    const isCompareRequested = !isFullSummaryRequested && /\b(compare|comparison|versus|\bvs\b)\b/i.test(queryLower) &&
      /\b(standard\s*deviation|std\s*dev|stdev|cv|coefficient\s*of\s*variation|mean|variance)\b/i.test(queryLower);

    // Build explicit requestedOperations allowlist
    const requestedOperations = [];
    if (isFullSummaryRequested) {
      requestedOperations.push('all');
    } else {
      if (isMeanRequested) requestedOperations.push('mean');
      if (isMedianRequested) requestedOperations.push('median');
      if (isModeRequested) requestedOperations.push('mode');
      if (isVarianceRequested) {
        if (isPopulationVariance && !isSampleVariance) requestedOperations.push('population_variance');
        else if (isSampleVariance && !isPopulationVariance) requestedOperations.push('sample_variance');
        else requestedOperations.push('variance');
      }
      if (isStdDevRequested) {
        if (isPopulationStdDev && !isSampleStdDev) requestedOperations.push('population_standard_deviation');
        else if (isSampleStdDev && !isPopulationStdDev) requestedOperations.push('sample_standard_deviation');
        else requestedOperations.push('standard_deviation');
      }
      if (isCVRequested) requestedOperations.push('coefficient_of_variation');
      if (isRangeRequested) requestedOperations.push('range');
      if (isMinRequested) requestedOperations.push('min');
      if (isMaxRequested) requestedOperations.push('max');
      if (isQ1Requested && !isQuartilesRequested) requestedOperations.push('q1');
      if (isQ3Requested && !isQuartilesRequested) requestedOperations.push('q3');
      if (isIQRRequested && !isQuartilesRequested) requestedOperations.push('iqr');
      if (isQuartilesRequested) requestedOperations.push('quartiles');
      if (isOutliersRequested) requestedOperations.push('outliers');
      if (isSkewnessRequested) requestedOperations.push('skewness');
      if (isKurtosisRequested) requestedOperations.push('kurtosis');
      if (isMADRequested) requestedOperations.push('mean_absolute_deviation');
      if (isCorrelationRequested) requestedOperations.push('correlation');
    }

    if (requestedOperations.length === 0) {
      requestedOperations.push('all');
    }

    const isMultiStat = requestedOperations.length >= 2;

    // 3. Compute Comprehensive Profile
    const mean = this.calculateMean(values);
    const median = this.calculateMedian(values);
    const modeObj = this.calculateMode(values);
    const rangeObj = this.calculateRange(values);
    const varianceObj = this.calculateVariance(values);
    const stdDevObj = this.calculateStandardDeviation(values);
    const cvObj = this.calculateCoefficientOfVariation(values);
    const quartilesObj = this.calculateQuartiles(values);
    const mad = this.calculateMeanAbsoluteDeviation(values);
    const skewKurt = this.calculateSkewnessAndKurtosis(values);
    const outliersObj = this.detectOutliersIQR(values);

    // Handle Correlation request between two columns
    let correlationResult = null;
    if (isCorrelationRequested) {
      // Find secondary column
      const otherCols = headers.filter((h) => h !== targetCol);
      let secondCol = null;
      for (const h of otherCols) {
        if (queryLower.includes(h.toLowerCase())) {
          secondCol = h;
          break;
        }
      }
      if (!secondCol) {
        // Find first available numeric column other than targetCol
        secondCol = otherCols.find((h) => columnSchema && columnSchema[h]?.type === 'numeric');
      }

      if (secondCol) {
        const seriesB = this.extractNumericSeries(rows, secondCol);
        // Align matching valid rows
        const matchedX = [];
        const matchedY = [];
        for (let i = 0; i < rows.length; i++) {
          const rawA = parseFloat(String(rows[i][targetCol] || '').replace(/[$,₹€£%\s,]/g, ''));
          const rawB = parseFloat(String(rows[i][secondCol] || '').replace(/[$,₹€£%\s,]/g, ''));
          if (!isNaN(rawA) && isFinite(rawA) && !isNaN(rawB) && isFinite(rawB)) {
            matchedX.push(rawA);
            matchedY.push(rawB);
          }
        }
        correlationResult = {
          colA: targetCol,
          colB: secondCol,
          pearson: this.calculatePearsonCorrelation(matchedX, matchedY),
          spearman: this.calculateSpearmanCorrelation(matchedX, matchedY),
        };
      }
    }

    // Determine primary statistical operation type for clean rendering
    let primaryOp = 'SUMMARY';
    if (isCompareRequested) {
      primaryOp = 'COMPARE_METRICS';
    } else if (requestedOperations.includes('all')) {
      primaryOp = 'FULL_STATISTICAL_ANALYSIS';
    } else if (requestedOperations.length === 1) {
      const single = requestedOperations[0];
      if (single === 'coefficient_of_variation') primaryOp = 'COEFFICIENT_OF_VARIATION';
      else if (single.includes('standard_deviation')) primaryOp = 'STANDARD_DEVIATION';
      else if (single.includes('variance')) primaryOp = 'VARIANCE';
      else if (single === 'mode') primaryOp = 'MODE';
      else if (single === 'median') primaryOp = 'MEDIAN';
      else if (single === 'mean') primaryOp = 'MEAN';
      else if (single === 'range' || single === 'min' || single === 'max') primaryOp = 'RANGE';
      else if (single === 'quartiles' || single === 'q1' || single === 'q3' || single === 'iqr') primaryOp = 'QUARTILES';
      else if (single === 'outliers') primaryOp = 'OUTLIERS';
      else if (single === 'skewness') primaryOp = 'SKEWNESS';
      else if (single === 'kurtosis') primaryOp = 'KURTOSIS';
      else if (single === 'correlation') primaryOp = 'CORRELATION';
      else primaryOp = 'MULTI_STATISTICAL_REPORT';
    } else {
      primaryOp = 'MULTI_STATISTICAL_REPORT';
    }

    return {
      success: true,
      isStatisticalAnalysis: true,
      primaryOperation: primaryOp,
      isMultiStat,
      isFullSummary: requestedOperations.includes('all'),
      requestedOperations,
      dataset: filename,
      sheetName,
      targetColumn: targetCol,
      seriesMetadata: {
        totalRows: seriesData.totalRows,
        validCount: seriesData.validCount,
        missingCount: seriesData.missingCount,
        invalidCount: seriesData.invalidCount,
        completeness: Number(((seriesData.validCount / Math.max(seriesData.totalRows, 1)) * 100).toFixed(2)),
      },
      results: {
        mean,
        median,
        mode: modeObj,
        range: rangeObj,
        variance: varianceObj,
        standardDeviation: stdDevObj,
        coefficientOfVariation: cvObj,
        quartiles: quartilesObj,
        meanAbsoluteDeviation: mad,
        distribution: skewKurt,
        outliers: outliersObj,
        correlation: correlationResult,
      },
      activeOperations: {
        isMeanRequested,
        isMedianRequested,
        isModeRequested,
        isVarianceRequested,
        isStdDevRequested,
        isCVRequested,
        isRangeRequested,
        isQuartilesRequested,
        isOutliersRequested,
        isSkewnessRequested,
        isKurtosisRequested,
        isCorrelationRequested,
        isPopulationVariance,
        isSampleVariance,
        isPopulationStdDev,
        isSampleStdDev,
        isFullSummaryRequested,
      },
    };
  }
}

export const statisticalService = new StatisticalService();
export default statisticalService;
