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

const badMath = `
Here is a broken formula:

\\[
\\frac{1}{
\\]
`;

try {
  const html = ReactDOMServer.renderToStaticMarkup(
    React.createElement(ReactMarkdown, {
      remarkPlugins: [remarkGfm, remarkMath],
      rehypePlugins: [rehypeRaw, [rehypeKatex, { throwOnError: false }]],
      children: normalizeMathDelimiters(badMath)
    })
  );
  console.log("Rendered with throwOnError: false without throwing!");
  console.log("Output has katex error span:", html.includes("katex-error"));
} catch (e) {
  console.error("Threw error:", e.message);
}
