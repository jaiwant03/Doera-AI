import React from 'react';
import ReactDOMServer from 'react-dom/server';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

function cleanMathBlock(formula) {
  if (!formula || typeof formula !== 'string') return '';
  let clean = formula.replace(/\\n/g, '\n').trim();
  clean = clean.replace(/(^|[^\\])\$/g, '$1\\$');
  clean = clean.replace(/(^|[^\\])%/g, '$1\\%');
  return clean;
}

function normalizeMathDelimiters(text) {
  if (!text || typeof text !== 'string') return text;
  let normalized = text.replace(/\\\\(frac|sum|sigma|mu|bar|sqrt|text|boxed|times|le|ge|alpha|beta|theta|cdot|approx|left|right|quad)/g, '\\$1');
  normalized = normalized.replace(/\\\[([\s\S]*?)\\\]/g, (match, formula) => {
    return '\n\n$$\n' + cleanMathBlock(formula) + '\n$$\n\n';
  });
  normalized = normalized.replace(/\$\$([\s\S]*?)\$\$/g, (match, formula) => {
    return '\n\n$$\n' + cleanMathBlock(formula) + '\n$$\n\n';
  });
  normalized = normalized.replace(/\\\(([\s\S]*?)\\\)/g, (match, formula) => {
    let clean = formula.replace(/\\n/g, ' ').trim();
    return '$' + clean + '$';
  });
  normalized = normalized.replace(/\n{3,}/g, '\n\n');
  return normalized;
}

const testCases = [
  { name: 'Mean Boxed', text: '**Final Answer:**\n\n\\[\n\\boxed{\\bar{x} = $2,510.35}\n\\]' },
  { name: 'Median Boxed', text: '**Final Answer:**\n\n\\[\n\\boxed{\\text{Median} = $2,518.89}\n\\]' },
  { name: 'Mode Boxed', text: '**Final Answer:**\n\n\\[\n\\boxed{\\text{Mode} = $1,678.97 \\quad (\\text{Frequency: } 5)}\n\\]' },
  { name: 'Range Calculation & Boxed (User Screenshot)', text: '\\[\n\\text{Range} = x_{\\max} - x_{\\min} = 4,999.89 - 10.02\n\\]\n\n**Final Answer:**\n\n\\[\n\\boxed{\\text{Range} = $4,989.87}\n\\]' },
  { name: 'Population Variance', text: '**Final Answer:**\n\n\\[\n\\boxed{\\sigma^2 = 2,076,422.7042}\n\\]' },
  { name: 'Standard Deviation', text: '**Final Answer:**\n\n\\[\n\\boxed{\\sigma = $1,440.98}\n\\]' },
  { name: 'Coefficient of Variation', text: '**Final Answer:**\n\n\\[\n\\boxed{CV = 57.40\\%}\n\\]' },
  { name: 'Covariance', text: '**Final Answer:**\n\n\\[\n\\boxed{\\text{Cov}(\\text{Amount}, \\text{Day}) = -1,234.5678 \\quad | \\quad s_{xy} = -1,234.5798}\n\\]' },
  { name: 'Inline Math', text: 'Where \\(\\bar{x}\\) is the sample mean.' },
  { name: 'Standard $$ block with $', text: '$$\n\\boxed{\\text{Range} = $4,989.87}\n$$' }
];

let allPassed = true;
for (const tc of testCases) {
  const normalized = normalizeMathDelimiters(tc.text);
  const html = ReactDOMServer.renderToString(
    React.createElement(ReactMarkdown, {
      remarkPlugins: [remarkMath],
      rehypePlugins: [[rehypeKatex, { throwOnError: false, strict: false }]]
    }, normalized)
  );

  const hasError = html.includes('katex-error');
  const hasDisplay = tc.name.includes('Inline') ? true : html.includes('katex-display');
  if (hasError || !hasDisplay) {
    allPassed = false;
    console.error(`✗ FAIL: ${tc.name} (hasError: ${hasError}, hasDisplay: ${hasDisplay})`);
  } else {
    console.log(`✓ PASS: ${tc.name}`);
  }
}

if (allPassed) {
  console.log('\n>>> ALL 10 MATH RENDERING TEST CASES PASSED 100%! <<<');
} else {
  process.exit(1);
}
