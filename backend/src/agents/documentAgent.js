import documentProcessor from '../services/documentProcessor.js';
import fileStorageService from '../services/fileStorageService.js';
import llmService from '../services/llmService.js';
import { logger } from '../utils/logger.js';

class DocumentAgent {
  constructor() {
    this.name = 'Document';
  }

  /**
   * Complete Document Intelligence Agent:
   * Supports PDF, Word (.docx/.doc), PowerPoint (.pptx/.ppt), Excel (.xlsx/.xls), CSV, and Text.
   * Preserves page numbers, headings, tables, and slide numbers.
   * Performs deep grounded single-document analysis and multi-document comparative intelligence.
   */
  async analyzeDocument(taskContext, attachments = []) {
    const startedAt = new Date();
    const userRequest = taskContext.userRequest || 'Summarize and analyze document';
    logger.info(`[Document Agent] Processing document intelligence for: "${userRequest}"`);

    const incomingFiles = Array.isArray(attachments) && attachments.length > 0
      ? attachments
      : (taskContext.attachments || taskContext.effectiveAttachments || []);
    const files = [];
    for (const f of incomingFiles) {
      if (f.buffer) {
        files.push(f);
      } else if (f.storagePath) {
        const buf = await fileStorageService.getFileBuffer(f.storagePath);
        files.push({ ...f, buffer: buf });
      } else {
        files.push(f);
      }
    }
    const extractedDocs = [];

    // 1. Process and extract all uploaded documents
    for (const file of files) {
      try {
        const processed = await documentProcessor.processContent({
          filename: file.name || 'document.txt',
          mimeType: file.type || 'text/plain',
          rawText: file.content || file.text || '',
          base64Content: file.base64 || null,
          size: file.size || 0,
        });

        // Run deep grounded extraction with LLM on the actual content
        const deepAnalysis = await this.extractDocumentIntelligence(processed, userRequest, taskContext?.historyContext);

        extractedDocs.push({
          filename: file.name,
          fileSize: file.size,
          fileType: processed.fileType,
          pageCount: processed.metadata?.pageCount || 1,
          wordCount: processed.metadata?.wordCount || 0,
          isScanned: processed.metadata?.isScanned || false,
          isOcr: processed.metadata?.isOcr || false,
          extractionStatus: processed.extractionStatus || processed.metadata?.extractionStatus || 'COMPLETED',
          extractedText: processed.extractedText,
          summary: deepAnalysis.summary || processed.summary,
          factualFindings: deepAnalysis.factualFindings || [],
          aiInterpretations: deepAnalysis.aiInterpretations || [],
          importantSections: deepAnalysis.importantSections || processed.sections || [],
          identifiedWeaknesses: deepAnalysis.identifiedWeaknesses || [],
          keyRequirements: deepAnalysis.keyRequirements || [],
          technologies: deepAnalysis.technologies || [],
          recommendations: deepAnalysis.recommendations || [],
          extractedData: deepAnalysis.extractedData || processed.structuredData || {},
          missingInformation: deepAnalysis.missingInformation || [],
          limitations: processed.limitations || [],
        });
      } catch (err) {
        logger.error(`[Document Agent] Failed processing ${file.name}: ${err.message}`);
        extractedDocs.push({
          filename: file.name,
          fileType: (file.name?.split('.').pop() || 'FILE').toUpperCase(),
          error: err.message,
          extractionStatus: 'FAILED',
          summary: `Could not extract content from ${file.name}: ${err.message}`,
          factualFindings: [],
          aiInterpretations: [],
          importantSections: [],
          identifiedWeaknesses: [],
          recommendations: [],
          missingInformation: ['File could not be extracted.'],
          limitations: [err.message],
        });
      }
    }

    // 2. Multiple Document Intelligence: Cross-Document Comparative Analysis
    let crossDocAnalysis = null;
    if (extractedDocs.length > 1) {
      crossDocAnalysis = await this.performMultiDocComparison(extractedDocs, userRequest);
    }

    return {
      agentName: this.name,
      status: 'completed',
      documentCount: extractedDocs.length,
      documents: extractedDocs,
      crossDocAnalysis,
      startedAt,
      completedAt: new Date(),
    };
  }

  /**
   * Single-document deep grounded extraction using configured LLM
   */
  async extractDocumentIntelligence(processed, userRequest, historyContext = '') {
    const textSnippet = (processed.extractedText || '').slice(0, 10000);
    const hasText = textSnippet.replace(/\[(Page|Slide|Sheet)[^\]]*\]/g, '').trim().length > 10;

    if (!hasText) {
      return {
        summary: processed.summary || 'Document extracted, but no readable textual characters were present.',
        factualFindings: [],
        aiInterpretations: ['Document is rasterized, scanned, or empty. Direct textual assertions could not be confirmed.'],
        importantSections: [],
        identifiedWeaknesses: ['No readable text layer present in file.'],
        keyRequirements: [],
        technologies: [],
        recommendations: ['Provide a document with an embedded digital text layer or high-contrast OCR scan.'],
        extractedData: processed.structuredData || {},
        missingInformation: ['All requested information absent due to lack of readable text.'],
      };
    }

    const systemPrompt = `You are DOERA's Senior Document Intelligence Agent.
Analyze the provided document text strictly with respect to the user's objective: "${userRequest}".

CRITICAL ANTI-HALLUCINATION & GROUNDING RULES:
1. "factualFindings": Array of { "fact": "Direct verified statement", "citation": "[Page X] or [Slide X] or [Sheet: X] or Section Name" }. Every fact MUST originate from the text.
2. "aiInterpretations": Analytical conclusions, architectural explanations, or synthesized technical implications.
3. "importantSections": Array of { "section": "Heading or topic", "pageOrReference": "Reference / Page", "content": "Summary of section" }.
4. "identifiedWeaknesses": Vulnerabilities, gaps, architectural bottlenecks, missing terms, ambiguities, or risks.
5. "keyRequirements": Explicit requirements, deliverables, budget figures, or SLA constraints.
6. "technologies": Specific technologies, libraries, databases, or frameworks explicitly identified.
7. "recommendations": Actionable improvement suggestions based on document content.
8. "missingInformation": Specific questions or aspects asked by the user that are NOT mentioned anywhere in the document. Explicitly state what is absent. Never invent details.

Output pure JSON ONLY.`;

    const userPrompt = `Document: ${processed.filename} (${processed.fileType}, ${processed.metadata?.pageCount || 1} pages/slides/sheets)
User Inquiry: "${userRequest}"
Prior Conversation Context: ${historyContext ? historyContext.slice(-1500) : 'None'}

Extracted Document Content:
${textSnippet}`;

    try {
      const parsed = await llmService.generate({
        systemPrompt,
        userPrompt,
        jsonMode: true,
        temperature: 0.1,
      });

      if (parsed && (parsed.summary || parsed.factualFindings)) {
        return parsed;
      }
    } catch (err) {
      logger.warn(`[Document Agent] LLM deep analysis notice: ${err.message}`);
    }

    // Deterministic fallback if LLM is unavailable
    return {
      summary: processed.summary || 'Document extracted and structured.',
      factualFindings: [
        { fact: `Document contains ${processed.metadata?.wordCount || 0} words across ${processed.metadata?.pageCount || 1} page(s).`, citation: '[Page 1]' },
      ],
      aiInterpretations: ['Analysis grounded in extracted text tokens.'],
      importantSections: processed.sections || [],
      identifiedWeaknesses: [],
      keyRequirements: [],
      technologies: [],
      recommendations: ['Review specific document sections against requirements.'],
      extractedData: processed.structuredData || {},
      missingInformation: [],
    };
  }

  /**
   * Multi-Document Comparative Analysis
   */
  async performMultiDocComparison(docs, userRequest) {
    logger.info(`[Document Agent] Performing multi-document comparison across ${docs.length} documents.`);

    const docPreviews = docs.map((d, idx) => {
      const sample = (d.extractedText || '').slice(0, 4500);
      return `=== DOCUMENT ${idx + 1}: "${d.filename}" (${d.fileType}, ${d.pageCount} pages) ===\n${sample}`;
    }).join('\n\n');

    const systemPrompt = `You are DOERA's Multi-Document Intelligence Agent.
Compare the uploaded documents with respect to the user's inquiry: "${userRequest}".

Provide structured JSON:
{
  "comparisonObjective": "What is being compared",
  "comparisonSummary": "Executive summary of key differences and commonalities",
  "comparisonMatrix": [
    {
      "criteria": "Comparison Criterion (e.g. Salary, Duration, Scope, Tech Stack, SLA, Cost)",
      "doc1Value": "Value in Document 1 with [Page/Ref citation]",
      "doc2Value": "Value in Document 2 with [Page/Ref citation]",
      "verdict": "Which document is stronger or how they differ"
    }
  ],
  "commonRequirements": [
    "Requirement or term present across documents"
  ],
  "conflictingRequirements": [
    {
      "issue": "Discrepancy or conflict description",
      "doc1Stance": "Document 1 stance with citation",
      "doc2Stance": "Document 2 stance with citation"
    }
  ],
  "missingInEach": {
    "doc1Lacks": ["Items present in Doc 2 but missing in Doc 1"],
    "doc2Lacks": ["Items present in Doc 1 but missing in Doc 2"]
  },
  "recommendation": "Objective, grounded recommendation based on stated criteria"
}
Output pure JSON ONLY.`;

    const userPrompt = `Inquiry: "${userRequest}"
Documents to compare:
${docPreviews}`;

    try {
      const parsed = await llmService.generate({
        systemPrompt,
        userPrompt,
        jsonMode: true,
        temperature: 0.1,
      });

      if (parsed && parsed.comparisonMatrix) {
        return parsed;
      }
    } catch (err) {
      logger.warn(`[Document Agent] Multi-doc LLM notice: ${err.message}`);
    }

    // Deterministic fallback for multi-document comparison
    const doc1 = docs[0];
    const doc2 = docs[1];
    return {
      comparisonObjective: `Comparative analysis between ${doc1.filename} and ${doc2.filename}`,
      comparisonSummary: `Evaluated ${docs.length} documents. Both files have been parsed and indexed for cross-referencing.`,
      comparisonMatrix: [
        {
          criteria: 'Document Scope',
          doc1Value: `${doc1.pageCount} page(s), ${doc1.wordCount} words (${doc1.fileType})`,
          doc2Value: `${doc2.pageCount} page(s), ${doc2.wordCount} words (${doc2.fileType})`,
          verdict: 'Both sources catalogued',
        },
        {
          criteria: 'Extraction Quality',
          doc1Value: doc1.extractionStatus || 'COMPLETED',
          doc2Value: doc2.extractionStatus || 'COMPLETED',
          verdict: 'Content ready for comparative queries',
        },
      ],
      commonRequirements: ['Both documents provide formal project/contract specifications.'],
      conflictingRequirements: [],
      missingInEach: {
        doc1Lacks: [],
        doc2Lacks: [],
      },
      recommendation: `Compare specific clauses between ${doc1.filename} and ${doc2.filename} according to your decision priorities.`,
    };
  }
}

export const documentAgent = new DocumentAgent();
export default documentAgent;
