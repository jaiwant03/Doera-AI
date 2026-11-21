import React from "react";
import ReactDOMServer from "react-dom/server";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import rehypeRaw from "rehype-raw";

function normalizeMathDelimiters(text) {
  if (!text || typeof text !== 'string') return text;

  // Convert block math \[ ... \] to \n\n$$ ... $$\n\n
  let normalized = text.replace(/\\\[([\s\S]*?)\\\]/g, (match, formula) => {
    return `\n\n$$\n${formula.trim()}\n$$\n\n`;
  });

  // Convert inline math \( ... \) to $ ... $
  normalized = normalized.replace(/\\\(([\s\S]*?)\\\)/g, (match, formula) => {
    return `$${formula.trim()}$`;
  });

  return normalized;
}

const rawText = `
Formula:

\\[
\\sigma^2 = \\frac{\\sum (x_i-\\mu)^2}{N}
\\]

Inline \\(x_i\\) and boxed answer:

\\[
\\boxed{\\sigma^2 = 2,076,422.7042}
\\]
`;

const processed = normalizeMathDelimiters(rawText);

const html = ReactDOMServer.renderToStaticMarkup(
  React.createElement(ReactMarkdown, {
    remarkPlugins: [remarkGfm, remarkMath],
    rehypePlugins: [rehypeRaw, rehypeKatex],
    children: processed
  })
);

console.log("KaTeX rendered:", html.includes("katex"));
console.log("Boxed rendered:", html.includes("boxed"));
console.log("Sample KaTeX HTML:\n", html.substring(html.indexOf('<span class="katex">'), html.indexOf('<span class="katex">') + 300));
