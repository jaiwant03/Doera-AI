import React, { useState, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import { Copy, Check, Download } from 'lucide-react';

/**
 * Cleans a LaTeX formula body, ensuring unescaped currency symbols ($) are escaped as (\$)
 * so KaTeX does not fail with parse errors.
 */
function cleanMathBlock(formula) {
  if (!formula || typeof formula !== 'string') return '';
  let clean = formula.replace(/\\n/g, '\n').trim();
  // Escape unescaped dollar signs inside math mode so KaTeX parses without error
  clean = clean.replace(/(^|[^\\])\$/g, (m, p1) => (p1 || '') + '\\$');
  // Escape unescaped percent signs inside math mode so KaTeX does not treat them as LaTeX comments
  clean = clean.replace(/(^|[^\\])%/g, (m, p1) => (p1 || '') + '\\%');
  return clean;
}

/**
 * Normalizes mathematical delimiters so KaTeX renders inline and block formulas seamlessly.
 * - Converts \[ ... \] to block math $$ ... $$
 * - Converts \( ... \) to inline math $ ... $
 * - Resolves double-escaped backslashes in LaTeX macros
 * - Safely escapes unescaped currency symbols ($) and % inside math blocks
 * - Automatically wraps standalone \boxed{...} expressions
 */
function normalizeMathDelimiters(text) {
  if (!text || typeof text !== 'string') return text;

  // 1. Resolve double-escaped backslashes for common LaTeX commands
  let normalized = text.replace(/\\\\(frac|sum|sigma|mu|bar|sqrt|text|boxed|times|le|ge|alpha|beta|theta|cdot|approx|left|right|quad)/g, '\\$1');

  // 2. Normalize existing $$ ... $$ blocks to escape unescaped $ and % inside
  normalized = normalized.replace(/\$\$([\s\S]*?)\$\$/g, (match, formula) => {
    return `\n\n$$\n${cleanMathBlock(formula)}\n$$\n\n`;
  });

  // 3. Convert LaTeX block math \[ ... \] to \n\n$$\n...\n$$\n\n
  normalized = normalized.replace(/\\\[([\s\S]*?)\\\]/g, (match, formula) => {
    return `\n\n$$\n${cleanMathBlock(formula)}\n$$\n\n`;
  });

  // 4. Convert LaTeX inline math \( ... \) to $ ... $
  normalized = normalized.replace(/\\\(([\s\S]*?)\\\)/g, (match, formula) => {
    return `$${cleanMathBlock(formula).replace(/\n+/g, ' ')}$`;
  });

  // 5. Detect any standalone \boxed{...} that wasn't already wrapped in $$ or $
  normalized = normalized.replace(/(^|[^\$])(\s*\\boxed\{[\s\S]*?\}\s*)(?!\$)/g, (match, prefix, boxed) => {
    return `${prefix}\n\n$$\n${cleanMathBlock(boxed)}\n$$\n\n`;
  });

  // 6. Clean excessive blank lines around math blocks
  normalized = normalized.replace(/\n{3,}/g, '\n\n');

  return normalized;
}

const CodeBlock = ({ children, className, ...props }) => {
  const [copied, setCopied] = useState(false);
  const match = /language-(\w+)/.exec(className || '');
  const lang = match ? match[1] : '';
  const codeString = String(children).replace(/\n$/, '');

  const copyCode = () => {
    navigator.clipboard.writeText(codeString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadCode = () => {
    const ext =
      lang === 'javascript' || lang === 'js'
        ? 'js'
        : lang === 'python' || lang === 'py'
        ? 'py'
        : lang === 'json'
        ? 'json'
        : lang === 'html'
        ? 'html'
        : lang === 'css'
        ? 'css'
        : 'txt';
    const blob = new Blob([codeString], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `doera-snippet.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!className && !codeString.includes('\n')) {
    return <code className="doera-inline-code" {...props}>{children}</code>;
  }

  return (
    <div className="doera-code-wrapper">
      <div className="doera-code-header">
        <span className="doera-code-lang">{lang || 'CODE'}</span>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            onClick={downloadCode}
            className="doera-code-action-btn"
            title="Download code"
          >
            <Download size={12} />
            <span>Download</span>
          </button>
          <button
            type="button"
            onClick={copyCode}
            className="doera-code-action-btn"
            title="Copy code"
          >
            {copied ? <Check size={12} style={{ color: '#10B981' }} /> : <Copy size={12} />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
        </div>
      </div>
      <pre className="doera-code-pre">
        <code className={className} {...props}>
          {children}
        </code>
      </pre>
    </div>
  );
};

const MarkdownRenderer = ({ content, isStreaming = false }) => {
  if (!content) return null;

  const normalizedContent = useMemo(() => {
    try {
      return normalizeMathDelimiters(content);
    } catch {
      return content;
    }
  }, [content]);

  return (
    <div className="doera-markdown-body">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeRaw, [rehypeKatex, { throwOnError: false, strict: false }]]}
        components={{
          code: CodeBlock,
          table: ({ children, ...props }) => (
            <div className="doera-table-wrap">
              <table className="doera-prose-table" {...props}>
                {children}
              </table>
            </div>
          ),
          h1: ({ children, ...props }) => (
            <h1 className="doera-prose-h1" {...props}>
              {children}
            </h1>
          ),
          h2: ({ children, ...props }) => (
            <h2 className="doera-prose-h2" {...props}>
              {children}
            </h2>
          ),
          h3: ({ children, ...props }) => (
            <h3 className="doera-prose-h3" {...props}>
              {children}
            </h3>
          ),
          h4: ({ children, ...props }) => (
            <h4 className="doera-prose-h4" {...props}>
              {children}
            </h4>
          ),
          p: ({ children, ...props }) => (
            <p className="doera-prose-p" {...props}>
              {children}
            </p>
          ),
          ul: ({ children, ...props }) => (
            <ul className="doera-prose-list" {...props}>
              {children}
            </ul>
          ),
          ol: ({ children, ...props }) => (
            <ol className="doera-prose-list" {...props}>
              {children}
            </ol>
          ),
          blockquote: ({ children, ...props }) => (
            <blockquote className="doera-prose-blockquote" {...props}>
              {children}
            </blockquote>
          ),
          hr: ({ ...props }) => <hr className="doera-prose-hr" {...props} />,
          a: ({ href, children, ...props }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="doera-inline-link"
              {...props}
            >
              {children}
            </a>
          ),
          strong: ({ children, ...props }) => (
            <strong className="doera-inline-bold" {...props}>
              {children}
            </strong>
          ),
          em: ({ children, ...props }) => (
            <em className="doera-inline-italic" {...props}>
              {children}
            </em>
          ),
        }}
      >
        {normalizedContent}
      </ReactMarkdown>
      {isStreaming && <span className="doera-streaming-cursor">▌</span>}
    </div>
  );
};

export default MarkdownRenderer;
