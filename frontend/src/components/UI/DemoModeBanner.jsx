import React, { useState } from 'react';
import { ShieldCheck, Info, CheckCircle2, ChevronRight, X, MailCheck, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './DemoModeBanner.css';

export const DemoModeBanner = () => {
  const { user } = useAuth();
  const [showDetails, setShowDetails] = useState(false);

  const isRealMode = user?.executionMode === 'REAL' && user?.authProvider === 'google';
  const isGmailConnected = user?.gmailIntegrationStatus === 'connected';
  const connectedEmail = user?.connectedGmailEmail || user?.googleEmail;

  return (
    <>
      <div className={`doera-demo-banner ${isRealMode ? (isGmailConnected ? 'real-active-banner' : 'real-eligible-banner') : 'demo-mode-banner'}`}>
        <div className="doera-demo-banner-content">
          {isRealMode ? (
            isGmailConnected ? (
              <div className="doera-demo-badge real-active">
                <span className="doera-demo-dot real-active" />
                <MailCheck size={14} color="#10B981" />
                <span className="doera-demo-badge-text real-active">DOERA AI — REAL AUTOMATION ACTIVE</span>
              </div>
            ) : (
              <div className="doera-demo-badge real-eligible">
                <span className="doera-demo-dot real-eligible" />
                <ShieldCheck size={14} color="#F12D98" />
                <span className="doera-demo-badge-text real-eligible">DOERA AI — REAL AUTOMATION ELIGIBLE</span>
              </div>
            )
          ) : (
            <div className="doera-demo-badge demo-only">
              <span className="doera-demo-dot" />
              <ShieldCheck size={14} className="doera-demo-icon" />
              <span className="doera-demo-badge-text">DOERA AI — HACKATHON DEMO MODE</span>
            </div>
          )}

          <div className="doera-demo-separator">•</div>

          <p className="doera-demo-disclaimer">
            {isRealMode ? (
              isGmailConnected ? (
                <span>
                  Authorized Gmail Sender: <strong style={{ color: '#10B981' }}>{connectedEmail}</strong>. Real email dispatches execute with explicit human approval.
                </span>
              ) : (
                <span>
                  Google-verified account (<strong style={{ color: '#FF55BD' }}>{user?.googleEmail || user?.email}</strong>). Connect Gmail in{' '}
                  <Link to="/settings" style={{ color: '#FF55BD', textDecoration: 'underline' }}>
                    Integrations & Settings
                  </Link>{' '}
                  to enable real outbound email sending.
                </span>
              )
            ) : (
              'All external actions are simulated. No real emails, WhatsApp messages, bookings or payments are performed.'
            )}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowDetails(true)}
          className="doera-demo-info-btn"
          title="Inspect Execution Architecture"
        >
          <Info size={13} />
          <span>{isRealMode ? 'Execution Mode Info' : 'Architecture Details'}</span>
        </button>
      </div>

      {showDetails && (
        <div className="doera-demo-modal-backdrop" onClick={() => setShowDetails(false)}>
          <div className="doera-demo-modal" onClick={(e) => e.stopPropagation()}>
            <div className="doera-demo-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <ShieldCheck size={20} color={isRealMode ? '#FF55BD' : '#2DD4BF'} />
                <h3 className="doera-demo-modal-title">
                  {isRealMode ? 'Real-Time Automation Architecture (Mode A)' : 'Hackathon Demo Mode Architecture (Mode B)'}
                </h3>
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
                  <div className="doera-arch-label">
                    {isRealMode ? '🔐 Verified Google OAuth' : '👤 Local Account Mode'}
                  </div>
                  <p>
                    {isRealMode
                      ? `Authenticated via verified Google Subject ID. User identity: ${user?.googleEmail || user?.email}. Every user operates strictly through their own credentials.`
                      : 'Signed in via email & password. Safe hackathon mode permanently prevents unintended live external dispatches.'}
                  </p>
                </div>

                <div className="doera-demo-arch-card">
                  <div className="doera-arch-label">
                    {isRealMode ? (isGmailConnected ? '✉️ Live Gmail Dispatch' : '⚠️ Gmail Connect Required') : '🛡️ Full Simulator Pipeline'}
                  </div>
                  <p>
                    {isRealMode
                      ? (isGmailConnected
                          ? `Emails are dispatched directly from ${connectedEmail} using your own AES-256-GCM encrypted OAuth token. No shared email accounts.`
                          : 'You are eligible for real automation. To send real emails, visit Settings and click "Connect Gmail for Automation" with explicit consent.')
                      : 'All outbound calls to Gmail, WhatsApp, Telegram, calendar events, and payments route to DemoExecutionService with verified simulated receipts.'}
                  </p>
                </div>

                <div className="doera-demo-arch-card">
                  <div className="doera-arch-label">🛑 Human-in-the-Loop Approval</div>
                  <p>
                    Every outbound action—real or simulated—requires explicit approval in the Human Approval Center before execution. Recipient, subject, and payload are locked and tamper-checked.
                  </p>
                </div>

                <div className="doera-demo-arch-card">
                  <div className="doera-arch-label">📋 Proof of Execution</div>
                  <p>
                    {isRealMode && isGmailConnected
                      ? 'Dispatches return genuine Google API message IDs stored as immutable Execution Evidence in MongoDB.'
                      : 'Dispatches return deterministic simulated evidence (e.g. DEMO-EMAIL-0001) for audit verification.'}
                  </p>
                </div>
              </div>
            </div>

            <div className="doera-demo-modal-footer">
              <span style={{ fontSize: 11, color: '#A38FA8' }}>
                DOERA AI 3.0 Platform • {isRealMode ? 'Real Multi-Tenant OAuth' : 'Safe Hackathon Deployment'}
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
