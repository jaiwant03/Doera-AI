import fs from 'fs';

const filePath = 'd:/Dev/Projects/Doera AI/backend/src/services/universalResponseBuilder.js';
let content = fs.readFileSync(filePath, 'utf8');

const startMarker = 'function buildStatisticalResponse(statResult, chart, userRequest) {';
const endMarker = 'function buildDataAnalysisResponse(analysis, task, userRequest) {';

const startIndex = content.indexOf(startMarker);
const endIndex = content.indexOf(endMarker);

if (startIndex === -1 || endIndex === -1) {
  console.error('Markers not found! startIndex:', startIndex, 'endIndex:', endIndex);
  process.exit(1);
}

// We use String.raw or proper escaping so that in universalResponseBuilder.js
// the JS code will literally contain "\\boxed", "\\[", etc.
const b = String.raw`function buildStatisticalResponse(statResult, chart, userRequest) {
  const {
    dataset = 'dataset.xlsx',
    sheetName = 'Sheet1',
    targetColumn = 'Amount',
    seriesMetadata,
    results,
    primaryOperation,
    isMultiStat,
    isFullSummary,
    requestedOperations = [],
    activeOperations = {},
  } = statResult;
  const validCount = seriesMetadata?.validCount || 0;
  const missingCount = seriesMetadata?.missingCount || 0;
  const completeness = seriesMetadata?.completeness || 100;
  const isCurrency = /(amount|expense|spending|cost|price|salary|revenue|profit|budget|balance|fee)/i.test(targetColumn);
  const cur = isCurrency ? '$' : '';

  const formatCurrency = (v, decimals = 2) => {
    if (v === null || v === undefined) return 'N/A';
    const n = Number(v);
    if (isNaN(n)) return String(v);
    return ` + '`' + `\${cur}\${n.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}` + '`' + `;
  };

  const formatRaw = (v, decimals = 2) => {
    if (v === null || v === undefined) return 'N/A';
    const n = Number(v);
    if (isNaN(n)) return String(v);
    return n.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  };

  const validCountFormatted = validCount.toLocaleString();
  const dof = Math.max(validCount - 1, 1);
  const dofFormatted = dof.toLocaleString();

  let md = '';

  // 1. Full Comprehensive Summary Report
  if (isFullSummary || requestedOperations.includes('all')) {
    md = buildFullStatisticalReport(statResult, formatCurrency, formatRaw);
  }
  // 2. Single Statistical Operation (exact calculation requested)
  else if (!isMultiStat && requestedOperations.length <= 1) {
    md = buildSingleMathResponse({
      primaryOperation,
      results,
      targetColumn,
      validCount,
      validCountFormatted,
      dof,
      dofFormatted,
      formatCurrency,
      formatRaw,
      activeOperations,
      userRequest,
    });
  }
  // 3. Multi-Metric Calculation Request (e.g. Mean, Median and Mode; Variance and Standard Deviation)
  else {
    md = buildMultiMathResponse({
      requestedOperations,
      results,
      targetColumn,
      validCount,
      validCountFormatted,
      dof,
      dofFormatted,
      formatCurrency,
      formatRaw,
      activeOperations,
      userRequest,
    });
  }

  // If a chart was explicitly generated, attach it cleanly
  if (chart && Array.isArray(chart.data) && chart.data.length > 0) {
    md += ` + '`' + `\\n\\n### Visualization\\n\\n\`\`\`json:doera-chart\\n\${JSON.stringify(chart, null, 2)}\\n\`\`\`\\n\\n` + '`' + `;
  }

  return md.trim();
}

/**
 * Clean mathematical answer format for single statistical requests.
 * Hierarchy: Small Title -> Formula -> Actual Substitution -> Final Answer (\\boxed) -> Optional Note.
 */
function buildSingleMathResponse({
  primaryOperation,
  results,
  targetColumn,
  validCount,
  validCountFormatted,
  dof,
  dofFormatted,
  formatCurrency,
  formatRaw,
  activeOperations,
  userRequest,
}) {
  let md = '';

  switch (primaryOperation) {
    case 'MEAN': {
      const mean = results?.mean;
      const totalSum = results?.sum !== undefined && results?.sum !== null
        ? results.sum
        : (mean !== null && mean !== undefined ? mean * validCount : 0);

      md += '**Mean Calculation\\n\\n';
      md += 'Formula:\\n\\n';
      md += '\\\\[\\n\\\\bar{x} = \\\\frac{\\\\sum x_i}{N}\\n\\\\]\\n\\n';
      md += 'Substitute the actual calculated values:\\n\\n';
      md += ` + '`' + `\\\\[\\n\\\\bar{x} = \\\\frac{\${formatRaw(totalSum, 2)}}{\${validCountFormatted}}\\n\\\\]\\n\\n` + '`' + `;
      md += '**Final Answer:**\\n\\n';
      md += ` + '`' + `\\\\[\\n\\\\boxed{\\\\bar{x} = \${formatCurrency(mean)}}\\n\\\\]\\n` + '`' + `;
      break;
    }

    case 'MEDIAN': {
      const median = results?.median;
      md += '**Median Calculation\\n\\n';
      md += 'Method:\\n\\n';
      md += 'The median represents the 50th percentile (central observation in the sorted series).\\n\\n';
      md += 'Calculation:\\n\\n';
      if (validCount % 2 === 0) {
        const mid1 = validCount / 2;
        const mid2 = mid1 + 1;
        md += ` + '`' + `For $N = \${validCountFormatted}$ (even), the median is the average of observations at ranks \${mid1.toLocaleString()} and \${mid2.toLocaleString()}:\\n\\n\\\\[\\n\\\\text{Median} = \\\\frac{x_{(\${mid1.toLocaleString()})} + x_{(\${mid2.toLocaleString()})}}{2}\\n\\\\]\\n\\n` + '`' + `;
      } else {
        const mid = Math.floor(validCount / 2) + 1;
        md += ` + '`' + `For $N = \${validCountFormatted}$ (odd), the median is the observation at rank \${mid.toLocaleString()}:\\n\\n\\\\[\\n\\\\text{Median} = x_{(\${mid.toLocaleString()})}\\n\\\\]\\n\\n` + '`' + `;
      }
      md += '**Final Answer:**\\n\\n';
      md += ` + '`' + `\\\\[\\n\\\\boxed{\\\\text{Median} = \${formatCurrency(median)}}\\n\\\\]\\n` + '`' + `;
      break;
    }

    case 'MODE': {
      const mode = results?.mode;
      md += '**Mode Calculation\\n\\n';
      md += 'Method:\\n\\n';
      md += 'The mode represents the value that occurs with the highest frequency in the dataset.\\n\\n';
      md += 'Calculation:\\n\\n';
      if (mode?.hasMode) {
        const modeVal = Array.isArray(mode.modeValue) ? mode.modeValue.map(m => formatCurrency(m)).join(', ') : formatCurrency(mode.modeValue);
        md += ` + '`' + `The value **\${modeVal}** occurs with the highest frequency (**\${mode.frequency.toLocaleString()}** times).\\n\\n` + '`' + `;
        md += '**Final Answer:**\\n\\n';
        md += ` + '`' + `\\\\[\\n\\\\boxed{\\\\text{Mode} = \${modeVal} \\\\quad (\\\\text{Frequency: } \${mode.frequency.toLocaleString()})}\\n\\\\]\\n` + '`' + `;
      } else {
        md += ` + '`' + `All observations in **\${targetColumn}** appear uniquely without repetition.\\n\\n` + '`' + `;
        md += '**Final Answer:**\\n\\n';
        md += '\\\\[\\n\\\\boxed{\\\\text{Mode} = \\\\text{No Mode}}\\n\\\\]\\n';
      }
      break;
    }

    case 'VARIANCE': {
      const v = results?.variance;
      const popVar = v?.populationVariance;
      const sampleVar = v?.sampleVariance;
      const sumSq = v?.sumSquaredDiff;
      const isPopOnly = activeOperations?.isPopulationVariance && !activeOperations?.isSampleVariance;
      const isSampleOnly = activeOperations?.isSampleVariance && !activeOperations?.isPopulationVariance;

      md += '**Variance Calculation\\n\\n';

      if (!isSampleOnly) {
        md += '**Population variance\\n\\n';
        md += 'Formula:\\n\\n';
        md += '\\\\[\\n\\\\sigma^2 = \\\\frac{\\\\sum (x_i-\\\\mu)^2}{N}\\n\\\\]\\n\\n';
        md += 'Substitute the actual calculated values:\\n\\n';
        md += ` + '`' + `\\\\[\\n\\\\sigma^2 = \\\\frac{\${formatRaw(sumSq, 2)}}{\${validCountFormatted}}\\n\\\\]\\n\\n` + '`' + `;
        md += '**Final Answer:**\\n\\n';
        md += ` + '`' + `\\\\[\\n\\\\boxed{\\\\sigma^2 = \${formatRaw(popVar, 4)}}\\n\\\\]\\n\\n` + '`' + `;
      }

      if (!isPopOnly) {
        md += '**Sample variance\\n\\n';
        md += 'Formula:\\n\\n';
        md += '\\\\[\\ns^2 = \\\\frac{\\\\sum (x_i-\\\\bar{x})^2}{n-1}\\n\\\\]\\n\\n';
        md += 'Substitute the actual values:\\n\\n';
        md += ` + '`' + `\\\\[\\ns^2 = \\\\frac{\${formatRaw(sumSq, 2)}}{\${dofFormatted}}\\n\\\\]\\n\\n` + '`' + `;
        md += '**Final Answer:**\\n\\n';
        md += ` + '`' + `\\\\[\\n\\\\boxed{s^2 = \${formatRaw(sampleVar, 4)}}\\n\\\\]\\n\\n` + '`' + `;
      }

      if (!isPopOnly && !isSampleOnly) {
        md += ` + '`' + `*Note: Population variance divides by $N$ (\${validCountFormatted} observations), while sample variance divides by $n - 1$ (\${dofFormatted} degrees of freedom).*\\n` + '`' + `;
      }
      break;
    }

    case 'STANDARD_DEVIATION': {
      const sd = results?.standardDeviation;
      const popSD = sd?.populationStandardDeviation;
      const sampleSD = sd?.sampleStandardDeviation;
      const popVar = sd?.populationVariance;
      const sampleVar = sd?.sampleVariance;
      const sumSq = sd?.sumSquaredDiff;
      const isPopOnly = activeOperations?.isPopulationStdDev && !activeOperations?.isSampleStdDev;
      const isSampleOnly = activeOperations?.isSampleStdDev && !activeOperations?.isPopulationStdDev;

      md += '**Standard Deviation Calculation\\n\\n';

      if (!isSampleOnly) {
        md += '**Population Standard Deviation\\n\\n';
        md += 'Formula:\\n\\n';
        md += '\\\\[\\n\\\\sigma = \\\\sqrt{\\\\frac{\\\\sum (x_i-\\\\mu)^2}{N}}\\n\\\\]\\n\\n';
        md += 'Substitute the actual calculated values:\\n\\n';
        md += ` + '`' + `\\\\[\\n\\\\sigma = \\\\sqrt{\\\\frac{\${formatRaw(sumSq, 2)}}{\${validCountFormatted}}} = \\\\sqrt{\${formatRaw(popVar, 4)}}\\n\\\\]\\n\\n` + '`' + `;
        md += '**Final Answer:**\\n\\n';
        md += ` + '`' + `\\\\[\\n\\\\boxed{\\\\sigma = \${formatCurrency(popSD)}}\\n\\\\]\\n\\n` + '`' + `;
      }

      if (!isPopOnly) {
        md += '**Sample Standard Deviation\\n\\n';
        md += 'Formula:\\n\\n';
        md += '\\\\[\\ns = \\\\sqrt{\\\\frac{\\\\sum (x_i-\\\\bar{x})^2}{n-1}}\\n\\\\]\\n\\n';
        md += 'Substitute the actual calculated values:\\n\\n';
        md += ` + '`' + `\\\\[\\ns = \\\\sqrt{\\\\frac{\${formatRaw(sumSq, 2)}}{\${dofFormatted}}} = \\\\sqrt{\${formatRaw(sampleVar, 4)}}\\n\\\\]\\n\\n` + '`' + `;
        md += '**Final Answer:**\\n\\n';
        md += ` + '`' + `\\\\[\\n\\\\boxed{s = \${formatCurrency(sampleSD)}}\\n\\\\]\\n\\n` + '`' + `;
      }

      if (!isPopOnly && !isSampleOnly) {
        md += ` + '`' + `*Note: Population standard deviation $\\\\sigma = \${formatCurrency(popSD)}$; Sample standard deviation $s = \${formatCurrency(sampleSD)}$.*\\n` + '`' + `;
      }
      break;
    }

    case 'COEFFICIENT_OF_VARIATION': {
      const cv = results?.coefficientOfVariation;
      const mean = cv?.mean;
      const sampleSD = cv?.sampleStandardDeviation;
      const sampleCV = cv?.sampleCV;
      const popCV = cv?.populationCV;

      md += '**Coefficient of Variation\\n\\n';
      md += 'Formula:\\n\\n';
      md += '\\\\[\\nCV = \\\\frac{s}{\\\\bar{x}} \\\\times 100\\n\\\\]\\n\\n';
      md += 'Substitute actual values:\\n\\n';
      md += ` + '`' + `\\\\[\\nCV = \\\\frac{\${formatRaw(sampleSD, 4)}}{\${formatRaw(mean, 4)}} \\\\times 100\\n\\\\]\\n\\n` + '`' + `;
      md += '**Final Answer:**\\n\\n';
      md += ` + '`' + `\\\\[\\n\\\\boxed{CV = \${sampleCV !== null && sampleCV !== undefined ? \`\${sampleCV.toFixed(2)}\\\%\` : 'Undefined'}}\\n\\\\]\\n\\n` + '`' + `;
      md += ` + '`' + `*Note: Evaluated using sample standard deviation ($s = \${formatCurrency(sampleSD)}$) over sample mean ($\\\\bar{x} = \${formatCurrency(mean)}$). Population CV is \${popCV !== null && popCV !== undefined ? \`\${popCV.toFixed(2)}%\` : 'Undefined'}.*\\n` + '`' + `;
      break;
    }

    case 'RANGE': {
      const r = results?.range;
      md += '**Range Calculation\\n\\n';
      md += 'Formula:\\n\\n';
      md += '\\\\[\\n\\\\text{Range} = x_{\\\\max} - x_{\\\\min}\\n\\\\]\\n\\n';
      md += 'Substitute actual values:\\n\\n';
      md += ` + '`' + `\\\\[\\n\\\\text{Range} = \${formatRaw(r?.max)} - \${formatRaw(r?.min)}\\n\\\\]\\n\\n` + '`' + `;
      md += '**Final Answer:**\\n\\n';
      md += ` + '`' + `\\\\[\\n\\\\boxed{\\\\text{Range} = \${formatCurrency(r?.range)}}\\n\\\\]\\n\\n` + '`' + `;
      md += ` + '`' + `*Note: Minimum observation is \${formatCurrency(r?.min)} and maximum observation is \${formatCurrency(r?.max)}.*\\n` + '`' + `;
      break;
    }

    case 'QUARTILES': {
      const q = results?.quartiles;
      md += '**Quartiles & Interquartile Range (IQR) Calculation\\n\\n';
      md += 'Formula:\\n\\n';
      md += '\\\\[\\n\\\\text{IQR} = Q_3 - Q_1\\n\\\\]\\n\\n';
      md += 'Substitute actual calculated values:\\n\\n';
      md += ` + '`' + `\\\\[\\n\\\\text{IQR} = \${formatRaw(q?.q3)} - \${formatRaw(q?.q1)}\\n\\\\]\\n\\n` + '`' + `;
      md += '**Final Answer:**\\n\\n';
      md += ` + '`' + `\\\\[\\n\\\\boxed{\\\\text{IQR} = \${formatCurrency(q?.iqr)}}\\n\\\\]\\n\\n` + '`' + `;
      md += ` + '`' + `*Note: First Quartile ($Q_1$) is \${formatCurrency(q?.q1)}, Second Quartile ($Q_2$ / Median) is \${formatCurrency(q?.q2)}, and Third Quartile ($Q_3$) is \${formatCurrency(q?.q3)}.*\\n` + '`' + `;
      break;
    }

    case 'OUTLIERS': {
      const o = results?.outliers;
      md += '**Outlier Detection (Tukey IQR Method)\\n\\n';
      md += 'Formulas:\\n\\n';
      md += '\\\\[\\n\\\\text{Lower Bound} = Q_1 - 1.5 \\\\times \\\\text{IQR}\\n\\\\]\\n';
      md += '\\\\[\\n\\\\text{Upper Bound} = Q_3 + 1.5 \\\\times \\\\text{IQR}\\n\\\\]\\n\\n';
      md += 'Substitute actual calculated values:\\n\\n';
      md += ` + '`' + `\\\\[\\n\\\\text{Lower Bound} = \${formatRaw(o?.q1)} - 1.5(\${formatRaw(o?.iqr)}) = \${formatRaw(o?.lowerBound)}\\n\\\\]\\n` + '`' + `;
      md += ` + '`' + `\\\\[\\n\\\\text{Upper Bound} = \${formatRaw(o?.q3)} + 1.5(\${formatRaw(o?.iqr)}) = \${formatRaw(o?.upperBound)}\\n\\\\]\\n\\n` + '`' + `;
      md += '**Final Answer:**\\n\\n';
      md += ` + '`' + `\\\\[\\n\\\\boxed{\\\\text{Outliers Identified} = \${o?.outlierCount.toLocaleString()} \\\\quad (\${o?.outlierPercentage}\\\%)}\\n\\\\]\\n\\n` + '`' + `;
      md += ` + '`' + `*Note: \${o?.outlierCount === 0 ? \`All \${validCountFormatted} observations reside strictly within the theoretical envelope [\${formatCurrency(o?.lowerBound)}, \${formatCurrency(o?.upperBound)}].\` : \`Identified \${o?.outlierCount.toLocaleString()} observations beyond the boundaries.\`}*\\n` + '`' + `;
      break;
    }

    case 'SKEWNESS': {
      const dist = results?.distribution;
      md += '**Skewness Calculation\\n\\n';
      md += 'Formula (Sample Skewness $G_1$):\\n\\n';
      md += '\\\\[\\nG_1 = \\\\frac{n}{(n-1)(n-2)} \\\\sum_{i=1}^{n} \\\\left(\\\\frac{x_i - \\\\bar{x}}{s}\\\\right)^3\\n\\\\]\\n\\n';
      md += 'Substitute actual calculated values:\\n\\n';
      md += ` + '`' + `\\\\[\\nG_1 = \${formatRaw(dist?.sampleSkewness, 4)}\\n\\\\]\\n\\n` + '`' + `;
      md += '**Final Answer:**\\n\\n';
      md += ` + '`' + `\\\\[\\n\\\\boxed{G_1 = \${formatRaw(dist?.sampleSkewness, 4)}}\\n\\\\]\\n\\n` + '`' + `;
      md += ` + '`' + `*Interpretation: The distribution is \${dist?.skewnessDescription?.toLowerCase() || 'approximately symmetric'} ($|G_1| < 0.5$).*\\n` + '`' + `;
      break;
    }

    case 'KURTOSIS': {
      const dist = results?.distribution;
      md += '**Kurtosis Calculation\\n\\n';
      md += 'Formula (Sample Excess Kurtosis $G_2$):\\n\\n';
      md += '\\\\[\\nG_2 = \\\\frac{n(n+1)}{(n-1)(n-2)(n-3)} \\\\sum_{i=1}^{n} \\\\left(\\\\frac{x_i - \\\\bar{x}}{s}\\\\right)^4 - \\\\frac{3(n-1)^2}{(n-2)(n-3)}\\n\\\\]\\n\\n';
      md += 'Substitute actual calculated values:\\n\\n';
      md += ` + '`' + `\\\\[\\nG_2 = \${formatRaw(dist?.sampleExcessKurtosis, 4)}\\n\\\\]\\n\\n` + '`' + `;
      md += '**Final Answer:**\\n\\n';
      md += ` + '`' + `\\\\[\\n\\\\boxed{G_2 = \${formatRaw(dist?.sampleExcessKurtosis, 4)}}\\n\\\\]\\n\\n` + '`' + `;
      md += ` + '`' + `*Interpretation: Platykurtic distribution (\${dist?.kurtosisDescription?.toLowerCase() || 'uniform distribution characteristics'}).*\\n` + '`' + `;
      break;
    }

    case 'CORRELATION': {
      const corr = results?.correlation;
      if (corr && corr.pearson) {
        md += ` + '`' + `**Correlation Calculation: \${corr.colA} vs \${corr.colB}**\\n\\n` + '`' + `;
        md += 'Formula (Pearson Correlation Coefficient $r$):\\n\\n';
        md += '\\\\[\\nr = \\\\frac{\\\\sum (x_i - \\\\bar{x})(y_i - \\\\bar{y})}{\\\\sqrt{\\\\sum (x_i - \\\\bar{x})^2 \\\\sum (y_i - \\\\bar{y})^2}}\\n\\\\]\\n\\n';
        md += 'Substitute actual calculated values:\\n\\n';
        md += ` + '`' + `\\\\[\\nr = \${formatRaw(corr.pearson.pearsonR, 4)}\\n\\\\]\\n\\n` + '`' + `;
        md += '**Final Answer:**\\n\\n';
        md += ` + '`' + `\\\\[\\n\\\\boxed{r = \${formatRaw(corr.pearson.pearsonR, 4)}}\\n\\\\]\\n\\n` + '`' + `;
        md += ` + '`' + `*Note: Pearson $r = \${corr.pearson.pearsonR}$ across \${corr.pearson.n.toLocaleString()} paired observations indicates \${corr.pearson.relationshipSummary}. Correlation measures linear association and does NOT imply causation.*\\n` + '`' + `;
      } else {
        md += '**Correlation Calculation\\n\\nUnable to compute correlation: two distinct numeric variables with paired observations could not be identified.\\n';
      }
      break;
    }

    case 'COMPARE_METRICS': {
      const sd = results?.standardDeviation;
      const cv = results?.coefficientOfVariation;
      const mean = results?.mean;
      md += '**Metric Comparison: Standard Deviation vs. Coefficient of Variation\\n\\n';
      md += ` + '`' + `- **Arithmetic Mean ($\\\\bar{x}$)**: \${formatCurrency(mean)}\\n` + '`' + `;
      md += ` + '`' + `- **Sample Standard Deviation ($s$)**: \${formatCurrency(sd?.sampleStandardDeviation)} (Absolute Dispersion)\\n` + '`' + `;
      md += ` + '`' + `- **Sample Coefficient of Variation ($CV$)**: \${cv?.sampleCV !== null && cv?.sampleCV !== undefined ? \`\${cv.sampleCV.toFixed(2)}%\` : 'Undefined'} (Relative Dispersion)\\n\\n` + '`' + `;
      md += '**Final Answer:**\\n\\n';
      md += ` + '`' + `\\\\[\\n\\\\boxed{s = \${formatCurrency(sd?.sampleStandardDeviation)} \\\\quad | \\\\quad CV = \${cv?.sampleCV?.toFixed(2)}\\\%}\\n\\\\]\\n` + '`' + `;
      break;
    }

    default:
      md += '**Calculation Results\\n\\nOperation completed successfully.\\n';
      break;
  }

  return md.trim();
}

/**
 * Clean mathematical answer format for multi-metric requests (e.g. Mean, Median and Mode).
 * Displays ONLY the requested metrics in clean sequence with Formula, Substitution, and Final Answer.
 */
function buildMultiMathResponse({
  requestedOperations,
  results,
  targetColumn,
  validCount,
  validCountFormatted,
  dof,
  dofFormatted,
  formatCurrency,
  formatRaw,
  activeOperations,
  userRequest,
}) {
  const allowlist = new Set(requestedOperations);
  let md = '**Statistical Calculations\\n\\n';
  let step = 1;

  if (allowlist.has('mean')) {
    const mean = results?.mean;
    const totalSum = results?.sum !== undefined && results?.sum !== null
      ? results.sum
      : (mean !== null && mean !== undefined ? mean * validCount : 0);

    md += ` + '`' + `**\${step}. Mean**\\n\\n` + '`' + `;
    md += 'Formula:\\n\\n';
    md += '\\\\[\\n\\\\bar{x} = \\\\frac{\\\\sum x_i}{N}\\n\\\\]\\n\\n';
    md += 'Substitute the actual calculated values:\\n\\n';
    md += ` + '`' + `\\\\[\\n\\\\bar{x} = \\\\frac{\${formatRaw(totalSum, 2)}}{\${validCountFormatted}}\\n\\\\]\\n\\n` + '`' + `;
    md += '**Final Answer:**\\n\\n';
    md += ` + '`' + `\\\\[\\n\\\\boxed{\\\\bar{x} = \${formatCurrency(mean)}}\\n\\\\]\\n\\n` + '`' + `;
    step++;
  }

  if (allowlist.has('median')) {
    const median = results?.median;
    md += ` + '`' + `**\${step}. Median**\\n\\n` + '`' + `;
    md += 'Method:\\n\\n';
    md += 'The median represents the 50th percentile (central observation in sorted series).\\n\\n';
    md += 'Calculation:\\n\\n';
    if (validCount % 2 === 0) {
      const mid1 = validCount / 2;
      const mid2 = mid1 + 1;
      md += ` + '`' + `For $N = \${validCountFormatted}$, the median is the midpoint between observations at ranks \${mid1.toLocaleString()} and \${mid2.toLocaleString()}:\\n\\n\\\\[\\n\\\\text{Median} = \\\\frac{x_{(\${mid1.toLocaleString()})} + x_{(\${mid2.toLocaleString()})}}{2}\\n\\\\]\\n\\n` + '`' + `;
    } else {
      const mid = Math.floor(validCount / 2) + 1;
      md += ` + '`' + `For $N = \${validCountFormatted}$, the median is the observation at rank \${mid.toLocaleString()}:\\n\\n\\\\[\\n\\\\text{Median} = x_{(\${mid.toLocaleString()})}\\n\\\\]\\n\\n` + '`' + `;
    }
    md += '**Final Answer:**\\n\\n';
    md += ` + '`' + `\\\\[\\n\\\\boxed{\\\\text{Median} = \${formatCurrency(median)}}\\n\\\\]\\n\\n` + '`' + `;
    step++;
  }

  if (allowlist.has('mode')) {
    const mode = results?.mode;
    md += ` + '`' + `**\${step}. Mode**\\n\\n` + '`' + `;
    md += 'Method:\\n\\n';
    md += 'Frequency-based calculation identifying the value occurring with highest repetition.\\n\\n';
    md += 'Calculation:\\n\\n';
    if (mode?.hasMode) {
      const modeVal = Array.isArray(mode.modeValue) ? mode.modeValue.map(m => formatCurrency(m)).join(', ') : formatCurrency(mode.modeValue);
      md += ` + '`' + `The value **\${modeVal}** occurs with the highest frequency (**\${mode.frequency.toLocaleString()}** times).\\n\\n` + '`' + `;
      md += '**Final Answer:**\\n\\n';
      md += ` + '`' + `\\\\[\\n\\\\boxed{\\\\text{Mode} = \${modeVal} \\\\quad (\\\\text{Frequency: } \${mode.frequency.toLocaleString()})}\\n\\\\]\\n\\n` + '`' + `;
    } else {
      md += 'All observations occur uniquely without repetition.\\n\\n';
      md += '**Final Answer:**\\n\\n';
      md += '\\\\[\\n\\\\boxed{\\\\text{Mode} = \\\\text{No Mode}}\\n\\\\]\\n\\n';
    }
    step++;
  }

  if (allowlist.has('variance') || allowlist.has('population_variance') || allowlist.has('sample_variance')) {
    const v = results?.variance;
    const popVar = v?.populationVariance;
    const sampleVar = v?.sampleVariance;
    const sumSq = v?.sumSquaredDiff;

    md += ` + '`' + `**\${step}. Variance**\\n\\n` + '`' + `;
    md += 'Formula & Substitution:\\n\\n';
    md += ` + '`' + `\\\\[\\n\\\\sigma^2 = \\\\frac{\\\\sum (x_i-\\\\mu)^2}{N} = \\\\frac{\${formatRaw(sumSq, 2)}}{\${validCountFormatted}}\\n\\\\]\\n` + '`' + `;
    md += ` + '`' + `\\\\[\\ns^2 = \\\\frac{\\\\sum (x_i-\\\\bar{x})^2}{n-1} = \\\\frac{\${formatRaw(sumSq, 2)}}{\${dofFormatted}}\\n\\\\]\\n\\n` + '`' + `;
    md += '**Final Answer:**\\n\\n';
    md += ` + '`' + `\\\\[\\n\\\\boxed{\\\\sigma^2 = \${formatRaw(popVar, 4)} \\\\quad | \\\\quad s^2 = \${formatRaw(sampleVar, 4)}}\\n\\\\]\\n\\n` + '`' + `;
    step++;
  }

  if (allowlist.has('standard_deviation') || allowlist.has('population_standard_deviation') || allowlist.has('sample_standard_deviation')) {
    const sd = results?.standardDeviation;
    const popSD = sd?.populationStandardDeviation;
    const sampleSD = sd?.sampleStandardDeviation;

    md += ` + '`' + `**\${step}. Standard Deviation**\\n\\n` + '`' + `;
    md += 'Formula & Substitution:\\n\\n';
    md += ` + '`' + `\\\\[\\n\\\\sigma = \\\\sqrt{\\\\sigma^2} = \\\\sqrt{\${formatRaw(sd?.populationVariance, 4)}}\\n\\\\]\\n` + '`' + `;
    md += ` + '`' + `\\\\[\\ns = \\\\sqrt{s^2} = \\\\sqrt{\${formatRaw(sd?.sampleVariance, 4)}}\\n\\\\]\\n\\n` + '`' + `;
    md += '**Final Answer:**\\n\\n';
    md += ` + '`' + `\\\\[\\n\\\\boxed{\\\\sigma = \${formatCurrency(popSD)} \\\\quad | \\\\quad s = \${formatCurrency(sampleSD)}}\\n\\\\]\\n\\n` + '`' + `;
    step++;
  }

  if (allowlist.has('coefficient_of_variation')) {
    const cv = results?.coefficientOfVariation;
    md += ` + '`' + `**\${step}. Coefficient of Variation**\\n\\n` + '`' + `;
    md += 'Formula & Substitution:\\n\\n';
    md += ` + '`' + `\\\\[\\nCV = \\\\frac{s}{\\\\bar{x}} \\\\times 100 = \\\\frac{\${formatRaw(cv?.sampleStandardDeviation, 4)}}{\${formatRaw(cv?.mean, 4)}} \\\\times 100\\n\\\\]\\n\\n` + '`' + `;
    md += '**Final Answer:**\\n\\n';
    md += ` + '`' + `\\\\[\\n\\\\boxed{CV = \${cv?.sampleCV !== null && cv?.sampleCV !== undefined ? \`\${cv.sampleCV.toFixed(2)}\\\%\` : 'Undefined'}}\\n\\\\]\\n\\n` + '`' + `;
    step++;
  }

  if (allowlist.has('range') || allowlist.has('min') || allowlist.has('max')) {
    const r = results?.range;
    md += ` + '`' + `**\${step}. Range**\\n\\n` + '`' + `;
    md += 'Formula:\\n\\n';
    md += ` + '`' + `\\\\[\\n\\\\text{Range} = x_{\\\\max} - x_{\\\\min} = \${formatRaw(r?.max)} - \${formatRaw(r?.min)}\\n\\\\]\\n\\n` + '`' + `;
    md += '**Final Answer:**\\n\\n';
    md += ` + '`' + `\\\\[\\n\\\\boxed{\\\\text{Range} = \${formatCurrency(r?.range)}}\\n\\\\]\\n\\n` + '`' + `;
    step++;
  }

  if (allowlist.has('q1') || allowlist.has('q3') || allowlist.has('quartiles') || allowlist.has('iqr')) {
    const q = results?.quartiles;
    md += ` + '`' + `**\${step}. Quartiles & Interquartile Range**\\n\\n` + '`' + `;
    md += ` + '`' + `- First Quartile ($Q_1$): **\${formatCurrency(q?.q1)}**\\n` + '`' + `;
    md += ` + '`' + `- Third Quartile ($Q_3$): **\${formatCurrency(q?.q3)}**\\n` + '`' + `;
    md += ` + '`' + `- Interquartile Range ($\\\\text{IQR} = Q_3 - Q_1$): **\${formatCurrency(q?.iqr)}**\\n\\n` + '`' + `;
    md += '**Final Answer:**\\n\\n';
    md += ` + '`' + `\\\\[\\n\\\\boxed{Q_1 = \${formatCurrency(q?.q1)} \\\\quad | \\\\quad Q_3 = \${formatCurrency(q?.q3)} \\\\quad | \\\\quad \\\\text{IQR} = \${formatCurrency(q?.iqr)}}\\n\\\\]\\n\\n` + '`' + `;
    step++;
  }

  if (allowlist.has('skewness')) {
    const dist = results?.distribution;
    md += ` + '`' + `**\${step}. Skewness**\\n\\n` + '`' + `;
    md += ` + '`' + `\\\\[\\nG_1 = \${formatRaw(dist?.sampleSkewness, 4)}\\n\\\\]\\n\\n` + '`' + `;
    md += '**Final Answer:**\\n\\n';
    md += ` + '`' + `\\\\[\\n\\\\boxed{G_1 = \${formatRaw(dist?.sampleSkewness, 4)}}\\n\\\\]\\n\\n` + '`' + `;
    step++;
  }

  if (allowlist.has('kurtosis')) {
    const dist = results?.distribution;
    md += ` + '`' + `**\${step}. Kurtosis**\\n\\n` + '`' + `;
    md += ` + '`' + `\\\\[\\nG_2 = \${formatRaw(dist?.sampleExcessKurtosis, 4)}\\n\\\\]\\n\\n` + '`' + `;
    md += '**Final Answer:**\\n\\n';
    md += ` + '`' + `\\\\[\\n\\\\boxed{G_2 = \${formatRaw(dist?.sampleExcessKurtosis, 4)}}\\n\\\\]\\n\\n` + '`' + `;
    step++;
  }

  return md.trim();
}

/**
 * Full Comprehensive Statistical Report (strictly for full summary requests)
 */
function buildFullStatisticalReport(statResult, formatCurrency, formatRaw) {
  const {
    dataset = 'dataset.xlsx',
    sheetName = 'Sheet1',
    targetColumn = 'Amount',
    seriesMetadata,
    results,
  } = statResult;

  const validCount = seriesMetadata?.validCount || 0;
  const completeness = seriesMetadata?.completeness || 100;
  const cv = results?.coefficientOfVariation;
  const sd = results?.standardDeviation;
  const v = results?.variance;
  const q = results?.quartiles;
  const r = results?.range;
  const dist = results?.distribution;
  const mode = results?.mode;

  let md = '## Complete Statistical Analysis Report\\n\\n';
  md += ` + '`' + `- **Dataset**: \\\`\${dataset}\\\`\\n` + '`' + `;
  md += ` + '`' + `- **Worksheet**: \\\`\${sheetName}\\\`\\n` + '`' + `;
  md += ` + '`' + `- **Analyzed Column**: **\${targetColumn}**\\n` + '`' + `;
  md += ` + '`' + `- **Valid Observations**: **\${validCount.toLocaleString()}** (\${completeness}% completeness)\\n\\n` + '`' + `;

  const tableRows = [
    { measure: 'Mean', value: formatCurrency(results?.mean), def: '$\\\\sum x_i / N$' },
    { measure: 'Median', value: formatCurrency(results?.median), def: 'Central sorted observation (50th %ile)' },
    {
      measure: 'Mode',
      value: mode?.hasMode ? (Array.isArray(mode.modeValue) ? mode.modeValue.map(m => formatCurrency(m)).join(', ') : formatCurrency(mode.modeValue)) : 'No Mode',
      def: mode?.hasMode ? ` + '`' + `Frequency: \${mode.frequency.toLocaleString()}` + '`' + ` : 'Unique values',
    },
    { measure: 'Population Variance ($\\\\sigma^2$)', value: formatRaw(v?.populationVariance, 4), def: ` + '`' + `Denominator $N = \${validCount.toLocaleString()}$` + '`' + ` },
    { measure: 'Sample Variance ($s^2$)', value: formatRaw(v?.sampleVariance, 4), def: ` + '`' + `Denominator $n - 1 = \${(Math.max(validCount - 1, 1)).toLocaleString()}$` + '`' + ` },
    { measure: 'Population Standard Deviation ($\\\\sigma$)', value: formatCurrency(sd?.populationStandardDeviation), def: '$\\\\sqrt{\\\\sigma^2}$' },
    { measure: 'Sample Standard Deviation ($s$)', value: formatCurrency(sd?.sampleStandardDeviation), def: '$\\\\sqrt{s^2}$' },
    { measure: 'Population Coefficient of Variation', value: ` + '`' + `\${cv?.populationCV?.toFixed(2)}%` + '`' + `, def: '$(\\\\sigma / \\\\mu) \\\\times 100$' },
    { measure: 'Sample Coefficient of Variation', value: ` + '`' + `\${cv?.sampleCV?.toFixed(2)}%` + '`' + `, def: '$(s / \\\\bar{x}) \\\\times 100$' },
    { measure: 'Minimum', value: formatCurrency(r?.min), def: 'Lowest observation' },
    { measure: 'First Quartile (Q1 / 25th %ile)', value: formatCurrency(q?.q1), def: '25th percentile' },
    { measure: 'Third Quartile (Q3 / 75th %ile)', value: formatCurrency(q?.q3), def: '75th percentile' },
    { measure: 'Maximum', value: formatCurrency(r?.max), def: 'Highest observation' },
    { measure: 'Range (Spread)', value: formatCurrency(r?.range), def: '$x_{\\\\max} - x_{\\\\min}$' },
    { measure: 'Interquartile Range (IQR)', value: formatCurrency(q?.iqr), def: '$Q_3 - Q_1$' },
    { measure: 'Sample Skewness ($G_1$)', value: formatRaw(dist?.sampleSkewness, 4), def: dist?.skewnessDescription },
    { measure: 'Sample Excess Kurtosis ($G_2$)', value: formatRaw(dist?.sampleExcessKurtosis, 4), def: dist?.kurtosisDescription },
  ];

  md += '| Statistical Measure | Calculated Value | Definition / Convention |\\n';
  md += '| :--- | :--- | :--- |\\n';
  for (const row of tableRows) {
    md += ` + '`' + `| **\${row.measure}** | **\${row.value}** | \${row.def} |\\n` + '`' + `;
  }
  md += '\\n';

  return md.trim();
}

`;

const updatedContent = content.substring(0, startIndex) + b + content.substring(endIndex);
fs.writeFileSync(filePath, updatedContent, 'utf8');
console.log('Successfully fixed slashes in universalResponseBuilder.js!');
