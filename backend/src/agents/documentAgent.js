import documentProcessor from '../services/documentProcessor.js';
import llmService from '../services/llmService.js';
import { logger } from '../utils/logger.js';

class DocumentAgent {
  constructor() {
    this.name = 'Document';
  }

  /**
   * Universal Document Intelligence:
   * Summarizes documents, extracts findings, structured data, page/section references,
   * and identifies missing information.
   */
  async analyzeDocument(taskContext, attachments = []) {
    const startedAt = new Date();
    const userRequest = taskContext.userRequest || '';
    logger.info(`[Document Agent] Processing document analysis for: "${userRequest}"`);

    const files = Array.isArray(attachments) ? attachments : [];
    const results = [];

    for (const file of files) {
      try {
        const processed = await documentProcessor.processContent({
          filename: file.name || 'document.txt',
          mimeType: file.type || 'text/plain',
          rawText: file.content || file.text || '',
          base64Content: file.base64 || null,
        });

        // Run deep structural extraction with LLM
        const extractionPrompt = `You are DOERA's Document Analysis Agent.
Analyze this document content with respect to the user's inquiry: "${userRequest}".
Extract:
1. "summary": Clear 2-3 sentence executive summary.
2. "keyFindings": Array of 3-5 key findings.
3. "importantSections": Array of { "section": "Section name/heading", "pageOrReference": "Reference or Section #", "content": "Brief summary" }.
4. "extractedData": Key data points or parameters found.
5. "missingInformation": Information requested by user that is NOT found in this document.

JSON format ONLY.`;

        let deepExtraction = {};
        try {
          deepExtraction = await llmService.generate({
            systemPrompt: extractionPrompt,
            userPrompt: `Filename: ${file.name}\n\nContent:\n${(processed.extractedText || '').slice(0, 6000)}`,
            jsonMode: true,
            temperature: 0.1,
          });
        } catch (_) {
          deepExtraction = {
            summary: processed.summary || 'Document extracted successfully.',
            keyFindings: ['Document content extracted and ready for queries.'],
            importantSections: [],
            extractedData: processed.structuredData || {},
            missingInformation: [],
          };
        }

        results.push({
          filename: file.name,
          fileSize: file.size,
          mimeType: file.type,
          summary: deepExtraction.summary || processed.summary,
          keyFindings: deepExtraction.keyFindings || [],
          importantSections: deepExtraction.importantSections || [],
          extractedData: deepExtraction.extractedData || processed.structuredData,
          missingInformation: deepExtraction.missingInformation || [],
        });
      } catch (err) {
        logger.error(`[Document Agent] Failed processing ${file.name}: ${err.message}`);
        results.push({
          filename: file.name,
          error: err.message,
        });
      }
    }

    return {
      agentName: this.name,
      status: 'completed',
      documentCount: results.length,
      documents: results,
      startedAt,
      completedAt: new Date(),
    };
  }
}

export const documentAgent = new DocumentAgent();
export default documentAgent;
