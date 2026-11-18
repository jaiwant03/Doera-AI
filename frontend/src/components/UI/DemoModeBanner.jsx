import React, { useState } from 'react';
import { ShieldCheck, Info, CheckCircle2, ChevronRight, X } from 'lucide-react';
import './DemoModeBanner.css';

export const DemoModeBanner = () => {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <>
      <div className="doera-demo-banner">
        <div className="doera-demo-banner-content">
          <div className="doera-demo-badge">
            <span className="doera-demo-dot" />
            <ShieldCheck size={14} className="doera-demo-icon" />
            <span className="doera-demo-badge-text">DOERA AI — HACKATHON DEMO MODE</span>
          </div>

          <div className="doera-demo-separator">•</div>

          <p className="doera-demo-disclaimer">
            All external actions are simulated. No real emails, WhatsApp messages, bookings or payments are performed.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowDetails(true)}
          className="doera-demo-info-btn"
          title="Inspect Safe Demo Architecture"
        >
          <Info size={13} />
          <span>Architecture Details</span>
        </button>
      </div>

      {showDetails && (
        <div className="doera-demo-modal-backdrop" onClick={() => setShowDetails(false)}>
          <div className="doera-demo-modal" onClick={(e) => e.stopPropagation()}>
            <div className="doera-demo-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <ShieldCheck size={20} color="#2DD4BF" />
                <h3 className="doera-demo-modal-title">Hackathon Demo Mode Architecture</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowDetails(false)}
                className="doera-demo-modal-close"
              >
                <X size={16} />
              </button>
            </div>

            <div className="doera-demo-modal-body">
              <div className="doera-demo-arch-grid">
                <div className="doera-demo-arch-card">
                  <div className="doera-arch-label">🧠 Real AI Reasoning</div>
                  <p>
                    Full Groq LLaMA 3.3 natural-language understanding, multi-agent LangGraph orchestration, dynamic planning, OpenStreetMap live queries, and real task state tracking are fully functional.
                  </p>
                </div>

                <div className="doera-demo-arch-card">
                  <div className="doera-arch-label">🛡️ Fail-Closed Security</div>
                  <p>
                    Backend enforces <code>DEMO_MODE=true</code>. Any attempt to reach personal Gmail, WhatsApp, Telegram, or payment gateways is blocked at the core execution router.
                  </p>
                </div>

                <div className="doera-demo-arch-card">
                  <div className="doera-arch-label">📋 Audit & Evidence</div>
                  <p>
                    External dispatches generate verified simulated execution receipts (<code>DEMO-EMAIL-0001</code>, <code>DEMO-WHATSAPP-0001</code>) stored in an isolated demo database.
                  </p>
                </div>

                <div className="doera-demo-arch-card">
                  <div className="doera-arch-label">⏱️ Autonomous Follow-Ups</div>
                  <p>
                    Simulated vendor replies and quotations are scheduled in the backend and delivered to Mission Control and Chat in real time.
                  </p>
                </div>
              </div>
            </div>

            <div className="doera-demo-modal-footer">
              <span style={{ fontSize: 11, color: '#A38FA8' }}>
                DOERA AI 3.0 Platform • Safe Hackathon Deployment
              </span>
              <button
                type="button"
                onClick={() => setShowDetails(false)}
                className="doera-demo-close-action"
              >
                Understood
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default DemoModeBanner;
