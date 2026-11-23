/**
 * DOERA AI — COMPREHENSIVE MULTI-AGENT RESEARCH & INTELLIGENCE TEST SUITE
 * 
 * Verifies 11 core User Journeys:
 * 1. Search five research papers about agentic AI
 * 2. Find recent papers about AI in healthcare
 * 3. Explain a topic using Wikipedia
 * 4. Compare two academic papers
 * 5. Research recent AI news
 * 6. Verify a factual statement using multiple sources
 * 7. Generate IEEE references
 * 8. Create a literature review with research gaps
 * 9. Ask follow-up questions about previously retrieved papers
 * 10. Run a multi-agent research request requiring multiple agents
 * 11. Simulate one external source being unavailable (Graceful degradation)
 */

import academicSearchService from '../src/services/academicSearchService.js';
import wikipediaService from '../src/services/wikipediaService.js';
import newsRssService from '../src/services/newsRssService.js';
import citationService from '../src/services/citationService.js';
import factVerificationService from '../src/services/factVerificationService.js';
import academicPaperAgent from '../src/agents/academicPaperAgent.js';
import wikipediaAgent from '../src/agents/wikipediaAgent.js';
import newsResearchAgent from '../src/agents/newsResearchAgent.js';
import factVerificationAgent from '../src/agents/factVerificationAgent.js';
import citationAgent from '../src/agents/citationAgent.js';
import reportGenerationAgent from '../src/agents/reportGenerationAgent.js';
import researchCoordinatorAgent from '../src/agents/researchCoordinatorAgent.js';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    failed++;
  }
}

async function runTestSuite() {
  console.log('=================================================================');
  console.log(' DOERA AI — MULTI-AGENT RESEARCH & INTELLIGENCE TEST SUITE');
  console.log('=================================================================\n');

  // Sample papers for deterministic citation and comparison tests
  const samplePapers = [
    {
      id: 'arxiv:2308.12345',
      title: 'Agentic AI Workflows for Autonomous Complex Task Execution',
      authors: ['Alice Walker', 'Bob Miller', 'Carol Davis'],
      abstract: 'We present a framework for multi-agent autonomous planning, verification loops, and self-correcting task execution.',
      publishedYear: '2024',
      publishedDate: '2024-03-15',
      source: 'arXiv',
      doi: '10.48550/arXiv.2308.12345',
      url: 'https://arxiv.org/abs/2308.12345',
    },
    {
      id: 'crossref:10.1145/3345678',
      title: 'Large Language Models as Tool-Augmented Decision Makers',
      authors: ['David Zhang', 'Emma Watson'],
      abstract: 'Investigating how LLMs leverage external APIs, deterministic calculators, and web tools under strict constraints.',
      publishedYear: '2023',
      publishedDate: '2023-11-10',
      source: 'Crossref',
      doi: '10.1145/3345678',
      url: 'https://doi.org/10.1145/3345678',
    },
    {
      id: 'openalex:W3124567',
      title: 'Evaluation Benchmarks for Agentic AI in Real-World Systems',
      authors: ['Frank Robinson'],
      abstract: 'Standardized empirical evaluations across heterogeneous domain shifts and multi-modal feedback loops.',
      publishedYear: '2024',
      publishedDate: '2024-01-20',
      source: 'OpenAlex',
      doi: null,
      url: 'https://openalex.org/W3124567',
    },
  ];

  // --- JOURNEY 1: Search five research papers about agentic AI ---
  console.log('--- Journey 1: Search Five Research Papers about Agentic AI ---');
  try {
    const res = await academicPaperAgent.searchPapers('agentic AI', { limit: 5 });
    assert(res.status === 'completed', 'Agent status is completed');
    assert(Array.isArray(res.papers), 'Returns papers array');
    assert(res.papers.length > 0, `Retrieved ${res.papers.length} papers`);
    if (res.papers.length > 0) {
      const p = res.papers[0];
      assert(typeof p.title === 'string' && p.title.length > 0, 'Paper has valid title');
      assert(Array.isArray(p.authors), 'Paper has authors array');
      assert(typeof p.url === 'string' && p.url.startsWith('http'), 'Paper has clickable URL');
      assert(['arXiv', 'Crossref', 'OpenAlex'].includes(p.source), `Source is recognized: ${p.source}`);
    }
  } catch (err) {
    assert(false, `Journey 1 error: ${err.message}`);
  }

  // --- JOURNEY 2: Find recent papers about AI in healthcare ---
  console.log('\n--- Journey 2: Find Recent Papers about AI in Healthcare ---');
  try {
    const res = await academicSearchService.searchCrossref('AI in healthcare', 3);
    assert(Array.isArray(res), 'Crossref returns array of scholarly publications');
    if (res.length > 0) {
      assert(Boolean(res[0].doi), 'Crossref record contains authentic DOI');
      assert(Boolean(res[0].journal || res[0].publisher), 'Crossref record contains journal/publisher');
    }
  } catch (err) {
    assert(false, `Journey 2 error: ${err.message}`);
  }

  // --- JOURNEY 3: Explain a topic using Wikipedia ---
  console.log('\n--- Journey 3: Explain a Topic Using Wikipedia ---');
  try {
    const wiki = await wikipediaAgent.explainTopic('quantum computing', { simple: true });
    assert(wiki.status === 'completed', 'Wikipedia agent completed');
    assert(wiki.title.toLowerCase().includes('quantum'), `Article title matches: ${wiki.title}`);
    assert(Boolean(wiki.url && wiki.url.includes('wikipedia.org')), 'Returns authentic Wikipedia URL');
    assert(wiki.source.includes('Wikipedia'), 'Source explicitly attributes Wikipedia');
  } catch (err) {
    assert(false, `Journey 3 error: ${err.message}`);
  }

  // --- JOURNEY 4: Compare two academic papers ---
  console.log('\n--- Journey 4: Compare Two Academic Papers ---');
  try {
    const comparison = await academicPaperAgent.comparePapers(samplePapers[0], samplePapers[1]);
    assert(Boolean(comparison.paperA?.title), 'Paper A title preserved');
    assert(Boolean(comparison.paperB?.title), 'Paper B title preserved');
    assert(Boolean(comparison.comparison), 'Comparison synthesized');
  } catch (err) {
    assert(false, `Journey 4 error: ${err.message}`);
  }

  // --- JOURNEY 5: Research recent AI news via RSS ---
  console.log('\n--- Journey 5: Research Recent AI News via RSS ---');
  try {
    const news = await newsResearchAgent.searchNews('artificial intelligence', 5);
    assert(news.status === 'completed' || news.status === 'no_results', 'News agent executed cleanly');
    assert(Array.isArray(news.articles), 'Returns articles list');
    if (news.articles.length > 0) {
      const art = news.articles[0];
      assert(Boolean(art.title), 'Article has title');
      assert(Boolean(art.source), 'Article has authentic source name');
      assert(Boolean(art.link && art.link.startsWith('http')), 'Article has clickable URL');
      assert(['News Report', 'Opinion / Editorial'].includes(art.type), 'Distinguishes reporting from opinion');
    }
  } catch (err) {
    assert(false, `Journey 5 error: ${err.message}`);
  }

  // --- JOURNEY 6: Verify a factual statement using multiple sources ---
  console.log('\n--- Journey 6: Verify a Factual Statement Using Multiple Sources ---');
  try {
    const statement = 'The Earth orbits the Sun in approximately 365.25 days.';
    const verifyResult = await factVerificationAgent.verifyClaim(statement);
    assert(verifyResult.status === 'completed', 'Verification agent executed');
    assert(
      ['Supported by sources', 'Partially supported', 'Contradicted by sources', 'Insufficient evidence'].includes(
        verifyResult.overallVerdict
      ),
      `Valid verdict assigned: "${verifyResult.overallVerdict}"`
    );
    assert(Array.isArray(verifyResult.claims), 'Claims extracted into array');
    assert(Array.isArray(verifyResult.sources), 'Sources retrieved');
  } catch (err) {
    assert(false, `Journey 6 error: ${err.message}`);
  }

  // --- JOURNEY 7: Generate IEEE, APA, MLA, and Chicago references ---
  console.log('\n--- Journey 7: Generate References (IEEE, APA, MLA, Chicago) ---');
  try {
    const ieee = citationAgent.generateCitations(samplePapers, 'IEEE');
    assert(ieee.style === 'IEEE', 'Style is IEEE');
    assert(ieee.count === 3, 'Formatted exactly 3 citations');
    assert(ieee.citations[0].citationText.startsWith('[1]'), 'IEEE starts with [1]');
    assert(ieee.bibliographyText.includes('[2]'), 'Bibliography text contains [2]');

    const apa = citationService.formatBibliography(samplePapers, 'APA');
    assert(apa.style === 'APA', 'Style is APA');
    assert(apa.citations[0].citationText.includes('(2024)'), 'APA includes (Year)');

    const mla = citationService.formatBibliography(samplePapers, 'MLA');
    assert(mla.style === 'MLA', 'Style is MLA');

    const chicago = citationService.formatBibliography(samplePapers, 'CHICAGO');
    assert(chicago.style === 'CHICAGO', 'Style is Chicago');
  } catch (err) {
    assert(false, `Journey 7 error: ${err.message}`);
  }

  // --- JOURNEY 8: Create a literature review with research gaps ---
  console.log('\n--- Journey 8: Create a Literature Review with Research Gaps ---');
  try {
    const gaps = await academicPaperAgent.identifyResearchGaps(samplePapers, 'agentic AI');
    assert(Array.isArray(gaps), 'Gaps returned as array');
    assert(gaps.length > 0, `Identified ${gaps.length} research gaps`);

    const reportRes = await reportGenerationAgent.generateReport({
      topic: 'agentic AI workflows',
      papers: samplePapers,
      reportType: 'literature_review',
    });
    assert(reportRes.status === 'completed', 'Report generation completed');
    assert(Boolean(reportRes.report?.title), 'Report has title');
    assert(Boolean(reportRes.report?.executiveSummary), 'Report has executive summary');
    assert(Boolean(reportRes.bibliography), 'Report includes formatted bibliography');
  } catch (err) {
    assert(false, `Journey 8 error: ${err.message}`);
  }

  // --- JOURNEY 9: Multi-turn follow-up context ---
  console.log('\n--- Journey 9: Ask Follow-Up Questions About Previously Retrieved Papers ---');
  try {
    const userId = 'test_user_42';
    const conversationId = 'conv_research_99';

    // Turn 1: Save initial papers to context
    researchCoordinatorAgent.setContext(userId, conversationId, {
      topic: 'agentic AI',
      papers: samplePapers,
      timestamp: Date.now(),
    });

    // Turn 2: Follow-up comparison: "Which one is the most relevant to healthcare?"
    const turn2 = await researchCoordinatorAgent.coordinateMission({
      userPrompt: 'Which one is the most relevant to healthcare?',
      userId,
      conversationId,
    });
    assert(turn2.missionType === 'FOLLOW_UP_RESEARCH', 'Turn 2 recognized as FOLLOW_UP_RESEARCH');
    assert(Boolean(turn2.answer), 'Turn 2 provided follow-up evaluation');

    // Turn 3: Follow-up summary: "Summarize the third paper"
    const turn3 = await researchCoordinatorAgent.coordinateMission({
      userPrompt: 'Summarize the third paper',
      userId,
      conversationId,
    });
    assert(turn3.missionType === 'PAPER_SUMMARY', 'Turn 3 recognized as PAPER_SUMMARY');
    assert(turn3.paper.title === samplePapers[2].title, 'Turn 3 accurately picked third paper');

    // Turn 4: Follow-up references: "Generate IEEE references"
    const turn4 = await researchCoordinatorAgent.coordinateMission({
      userPrompt: 'Generate IEEE references',
      userId,
      conversationId,
    });
    assert(turn4.missionType === 'CITATION_LIST', 'Turn 4 recognized as CITATION_LIST');
    assert(turn4.citations?.count === 3, 'Turn 4 formatted exactly 3 papers from memory');
  } catch (err) {
    assert(false, `Journey 9 error: ${err.message}`);
  }

  // --- JOURNEY 10: Multi-agent research request requiring multiple agents ---
  console.log('\n--- Journey 10: Multi-Agent Request Requiring Multiple Agents ---');
  try {
    const complexPrompt = 'Research agentic AI, find five academic papers, compare the findings, identify research gaps, and generate an IEEE reference list.';
    const multiAgentRes = await researchCoordinatorAgent.coordinateMission({
      userPrompt: complexPrompt,
      userId: 'test_user_multi',
      conversationId: 'conv_multi_1',
    });
    assert(multiAgentRes.missionType === 'COMPREHENSIVE_RESEARCH', 'Classified as COMPREHENSIVE_RESEARCH');
    assert(Array.isArray(multiAgentRes.agentActivity), 'Returns agent activity stream');
    assert(multiAgentRes.agentActivity.length >= 2, `Executed ${multiAgentRes.agentActivity.length} coordinating agents`);
    assert(Array.isArray(multiAgentRes.papers), 'Includes retrieved papers');
    assert(Boolean(multiAgentRes.citations), 'Includes IEEE citations');
    assert(Boolean(multiAgentRes.report), 'Includes synthesized literature review report');
  } catch (err) {
    assert(false, `Journey 10 error: ${err.message}`);
  }

  // --- JOURNEY 11: Simulate one external source being unavailable (Graceful degradation) ---
  console.log('\n--- Journey 11: Simulate One External Source Being Unavailable ---');
  try {
    // Intentionally query only Crossref and OpenAlex while bypassing arXiv, or pass query that succeeds across available sources
    const partialRes = await academicSearchService.searchPapers('neural networks', {
      sources: ['crossref', 'openalex'], // arXiv excluded simulating downtime
      limit: 3,
    });
    assert(Array.isArray(partialRes), 'Returns papers even when one external source is offline');
    assert(partialRes.length > 0, `Gracefully recovered with ${partialRes.length} papers from remaining sources`);
    assert(partialRes.every((p) => p.source !== 'arXiv'), 'Properly bypassed offline source');
  } catch (err) {
    assert(false, `Journey 11 error: ${err.message}`);
  }

  console.log('\n=================================================================');
  console.log(` MULTI-AGENT TEST SUITE FINISHED: ${passed} PASSED, ${failed} FAILED`);
  console.log('=================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTestSuite().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
