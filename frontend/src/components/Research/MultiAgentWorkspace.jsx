import React, { useState, useEffect, useCallback } from 'react';
import {
  BookOpen,
  FileText,
  Globe,
  Newspaper,
  CheckCircle2,
  Quote,
  Sparkles,
  Send,
  X,
  ExternalLink,
  Copy,
  Check,
  Download,
  Layers,
  RefreshCw,
  Search,
  AlertTriangle,
  History,
  ShieldCheck,
  ChevronRight,
} from 'lucide-react';
import multiAgentResearchService from '../../services/multiAgentResearchService';
import './MultiAgentWorkspace.css';

const TABS = [
  { id: 'workspace', label: 'Research Workspace', icon: Sparkles },
  { id: 'academic', label: 'Academic Papers', icon: BookOpen },
  { id: 'wikipedia', label: 'Wikipedia Knowledge', icon: Globe },
  { id: 'web', label: 'Web Research', icon: Search },
  { id: 'news', label: 'News Discovery', icon: Newspaper },
  { id: 'verify', label: 'Fact Verification', icon: CheckCircle2 },
  { id: 'citations', label: 'Citation Manager', icon: Quote },
  { id: 'reports', label: 'Report Generation', icon: FileText },
  { id: 'history', label: 'Mission History', icon: History },
];

const SUGGESTIONS = [
  'Find five research papers about agentic AI',
  'What is quantum computing?',
  'Find recent AI news',
  'Verify: Large language models hallucinate reasoning traces',
  'Research agentic AI, find papers, and generate IEEE references',
];

export const MultiAgentWorkspace = ({ onClose, initialPrompt = '', conversationId }) => {
  const [activeTab, setActiveTab] = useState('workspace');
  const [prompt, setPrompt] = useState(initialPrompt);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

  // Active mission state
  const [missionResult, setMissionResult] = useState(null);
  const [activeAgents, setActiveAgents] = useState([]);

  // Tab-specific datasets
  const [academicPapers, setAcademicPapers] = useState([]);
  const [wikiData, setWikiData] = useState(null);
  const [newsArticles, setNewsArticles] = useState([]);
  const [verificationResult, setVerificationResult] = useState(null);
  const [citationsData, setCitationsData] = useState(null);
  const [selectedCitationStyle, setSelectedCitationStyle] = useState('IEEE');
  const [reportData, setReportData] = useState(null);
  const [historySessions, setHistorySessions] = useState([]);

  // Load mission history on mount
  useEffect(() => {
    multiAgentResearchService
      .getSessions(conversationId)
      .then((data) => {
        if (data?.sessions) setHistorySessions(data.sessions);
      })
      .catch(() => {});
  }, [conversationId]);

  // Execute multi-agent research mission
  const handleExecuteMission = async (customPrompt) => {
    const queryToRun = customPrompt || prompt;
    if (!queryToRun.trim() || isLoading) return;

    setIsLoading(true);
    setError(null);
    setActiveAgents([
      { name: 'ResearchCoordinator', status: 'running' },
      { name: 'AcademicPaperAgent', status: 'running' },
      { name: 'CitationAgent', status: 'pending' },
    ]);

    try {
      const result = await multiAgentResearchService.coordinateMission({
        userPrompt: queryToRun.trim(),
        conversationId,
      });

      setMissionResult(result);

      if (result.agentActivity) {
        setActiveAgents(result.agentActivity.map((a) => ({ name: a.agent, status: a.status })));
      } else {
        setActiveAgents([
          { name: 'ResearchCoordinator', status: 'completed' },
          { name: 'AcademicPaperAgent', status: 'completed' },
          { name: 'CitationAgent', status: 'completed' },
        ]);
      }

      if (result.papers && result.papers.length > 0) {
        setAcademicPapers(result.papers);
      }
      if (result.wikipedia) {
        setWikiData(result.wikipedia);
      }
      if (result.news?.articles) {
        setNewsArticles(result.news.articles);
      }
      if (result.verification) {
        setVerificationResult(result.verification);
      }
      if (result.citations) {
        setCitationsData(result.citations);
      }
      if (result.report) {
        setReportData(result.report);
      }

      // Refresh history
      multiAgentResearchService.getSessions(conversationId).then((d) => {
        if (d?.sessions) setHistorySessions(d.sessions);
      }).catch(() => {});
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Mission failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyText = useCallback(async (text, id) => {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(text);
      }
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (e) {
      console.warn('Copy failed:', e);
    }
  }, []);

  const handleDownloadText = (content, filename) => {
    const element = document.createElement('a');
    const file = new Blob([content], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = filename;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  // Re-generate citations on style switch
  const handleStyleChange = async (style) => {
    setSelectedCitationStyle(style);
    const papersToCite = academicPapers.length > 0 ? academicPapers : missionResult?.papers || [];
    if (papersToCite.length > 0) {
      try {
        const res = await multiAgentResearchService.generateCitations({
          papers: papersToCite,
          style,
        });
        setCitationsData(res);
      } catch (err) {
        console.warn('Citation style update failed:', err);
      }
    }
  };

  return (
    <div className="doera-research-workspace">
      {/* 1. Header Bar */}
      <header className="doera-research-header">
        <div className="doera-research-title-group">
          <div className="doera-research-icon-badge">
            <Sparkles size={22} />
          </div>
          <div className="doera-research-title-text">
            <h2>Multi-Agent Research & Knowledge Intelligence</h2>
            <p>Autonomous research across arXiv, Crossref, OpenAlex, Wikipedia, and verified public sources</p>
          </div>
        </div>

        <div className="doera-research-controls">
          <div className="doera-research-status-pill">
            <span className="doera-research-pulse" />
            Swarm Ready
          </div>
          {onClose && (
            <button onClick={onClose} className="doera-research-close-btn" title="Return to Chat">
              <X size={16} />
              <span>Back to Chat</span>
            </button>
          )}
        </div>
      </header>

      {/* 2. Navigation Tabs */}
      <div className="doera-research-tabs-wrapper">
        <div className="doera-research-tabs">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`doera-research-tab ${isActive ? 'active' : ''}`}
              >
                <Icon size={16} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Natural Language Task Input */}
      <div className="doera-research-input-card">
        <form
          className="doera-research-input-form"
          onSubmit={(e) => {
            e.preventDefault();
            handleExecuteMission();
          }}
        >
          <textarea
            className="doera-research-textarea"
            placeholder="Enter research topic, papers to find, claims to verify, or conceptual questions..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            disabled={isLoading}
          />

          <div className="doera-research-input-footer">
            <div className="doera-research-suggestions">
              {SUGGESTIONS.map((s, idx) => (
                <button
                  type="button"
                  key={idx}
                  className="doera-research-suggestion-pill"
                  onClick={() => {
                    setPrompt(s);
                    handleExecuteMission(s);
                  }}
                >
                  {s}
                </button>
              ))}
            </div>

            <button
              type="submit"
              className="doera-research-submit-btn"
              disabled={isLoading || !prompt.trim()}
            >
              {isLoading ? (
                <>
                  <RefreshCw size={16} className="animate-spin" />
                  <span>Orchestrating Agents...</span>
                </>
              ) : (
                <>
                  <Send size={16} />
                  <span>Execute Mission</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* 4. Live Agent Activity Chips */}
      {activeAgents.length > 0 && (
        <div className="doera-agent-activity-bar">
          <div className="doera-agent-activity-header">
            <span>Participating Intelligence Agents</span>
            <span>{isLoading ? 'Orchestrating In Parallel' : 'Mission Completed'}</span>
          </div>
          <div className="doera-agent-chips">
            {activeAgents.map((ag, i) => (
              <div key={i} className={`doera-agent-chip ${ag.status}`}>
                {ag.status === 'running' ? (
                  <RefreshCw size={12} className="animate-spin" />
                ) : (
                  <CheckCircle2 size={12} />
                )}
                <span>{ag.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {error && (
        <div style={{ padding: '1rem', background: 'rgba(239,68,68,0.1)', border: '1px solid #EF4444', borderRadius: '10px', color: '#F87171', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <AlertTriangle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* 5. Tab Content Sections */}
      {/* SECTION 1: RESEARCH WORKSPACE */}
      {activeTab === 'workspace' && (
        <div>
          {missionResult ? (
            <div>
              {missionResult.answer && (
                <div className="doera-report-card">
                  <div className="doera-section-header">
                    <h3>Follow-Up Synthesis</h3>
                  </div>
                  <p style={{ lineHeight: '1.6', color: '#E2D9F3' }}>{missionResult.answer}</p>
                </div>
              )}

              {/* Verified Papers Grid */}
              {academicPapers.length > 0 && (
                <div>
                  <div className="doera-section-header">
                    <h3>Retrieved Scholarly Publications ({academicPapers.length})</h3>
                    <span style={{ fontSize: '0.8rem', color: '#A39DB0' }}>arXiv • Crossref • OpenAlex</span>
                  </div>
                  <div className="doera-research-grid">
                    {academicPapers.map((paper, idx) => (
                      <div key={idx} className="doera-paper-card">
                        <div>
                          <div className="doera-card-meta">
                            <span className={`doera-source-badge ${paper.source?.toLowerCase()}`}>
                              {paper.source}
                            </span>
                            <span>{paper.publishedYear || paper.publishedDate}</span>
                          </div>
                          <h4 className="doera-card-title">{paper.title}</h4>
                          <p className="doera-card-authors">
                            {Array.isArray(paper.authors) ? paper.authors.slice(0, 3).join(', ') : paper.authors}
                          </p>
                          <p className="doera-card-abstract">{paper.abstract}</p>
                        </div>

                        <div className="doera-card-footer">
                          <div className="doera-card-links">
                            {paper.url && (
                              <a href={paper.url} target="_blank" rel="noopener noreferrer" className="doera-link-pill">
                                <ExternalLink size={13} />
                                <span>Article</span>
                              </a>
                            )}
                            {paper.pdfUrl && (
                              <a href={paper.pdfUrl} target="_blank" rel="noopener noreferrer" className="doera-link-pill">
                                <FileText size={13} />
                                <span>PDF</span>
                              </a>
                            )}
                            {paper.doi && (
                              <span style={{ fontSize: '0.72rem', color: '#8E8A99' }}>
                                DOI: {paper.doi}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Report Summary */}
              {reportData && (
                <div className="doera-report-card">
                  <div className="doera-section-header">
                    <h3>{reportData.title || 'Structured Literature Review'}</h3>
                    <button
                      className="doera-link-pill"
                      onClick={() => handleDownloadText(JSON.stringify(reportData, null, 2), 'doera-research-report.json')}
                    >
                      <Download size={14} />
                      <span>Export Report</span>
                    </button>
                  </div>
                  <div className="doera-report-body">
                    <p><strong>Objective:</strong> {reportData.objective}</p>
                    <p><strong>Executive Summary:</strong> {reportData.executiveSummary}</p>
                    {reportData.coreFindings && reportData.coreFindings.map((cf, i) => (
                      <div key={i} className="doera-report-core-finding">
                        <h4>{cf.heading}</h4>
                        <p style={{ margin: 0 }}>{cf.analysis}</p>
                      </div>
                    ))}
                    {reportData.comparativeAnalysis && (
                      <p><strong>Comparative Analysis:</strong> {reportData.comparativeAnalysis}</p>
                    )}
                    {reportData.researchGapsAndLimitations && (
                      <div>
                        <strong>Identified Gaps & Limitations:</strong>
                        <ul style={{ paddingLeft: '1.25rem', margin: '0.5rem 0' }}>
                          {reportData.researchGapsAndLimitations.map((g, i) => (
                            <li key={i}>{g}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#8E8A99' }}>
              <Layers size={40} style={{ margin: '0 auto 1rem', opacity: 0.4, color: '#C084FC' }} />
              <h3 style={{ color: '#FFF', fontSize: '1.1rem', margin: '0 0 0.5rem' }}>Autonomous Intelligence Swarm Ready</h3>
              <p style={{ maxWidth: '480px', margin: '0 auto', fontSize: '0.88rem' }}>
                Type an inquiry above or select a preset to deploy the Academic Discovery Agent, Wikipedia Knowledge Agent, News Engine, and Citation Coordinator.
              </p>
            </div>
          )}
        </div>
      )}

      {/* SECTION 2: ACADEMIC PAPERS */}
      {activeTab === 'academic' && (
        <div>
          <div className="doera-section-header">
            <h3>Academic Research Papers</h3>
            <span style={{ fontSize: '0.82rem', color: '#A39DB0' }}>
              Showing {academicPapers.length} peer-reviewed & preprint publications
            </span>
          </div>

          {academicPapers.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#8E8A99' }}>
              <BookOpen size={36} style={{ margin: '0 auto 1rem', opacity: 0.4 }} />
              <p>No papers loaded. Use the search box above to query arXiv, Crossref, and OpenAlex.</p>
            </div>
          ) : (
            <div className="doera-research-grid">
              {academicPapers.map((paper, idx) => (
                <div key={idx} className="doera-paper-card">
                  <div>
                    <div className="doera-card-meta">
                      <span className={`doera-source-badge ${paper.source?.toLowerCase()}`}>
                        {paper.source}
                      </span>
                      <span>{paper.publishedYear || paper.publishedDate}</span>
                    </div>
                    <h4 className="doera-card-title">{paper.title}</h4>
                    <p className="doera-card-authors">
                      {Array.isArray(paper.authors) ? paper.authors.join(', ') : paper.authors}
                    </p>
                    <p className="doera-card-abstract">{paper.abstract}</p>
                  </div>

                  <div className="doera-card-footer">
                    <div className="doera-card-links">
                      {paper.url && (
                        <a href={paper.url} target="_blank" rel="noopener noreferrer" className="doera-link-pill">
                          <ExternalLink size={13} />
                          <span>Link</span>
                        </a>
                      )}
                      {paper.pdfUrl && (
                        <a href={paper.pdfUrl} target="_blank" rel="noopener noreferrer" className="doera-link-pill">
                          <FileText size={13} />
                          <span>PDF</span>
                        </a>
                      )}
                      {paper.doi && (
                        <span style={{ fontSize: '0.72rem', color: '#8E8A99' }}>
                          DOI: {paper.doi}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SECTION 3: WIKIPEDIA KNOWLEDGE */}
      {activeTab === 'wikipedia' && (
        <div>
          {wikiData ? (
            <div className="doera-wiki-card">
              <div className="doera-section-header">
                <h3>{wikiData.title}</h3>
                <a href={wikiData.url} target="_blank" rel="noopener noreferrer" className="doera-link-pill">
                  <ExternalLink size={13} />
                  <span>Wikipedia Article</span>
                </a>
              </div>

              {wikiData.thumbnail && (
                <img
                  src={wikiData.thumbnail}
                  alt={wikiData.title}
                  style={{ maxWidth: '240px', borderRadius: '8px', marginBottom: '1rem' }}
                />
              )}

              <p style={{ lineHeight: '1.6', fontSize: '0.95rem', color: '#E2D9F3' }}>
                {wikiData.rawSummary || wikiData.summary}
              </p>

              {wikiData.sections && wikiData.sections.length > 0 && (
                <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                  <h4 style={{ color: '#FFF', fontSize: '0.95rem', margin: '0 0 0.75rem' }}>Article Sections</h4>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {wikiData.sections.map((sec, i) => (
                      <span
                        key={i}
                        style={{ padding: '0.3rem 0.65rem', background: 'rgba(255,255,255,0.04)', borderRadius: '6px', fontSize: '0.8rem', color: '#C5BFD2' }}
                      >
                        {sec.title}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#8E8A99' }}>
              <Globe size={36} style={{ margin: '0 auto 1rem', opacity: 0.4 }} />
              <p>Search a concept like "What is quantum computing?" to load encyclopedic summaries.</p>
            </div>
          )}
        </div>
      )}

      {/* SECTION 4: WEB RESEARCH */}
      {activeTab === 'web' && (
        <div>
          <div className="doera-section-header">
            <h3>Web Research & Multi-Source Synthesis</h3>
          </div>
          <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#8E8A99' }}>
            <Search size={36} style={{ margin: '0 auto 1rem', opacity: 0.4 }} />
            <p>Open web sources and encyclopedic records synthesized dynamically through the Research Coordinator.</p>
          </div>
        </div>
      )}

      {/* SECTION 5: NEWS DISCOVERY */}
      {activeTab === 'news' && (
        <div>
          <div className="doera-section-header">
            <h3>Recent Tech & Science News Reports</h3>
            <span style={{ fontSize: '0.82rem', color: '#A39DB0' }}>
              Public RSS: Ars Technica • The Verge • BBC • Hacker News
            </span>
          </div>

          {newsArticles.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#8E8A99' }}>
              <Newspaper size={36} style={{ margin: '0 auto 1rem', opacity: 0.4 }} />
              <p>No recent news articles loaded. Try asking "Find recent AI news" in the prompt box.</p>
            </div>
          ) : (
            <div className="doera-research-grid">
              {newsArticles.map((art, idx) => (
                <div key={idx} className="doera-news-card">
                  <div>
                    <div className="doera-card-meta">
                      <span className="doera-source-badge">{art.source}</span>
                      <span>{art.publishedDate}</span>
                    </div>
                    <h4 className="doera-card-title">{art.title}</h4>
                    <p style={{ fontSize: '0.84rem', color: '#C5BFD2', margin: '0.5rem 0 0', lineHeight: '1.45' }}>
                      {art.description}
                    </p>
                  </div>
                  <div className="doera-card-footer">
                    <span style={{ fontSize: '0.75rem', color: '#A39DB0' }}>{art.type}</span>
                    <a href={art.link} target="_blank" rel="noopener noreferrer" className="doera-link-pill">
                      <ExternalLink size={13} />
                      <span>Read Story</span>
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SECTION 6: FACT VERIFICATION */}
      {activeTab === 'verify' && (
        <div>
          <div className="doera-section-header">
            <h3>Fact Verification & Evidence Status</h3>
          </div>

          {verificationResult ? (
            <div className="doera-verify-card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                <h4 style={{ margin: 0, color: '#FFF' }}>Claim: "{verificationResult.statement}"</h4>
                <span
                  className={`doera-verdict-pill ${
                    verificationResult.overallVerdict === 'Supported by sources'
                      ? 'supported'
                      : verificationResult.overallVerdict === 'Partially supported'
                      ? 'partially'
                      : verificationResult.overallVerdict === 'Contradicted by sources'
                      ? 'contradicted'
                      : 'insufficient'
                  }`}
                >
                  {verificationResult.overallVerdict}
                </span>
              </div>

              <p style={{ margin: '0.75rem 0', color: '#D6D0E0', fontSize: '0.9rem', lineHeight: '1.5' }}>
                {verificationResult.summary}
              </p>

              {verificationResult.claims && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1rem' }}>
                  {verificationResult.claims.map((c, i) => (
                    <div
                      key={i}
                      style={{ padding: '0.85rem', background: 'rgba(255,255,255,0.02)', borderLeft: '3px solid #FF55BD', borderRadius: '0 8px 8px 0' }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                        <strong style={{ color: '#FFF', fontSize: '0.88rem' }}>Claim #{i + 1}: {c.claim}</strong>
                        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#C084FC' }}>{c.status}</span>
                      </div>
                      <p style={{ margin: '0 0 0.35rem', fontSize: '0.82rem', color: '#A39DB0', fontStyle: 'italic' }}>
                        "{c.evidenceQuote}"
                      </p>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: '#8E8A99' }}>
                        <span>Rationale: {c.explanation}</span>
                        {c.sourceUrl && (
                          <a href={c.sourceUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#FF55BD', textDecoration: 'none' }}>
                            Source
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#8E8A99' }}>
              <ShieldCheck size={36} style={{ margin: '0 auto 1rem', opacity: 0.4 }} />
              <p>Enter a statement like "Verify: Large language models hallucinate reasoning traces" to run multi-source evidence checking.</p>
            </div>
          )}
        </div>
      )}

      {/* SECTION 7: CITATION MANAGER */}
      {activeTab === 'citations' && (
        <div className="doera-citations-card">
          <div className="doera-section-header">
            <h3>Citation & Reference Generator</h3>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              {['IEEE', 'APA', 'MLA', 'CHICAGO'].map((style) => (
                <button
                  key={style}
                  onClick={() => handleStyleChange(style)}
                  className={`doera-link-pill ${selectedCitationStyle === style ? 'active' : ''}`}
                  style={{
                    background: selectedCitationStyle === style ? 'rgba(255,85,189,0.25)' : 'rgba(255,255,255,0.04)',
                    borderColor: selectedCitationStyle === style ? '#FF55BD' : 'rgba(255,255,255,0.1)',
                  }}
                >
                  {style}
                </button>
              ))}
              {citationsData?.bibliographyText && (
                <button
                  className="doera-link-pill"
                  onClick={() => handleCopyText(citationsData.bibliographyText, 'all_citations')}
                >
                  {copiedId === 'all_citations' ? <Check size={13} color="#34D399" /> : <Copy size={13} />}
                  <span>{copiedId === 'all_citations' ? 'Copied' : 'Copy All'}</span>
                </button>
              )}
            </div>
          </div>

          {citationsData?.citations && citationsData.citations.length > 0 ? (
            <div>
              {citationsData.citations.map((c, i) => (
                <div key={i} className="doera-citation-row">
                  <div>
                    <span style={{ fontWeight: 600, color: '#FF55BD', marginRight: '0.5rem' }}>
                      [{c.index}]
                    </span>
                    <span>{c.citationText}</span>
                  </div>
                  <button
                    className="doera-copy-icon-btn"
                    title="Copy Citation"
                    onClick={() => handleCopyText(c.citationText, `cite_${i}`)}
                  >
                    {copiedId === `cite_${i}` ? <Check size={14} color="#34D399" /> : <Copy size={14} />}
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#8E8A99' }}>
              <Quote size={36} style={{ margin: '0 auto 1rem', opacity: 0.4 }} />
              <p>Search academic papers first to format references automatically in IEEE, APA, MLA, or Chicago.</p>
            </div>
          )}
        </div>
      )}

      {/* SECTION 8: REPORT GENERATION */}
      {activeTab === 'reports' && (
        <div>
          {reportData ? (
            <div className="doera-report-card">
              <div className="doera-section-header">
                <h3>{reportData.title || 'Structured Research Report'}</h3>
                <button
                  className="doera-link-pill"
                  onClick={() => handleDownloadText(JSON.stringify(reportData, null, 2), 'doera-report.json')}
                >
                  <Download size={14} />
                  <span>Download Report</span>
                </button>
              </div>

              <div className="doera-report-body">
                <p><strong>Objective:</strong> {reportData.objective}</p>
                <p><strong>Executive Summary:</strong> {reportData.executiveSummary}</p>
                {reportData.coreFindings && reportData.coreFindings.map((cf, i) => (
                  <div key={i} className="doera-report-core-finding">
                    <h4>{cf.heading}</h4>
                    <p style={{ margin: 0 }}>{cf.analysis}</p>
                  </div>
                ))}
                {reportData.comparativeAnalysis && (
                  <p><strong>Comparative Analysis:</strong> {reportData.comparativeAnalysis}</p>
                )}
                {reportData.researchGapsAndLimitations && (
                  <div>
                    <strong>Identified Research Gaps:</strong>
                    <ul style={{ paddingLeft: '1.25rem', margin: '0.5rem 0' }}>
                      {reportData.researchGapsAndLimitations.map((g, i) => (
                        <li key={i}>{g}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {reportData.conclusion && (
                  <p><strong>Conclusion:</strong> {reportData.conclusion}</p>
                )}
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#8E8A99' }}>
              <FileText size={36} style={{ margin: '0 auto 1rem', opacity: 0.4 }} />
              <p>Execute a comprehensive research query to synthesize literature reviews, gap reports, and technology comparisons.</p>
            </div>
          )}
        </div>
      )}

      {/* SECTION 9: MISSION HISTORY */}
      {activeTab === 'history' && (
        <div>
          <div className="doera-section-header">
            <h3>Recent Research Sessions</h3>
          </div>

          {historySessions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#8E8A99' }}>
              <History size={36} style={{ margin: '0 auto 1rem', opacity: 0.4 }} />
              <p>No past research missions recorded for this conversation.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {historySessions.map((session, i) => (
                <div
                  key={i}
                  style={{ padding: '1rem', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                >
                  <div>
                    <h4 style={{ margin: '0 0 0.3rem', color: '#FFF', fontSize: '0.95rem' }}>{session.query}</h4>
                    <span style={{ fontSize: '0.75rem', color: '#8E8A99' }}>
                      {new Date(session.createdAt).toLocaleDateString()} • {session.sources?.length || 0} sources • Status: {session.status}
                    </span>
                  </div>
                  <button
                    className="doera-link-pill"
                    onClick={() => {
                      setPrompt(session.query);
                      setActiveTab('workspace');
                      handleExecuteMission(session.query);
                    }}
                  >
                    <span>Re-run</span>
                    <ChevronRight size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MultiAgentWorkspace;
