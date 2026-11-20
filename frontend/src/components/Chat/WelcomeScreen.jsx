import React from 'react';
import { 
  Zap, 
  Layers, 
  Compass, 
  FileSpreadsheet, 
  Workflow, 
  FileText,
  Laptop,
  Building2,
  ShieldCheck,
  Sparkles,
  BarChart3,
  Eye,
  Mail
} from 'lucide-react';

// 3 Preconfigured Guided Universal AI Scenarios
const HACKATHON_GUIDED_SCENARIOS = [
  {
    id: 'scenario-laptop-repair',
    title: 'Local Service Research: Coimbatore Laptop Repair',
    subtitle: 'Location Discovery + Provider Matrix + Distance & Ratings Comparison',
    prompt: 'Find five laptop repair centres in Coimbatore that provide Dell display replacement.',
    tags: ['Verified Research', 'OSM Coordinates', 'Provider Comparison'],
    accentColor: '#F12D98',
    badgeText: 'LOCAL RESEARCH',
    icon: Laptop,
  },
  {
    id: 'scenario-spreadsheet-chart',
    title: 'Spreadsheet Intelligence: Expense Analytics & Chart',
    subtitle: 'Cell Calculations + Category Insights + Interactive Visualization',
    prompt: 'Analyze this expense spreadsheet, calculate the highest spending category, and create a bar chart.',
    tags: ['XLSX/CSV Analytics', 'Deterministic Math', 'Dynamic Chart'],
    accentColor: '#2DD4BF',
    badgeText: 'DATA ANALYTICS',
    icon: BarChart3,
  },
  {
    id: 'scenario-hackathon-mission',
    title: 'Multi-Agent Collaboration: 2-Day College Hackathon',
    subtitle: 'Planning Agent + Budget Model + Communications Suite + Verification',
    prompt: 'I want to organize a two-day college hackathon for 100 participants with a budget of ₹50,000. Prepare a complete execution plan.',
    tags: ['Schedule Roadmap', '₹50,000 Budget Balance', '3 Official Drafts'],
    accentColor: '#C084FC',
    badgeText: 'MULTI-AGENT',
    icon: Building2,
  },
];

// 5 Core Universal Capabilities of DOERA AI
const DOERA_PROJECT_FEATURES = [
  {
    id: 'multi-agent-planning',
    title: 'Dynamic Multi-Agent Collaboration',
    desc: 'Coordinating Planner, Research, Budget, Communication, and Verification agents through LangGraph StateGraphs',
    prompt: 'I want to organize a two-day college hackathon for 100 participants with a budget of ₹50,000. Prepare a complete execution plan.',
    icon: Layers,
  },
  {
    id: 'location-intelligence',
    title: 'Live Location Intelligence (Research-Only)',
    desc: 'Discovers verified physical businesses, operating addresses, contact details, and OpenStreetMap coordinates',
    prompt: 'Find five laptop repair centres in Coimbatore that provide Dell display replacement.',
    icon: Compass,
  },
  {
    id: 'spreadsheet-charts',
    title: 'Spreadsheet Intelligence & Dynamic Charts',
    desc: 'Reads rows, columns, and numbers from Excel and CSV files, computes summaries, and renders interactive charts',
    prompt: 'Analyze my expenses spreadsheet, identify the highest spending category, and generate a visual bar chart.',
    icon: FileSpreadsheet,
  },
  {
    id: 'document-vision',
    title: 'Document Intelligence & Vision Agent',
    desc: 'Extracts PDFs, Word docs, and PowerPoint slides with page references, and performs pixel-level visual analysis on images',
    prompt: 'Analyze this project proposal PDF to examine system architecture, identify weaknesses, and recommend improvements.',
    icon: FileText,
  },
  {
    id: 'verified-gmail',
    title: 'Verified Communication & Gmail Integration',
    desc: 'Generates polished drafts with human confirmation; Google-authorized users can dispatch directly from their Gmail identity',
    prompt: 'Prepare a formal academic leave request email to the Head of Department with clear dates and reason.',
    icon: Mail,
  },
];

const WelcomeScreen = ({ onSelectPrompt }) => {
  return (
    <div className="doera-welcome-experience">
      {/* 1. Subtle Ambient Top Aura */}
      <div className="doera-welcome-top-aura" />

      {/* 2. Hero Branding & Tagline */}
      <div className="doera-welcome-hero">
        <div className="doera-welcome-badge animate-fadeUp">
          <span className="doera-welcome-badge-dot" />
          <span className="doera-welcome-badge-text">UNIVERSAL AI PLATFORM 2.0</span>
        </div>

        <h1 className="doera-welcome-title animate-fadeUp" style={{ animationDelay: '80ms' }}>
          Don't Just Ask AI. <span className="doera-gradient-text">Let DOERA Get It Done.</span>
        </h1>

        <p className="doera-welcome-subtitle animate-fadeUp" style={{ animationDelay: '140ms' }}>
          Universal intelligent request understanding, autonomous multi-agent planning, document intelligence, live location research, dynamic charts, and Mission Control telemetry.
        </p>
      </div>

      {/* 3. Three Guided Core Use Cases */}
      <div className="doera-guided-section animate-fadeUp" style={{ animationDelay: '200ms' }}>
        <div className="doera-section-header">
          <span className="doera-section-tag">PRIMARY USE CASES</span>
          <h2 className="doera-section-title">Tested End-to-End Mission Workflows</h2>
        </div>

        <div className="doera-scenarios-grid">
          {HACKATHON_GUIDED_SCENARIOS.map((sc) => {
            const Icon = sc.icon;
            return (
              <div
                key={sc.id}
                className="doera-scenario-card"
                onClick={() => onSelectPrompt(sc.prompt)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelectPrompt(sc.prompt);
                  }
                }}
              >
                <div className="doera-scenario-top">
                  <span
                    className="doera-scenario-badge"
                    style={{
                      backgroundColor: `${sc.accentColor}18`,
                      borderColor: `${sc.accentColor}50`,
                      color: sc.accentColor,
                    }}
                  >
                    {sc.badgeText}
                  </span>
                  <div
                    className="doera-scenario-icon"
                    style={{
                      backgroundColor: `${sc.accentColor}14`,
                      color: sc.accentColor,
                      borderColor: `${sc.accentColor}30`,
                    }}
                  >
                    <Icon size={16} />
                  </div>
                </div>

                <h3 className="doera-scenario-title">{sc.title}</h3>
                <p className="doera-scenario-subtitle">{sc.subtitle}</p>

                <div className="doera-scenario-prompt-box">
                  <span className="doera-scenario-prompt-text">"{sc.prompt}"</span>
                </div>

                <div className="doera-scenario-footer">
                  <div className="doera-scenario-tags">
                    {sc.tags.map((tag, tIdx) => (
                      <span key={tIdx} className="doera-tag-pill">
                        {tag}
                      </span>
                    ))}
                  </div>
                  <span className="doera-scenario-run-btn" style={{ color: sc.accentColor }}>
                    Run Mission →
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. Five Core Capabilities */}
      <div className="doera-features-section animate-fadeUp" style={{ animationDelay: '260ms' }}>
        <div className="doera-section-header">
          <span className="doera-section-tag">PLATFORM CAPABILITIES</span>
          <h2 className="doera-section-title">Universal Multi-Agent Architecture</h2>
        </div>

        <div className="doera-features-grid">
          {DOERA_PROJECT_FEATURES.map((feat) => {
            const Icon = feat.icon;
            return (
              <div
                key={feat.id}
                className="doera-feature-card"
                onClick={() => onSelectPrompt(feat.prompt)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelectPrompt(feat.prompt);
                  }
                }}
              >
                <div className="doera-feature-icon-box">
                  <Icon size={18} />
                </div>
                <h4 className="doera-feature-title">{feat.title}</h4>
                <p className="doera-feature-desc">{feat.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default WelcomeScreen;
