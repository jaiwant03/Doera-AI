import React from 'react';
import { 
  Zap, 
  Layers, 
  Compass, 
  Calendar, 
  Workflow, 
  ArrowUpRight,
  HeartPulse,
  Laptop,
  Building2,
  ShieldCheck,
  Sparkles
} from 'lucide-react';

// 3 Preconfigured Guided Hackathon Scenarios
const HACKATHON_GUIDED_SCENARIOS = [
  {
    id: 'scenario-cardiology',
    title: 'Scenario 1: Cardiology Clinics in Chennai',
    subtitle: 'Location Discovery + Human Approval + Simulated Appointment Reservation',
    prompt: 'Find top-rated cardiology clinics in Chennai near Greams Road, verify consultation fee, and coordinate booking an appointment.',
    tags: ['Leaflet Map', 'Human Approval', 'DEMO-BOOKING-0001'],
    accentColor: '#2DD4BF',
    badgeText: 'SCENARIO 1',
    icon: HeartPulse,
  },
  {
    id: 'scenario-laptop',
    title: 'Scenario 2: Laptop Chipset Repair in Coimbatore',
    subtitle: 'Hardware Center Search + Multi-Vendor Rate Comparison + WhatsApp Outreach',
    prompt: 'Find verified laptop repair centers in Coimbatore for Dell display replacement, compare quotations, and send inquiry outreach.',
    tags: ['Quotation Matrix', 'Outreach Dispatch', 'DEMO-WHATSAPP-0001'],
    accentColor: '#F12D98',
    badgeText: 'SCENARIO 2',
    icon: Laptop,
  },
  {
    id: 'scenario-venue',
    title: 'Scenario 3: Technical Event Venues in Chennai',
    subtitle: 'Symposium Hall Audit + Rental Comparison + Automated Response Tracking',
    prompt: 'Find conference and symposium venues in Chennai for 200+ attendees, compare daily hall rental packages, and initialize follow-up tracking.',
    tags: ['Venue Comparison', 'Follow-Up Engine', 'DEMO-EMAIL-0001'],
    accentColor: '#C084FC',
    badgeText: 'SCENARIO 3',
    icon: Building2,
  },
];

// 5 Big Feature Cards of DOERA AI
const DOERA_PROJECT_FEATURES = [
  {
    id: 'agent-swarm',
    title: 'Autonomous Agent Swarm',
    desc: 'Orchestrates 9 specialized agents in parallel for end-to-end task execution and decision making',
    prompt: 'Deploy an autonomous agent swarm to find verified electricians in Coimbatore, compare quotations, and coordinate booking.',
    icon: Layers,
  },
  {
    id: 'real-world-execution',
    title: 'Real-World Task Execution',
    desc: 'Directly coordinates verified local services, bookings, calendar scheduling, and external actions',
    prompt: 'Find nearby appliance repair services, verify earliest available slot, and schedule an inspection.',
    icon: Zap,
  },
  {
    id: 'deep-research',
    title: 'Deep Web & Market Research',
    desc: 'Synthesizes verified real-time data, multi-vendor comparisons, and structured market intelligence',
    prompt: 'Research commercial liability insurance providers for a 50-person tech company and summarize the top 3 options.',
    icon: Compass,
  },
  {
    id: 'smart-scheduling',
    title: 'Smart Scheduling & Automation',
    desc: 'Resolves calendar conflicts, manages appointment reservations, and sends proactive notifications',
    prompt: 'Find top-rated cardiologists in Chennai with appointment consultation slots available this week.',
    icon: Calendar,
  },
  {
    id: 'n8n-pipelines',
    title: 'Proactive Workflows & n8n Pipelines',
    desc: 'Executes multi-step background automations, event webhooks, and verified external integrations',
    prompt: 'Monitor flight prices from Chennai to London for next month and alert me when prices drop below $600.',
    icon: Workflow,
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
          <span className="doera-welcome-badge-text">AUTONOMOUS PLATFORM 2.0</span>
        </div>

        <h1 className="doera-welcome-main-heading">
          <span className="doera-hero-line-white animate-fadeUp delay-1">
            Think beyond answers,
          </span>
          <span className="doera-hero-line-gradient animate-fadeUp delay-2">
            make things happen.
          </span>
        </h1>

        <p className="doera-welcome-sub-tagline animate-fadeUp delay-3">
          <strong className="doera-brand-accent">DOERA AI</strong> — More than intelligence. Real-world action.
        </p>
      </div>

      {/* 2.5 PRECONFIGURED HACKATHON GUIDED SCENARIOS */}
      <div className="doera-scenarios-section animate-fadeUp delay-3">
        <div className="doera-scenarios-header">
          <div className="doera-scenarios-title-wrap">
            <Sparkles size={16} color="#FF55BD" />
            <span className="doera-scenarios-section-title">GUIDED HACKATHON DEMONSTRATIONS</span>
          </div>
          <span className="doera-scenarios-hint">Click any scenario to launch full autonomous multi-agent execution in safe demo mode</span>
        </div>

        <div className="doera-scenarios-grid">
          {HACKATHON_GUIDED_SCENARIOS.map((scenario) => {
            const IconComp = scenario.icon;
            return (
              <button
                key={scenario.id}
                type="button"
                onClick={() => onSelectPrompt && onSelectPrompt(scenario.prompt)}
                className="doera-scenario-card"
                style={{ '--scenario-accent': scenario.accentColor }}
              >
                <div className="doera-scenario-top">
                  <span className="doera-scenario-badge" style={{ color: scenario.accentColor, borderColor: scenario.accentColor }}>
                    {scenario.badgeText}
                  </span>
                  <div className="doera-scenario-icon-box" style={{ color: scenario.accentColor }}>
                    <IconComp size={18} />
                  </div>
                </div>

                <div className="doera-scenario-meta">
                  <h3 className="doera-scenario-title">{scenario.title}</h3>
                  <p className="doera-scenario-sub">{scenario.subtitle}</p>
                </div>

                <div className="doera-scenario-tags">
                  {scenario.tags.map((tag) => (
                    <span key={tag} className="doera-scenario-tag">{tag}</span>
                  ))}
                </div>

                <div className="doera-scenario-footer">
                  <span className="doera-scenario-cta">Run Demonstration ➔</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Five Big Feature Cards of DOERA AI */}
      <div className="doera-features-section animate-fadeUp delay-4">
        <div className="doera-features-grid">
          {DOERA_PROJECT_FEATURES.map((feature) => {
            const IconComponent = feature.icon;
            return (
              <button
                key={feature.id}
                type="button"
                onClick={() => onSelectPrompt && onSelectPrompt(feature.prompt)}
                className="doera-feature-card"
              >
                <div className="doera-feature-icon-box">
                  <IconComponent size={20} strokeWidth={2.2} />
                </div>
                <div className="doera-feature-meta">
                  <h3 className="doera-feature-title">{feature.title}</h3>
                  <p className="doera-feature-desc">{feature.desc}</p>
                </div>
                <div className="doera-feature-arrow">
                  <ArrowUpRight size={17} />
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default WelcomeScreen;
