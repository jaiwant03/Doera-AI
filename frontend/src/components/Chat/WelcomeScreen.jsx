import React, { useState, useEffect, useCallback } from 'react';
import { 
  Users,
  FileText,
  Image as ImageIcon,
  BarChart3,
  MapPin,
  Mail,
  ArrowUpRight,
  X,
  Copy,
  Check,
  Sparkles,
  Info,
  ShieldCheck,
  CheckCircle2
} from 'lucide-react';

// 6 Core Features of DOERA AI
const CORE_FEATURES = [
  {
    id: 'multi-agent-planning',
    title: 'Multi-Agent Planning',
    shortDesc: 'Orchestrates specialized AI agents to plan, execute, and verify complex goals.',
    icon: Users,
    accentColor: '#C084FC',
    badgeText: 'ORCHESTRATION',
    whatItDoes: 'Coordinates multiple specialized agents—Mission Coordinator, Planner, Research, Budget, Communication, and Verification—through a stateful graph to break complex goals into verified, executable deliverables.',
    howToUse: [
      'Describe your objective, milestone requirements, constraints, or budget in natural language.',
      'The Mission Coordinator decomposes your request into autonomous subtasks.',
      'Specialized agents concurrently draft roadmaps, compute finances, formulate outreach, and gather evidence.',
      'The Verification Agent evaluates constraints and delivers a unified, cross-checked action plan.'
    ],
    examplePrompt: 'I want to organize a two-day college hackathon for 100 participants with a budget of ₹50,000. Prepare a complete execution plan.',
    expectedOutput: 'Structured milestone schedule, itemized ₹50,000 balanced budget table, draft participant & sponsor communications, and verification criteria.',
    notice: null
  },
  {
    id: 'document-intelligence',
    title: 'Document Intelligence',
    shortDesc: 'Extracts text, tables, and structured insights across PDFs, Word, PPTX, and docs.',
    icon: FileText,
    accentColor: '#38BDF8',
    badgeText: 'EXTRACTION & OCR',
    whatItDoes: 'Parses complex multi-page documents (PDFs, DOCX, PPTX, TXT), extracts text and tables while preserving page references, and answers in-depth questions grounded in document contents.',
    howToUse: [
      'Click the paperclip attachment icon in the chat composer to upload one or more documents.',
      'Enter your question, summary request, or architectural audit prompt.',
      'DOERA extracts textual structure, tables, and page-indexed content with OCR fallback for scans.',
      'Receive grounded answers with specific page citations and analytical summaries.'
    ],
    examplePrompt: 'Analyze this project proposal PDF to examine system architecture, identify weaknesses, and recommend improvements.',
    expectedOutput: 'System architecture review, identified vulnerabilities and limitations, and actionable improvements with page number citations.',
    notice: 'Scanned PDFs and image-based documents automatically undergo optical character recognition (OCR).'
  },
  {
    id: 'image-understanding',
    title: 'Image Understanding',
    shortDesc: 'Analyzes screenshots, UI designs, diagrams, and photos with pixel-level precision.',
    icon: ImageIcon,
    accentColor: '#F43F5E',
    badgeText: 'VISION AI',
    whatItDoes: 'Inspects raw image pixels using multimodal vision AI models to understand UI wireframes, flowcharts, technical schematics, handwritten notes, charts, and application screenshots.',
    howToUse: [
      'Attach image files (.png, .jpg, .jpeg, .webp) via the composer attachment button or drag-and-drop.',
      'Ask any question, design critique, code translation request, or transcription prompt.',
      'DOERA evaluates visual hierarchy, components, colors, and embedded text.',
      'Receive actionable feedback, code implementations, or detailed visual interpretations.'
    ],
    examplePrompt: 'Review this UI design screenshot: evaluate user experience flow, visual hierarchy, contrast ratios, and suggest frontend improvements.',
    expectedOutput: 'Comprehensive UX evaluation, accessibility & contrast report, hierarchy breakdown, and recommended UI code snippets.',
    notice: 'Supports UI mockups, architectural flowcharts, data graphs, and photographed physical documents.'
  },
  {
    id: 'data-analytics',
    title: 'Data Analytics & Charts',
    shortDesc: 'Computes statistics, finds trends in Excel/CSV files, and renders interactive charts.',
    icon: BarChart3,
    accentColor: '#2DD4BF',
    badgeText: 'DATA & CHARTS',
    whatItDoes: 'Analyzes user-uploaded spreadsheets (.xlsx, .xls, .csv), detects column types, performs deterministic mathematical calculations, and renders dynamic, interactive visual charts.',
    howToUse: [
      'Attach your Excel or CSV dataset using the composer attachment icon.',
      'Ask for calculations, category breakdowns, summaries, or comparative insights in plain English.',
      'The engine reads sheets, calculates sums and statistics, and identifies trends deterministically.',
      'Interact with live rendered charts (bar, line, pie) and inspect calculated summaries.'
    ],
    examplePrompt: 'Analyze this expense spreadsheet, calculate the highest spending category, and create an interactive bar chart.',
    expectedOutput: 'Exact mathematical totals, highest spending category breakdown, percentage splits, and an interactive visual chart.',
    notice: 'Preserves the original dataset deterministically without altering your uploaded file.'
  },
  {
    id: 'local-service-research',
    title: 'Local Service Research',
    shortDesc: 'Discovers and compares real physical businesses, addresses, ratings, and locations.',
    icon: MapPin,
    accentColor: '#F12D98',
    badgeText: 'LOCAL RESEARCH',
    whatItDoes: 'Researches and benchmarks real-world businesses and service providers across any city using verified directories, operating addresses, ratings, and OpenStreetMap coordinates.',
    howToUse: [
      'State the required service, specific constraints, and location (e.g. city or locality).',
      'The research agent searches verified local listings and retrieves real operational details.',
      'Providers are organized into a side-by-side comparison matrix with ratings and contacts.',
      'Review verified physical addresses and service capabilities to choose the best option.'
    ],
    examplePrompt: 'Find five laptop repair centres in Coimbatore that provide Dell display replacement.',
    expectedOutput: 'Structured comparison table with provider names, verified street addresses, phone numbers, ratings, Dell repair specializations, and coordinates.',
    notice: 'Research-only capability. DOERA does not execute bookings, reservations, payments, or commercial transactions.'
  },
  {
    id: 'email-assistant',
    title: 'Email Assistant',
    shortDesc: 'Drafts high-stakes emails with human approval and dispatches via connected Gmail.',
    icon: Mail,
    accentColor: '#A855F7',
    badgeText: 'COMMUNICATIONS',
    whatItDoes: 'Composes polished, contextual email communications tailored to your tone and audience, featuring human-in-the-loop review and optional direct sending via your connected Gmail.',
    howToUse: [
      'Specify the recipient, objective, required tone (formal, executive, urgent), and key details.',
      'DOERA generates a structured draft including subject line, greeting, body, and closing.',
      'Review and refine the draft in chat with complete control over edits.',
      'Optionally authorize instant dispatch from your connected Gmail address with explicit confirmation.'
    ],
    examplePrompt: 'Prepare a formal academic leave request email to the Head of Department with clear dates and reason.',
    expectedOutput: 'Complete ready-to-dispatch email draft with high-impact subject line, formal salutation, formatted body, and sign-off.',
    notice: 'Direct sending requires a connected Google account. DOERA will never send emails without your explicit authorization.'
  }
];

const WelcomeScreen = ({ onSelectPrompt }) => {
  const [selectedFeature, setSelectedFeature] = useState(null);
  const [copied, setCopied] = useState(false);

  // Close modal on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setSelectedFeature(null);
      }
    };
    if (selectedFeature) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedFeature]);

  // Prevent background scrolling when modal is open
  useEffect(() => {
    if (selectedFeature) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [selectedFeature]);

  const handleCopyPrompt = useCallback(async (promptText) => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(promptText);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = promptText;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.warn('Failed to copy prompt:', err);
    }
  }, []);

  const handleTryFeature = useCallback((promptText) => {
    if (onSelectPrompt) {
      onSelectPrompt(promptText);
    }
    setSelectedFeature(null);
  }, [onSelectPrompt]);

  return (
    <div className="doera-welcome-experience">
      {/* Subtle Ambient Glow Aura */}
      <div className="doera-welcome-top-aura" />

      {/* 1. Header: Small, Elegant Heading & Short Subtitle */}
      <header className="doera-welcome-header">
        <h1 className="doera-welcome-title">
          What would you like to accomplish?
        </h1>
        <p className="doera-welcome-subtitle">
          Choose a capability or simply tell DOERA what you need.
        </p>
      </header>

      {/* 2. Neatly Aligned Grid of 6 Main Feature Cards (3x2 Desktop) */}
      <div className="doera-features-grid" role="region" aria-label="DOERA Capabilities">
        {CORE_FEATURES.map((feature) => {
          const Icon = feature.icon;
          return (
            <button
              key={feature.id}
              type="button"
              className="doera-feature-card"
              onClick={() => setSelectedFeature(feature)}
              style={{ '--card-accent': feature.accentColor }}
              aria-label={`Open tutorial for ${feature.title}`}
            >
              <div className="doera-card-header">
                <div 
                  className="doera-card-icon-box"
                  style={{
                    backgroundColor: `${feature.accentColor}14`,
                    borderColor: `${feature.accentColor}33`,
                    color: feature.accentColor
                  }}
                >
                  <Icon size={18} strokeWidth={2.2} />
                </div>
                <div className="doera-card-arrow">
                  <ArrowUpRight size={16} />
                </div>
              </div>

              <div className="doera-card-body">
                <h2 className="doera-card-title">{feature.title}</h2>
                <p className="doera-card-desc">{feature.shortDesc}</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* 3. Interactive Feature Tutorial Modal */}
      {selectedFeature && (
        <div 
          className="doera-modal-backdrop animate-fade-in"
          onClick={() => setSelectedFeature(null)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-feature-title"
        >
          <div 
            className="doera-tutorial-modal animate-scale-up"
            onClick={(e) => e.stopPropagation()}
            style={{ '--modal-accent': selectedFeature.accentColor }}
          >
            {/* Modal Header */}
            <div className="doera-modal-header">
              <div className="doera-modal-header-left">
                <div 
                  className="doera-modal-icon-badge"
                  style={{
                    backgroundColor: `${selectedFeature.accentColor}18`,
                    borderColor: `${selectedFeature.accentColor}40`,
                    color: selectedFeature.accentColor
                  }}
                >
                  {React.createElement(selectedFeature.icon, { size: 20, strokeWidth: 2.2 })}
                </div>
                <div>
                  <div className="doera-modal-badge" style={{ color: selectedFeature.accentColor }}>
                    {selectedFeature.badgeText}
                  </div>
                  <h2 id="modal-feature-title" className="doera-modal-title">
                    {selectedFeature.title}
                  </h2>
                </div>
              </div>
              <button 
                type="button"
                className="doera-modal-close-btn"
                onClick={() => setSelectedFeature(null)}
                aria-label="Close feature details"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Scrollable Content */}
            <div className="doera-modal-body">
              {/* Section 1: What It Does */}
              <div className="doera-modal-section">
                <h3 className="doera-section-heading">What it does</h3>
                <p className="doera-section-text">{selectedFeature.whatItDoes}</p>
              </div>

              {/* Section 2: How To Use (Numbered Steps) */}
              <div className="doera-modal-section">
                <h3 className="doera-section-heading">How to use</h3>
                <ol className="doera-steps-list">
                  {selectedFeature.howToUse.map((step, idx) => (
                    <li key={idx} className="doera-step-item">
                      <span 
                        className="doera-step-number"
                        style={{
                          backgroundColor: `${selectedFeature.accentColor}1A`,
                          borderColor: `${selectedFeature.accentColor}4D`,
                          color: selectedFeature.accentColor
                        }}
                      >
                        {idx + 1}
                      </span>
                      <span className="doera-step-content">{step}</span>
                    </li>
                  ))}
                </ol>
              </div>

              {/* Section 3: Example Prompt */}
              <div className="doera-modal-section">
                <div className="doera-prompt-header">
                  <h3 className="doera-section-heading">Example prompt</h3>
                  <button
                    type="button"
                    className="doera-copy-prompt-btn"
                    onClick={() => handleCopyPrompt(selectedFeature.examplePrompt)}
                    title="Copy prompt"
                  >
                    {copied ? (
                      <>
                        <Check size={13} className="text-emerald-400" />
                        <span className="text-emerald-400">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy size={13} />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
                <div className="doera-prompt-box">
                  <p className="doera-prompt-text">"{selectedFeature.examplePrompt}"</p>
                </div>
              </div>

              {/* Section 4: Expected Output */}
              <div className="doera-modal-section">
                <h3 className="doera-section-heading">Expected output</h3>
                <div className="doera-output-box">
                  <div className="doera-output-indicator" style={{ backgroundColor: selectedFeature.accentColor }} />
                  <p className="doera-output-text">{selectedFeature.expectedOutput}</p>
                </div>
              </div>

              {/* Optional Notice */}
              {selectedFeature.notice && (
                <div className="doera-modal-notice">
                  <Info size={16} className="doera-notice-icon" />
                  <p className="doera-notice-text">{selectedFeature.notice}</p>
                </div>
              )}
            </div>

            {/* Modal Footer Actions */}
            <div className="doera-modal-footer">
              <button
                type="button"
                className="doera-btn-secondary"
                onClick={() => setSelectedFeature(null)}
              >
                Close
              </button>
              <button
                type="button"
                className="doera-btn-primary"
                onClick={() => handleTryFeature(selectedFeature.examplePrompt)}
              >
                <Sparkles size={16} />
                <span>Try This Feature</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WelcomeScreen;
