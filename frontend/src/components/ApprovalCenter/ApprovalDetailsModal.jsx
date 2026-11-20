import React, { useState } from 'react';
import {
  X,
  ShieldCheck,
  AlertTriangle,
  Bot,
  ExternalLink,
  Copy,
  Check,
  Clock,
  DollarSign,
  Send,
  FileText,
  UserCheck,
  CheckCircle2,
  XCircle,
} from 'lucide-react';

const ApprovalDetailsModal = ({ approval, isOpen, onClose }) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !approval) return null;

  const {
    actionTitle,
    actionType,
    actionPayload,
    actionVersion = 1,
    requestingAgent = 'Communication Agent',
    purpose,
    target = {},
    dataDisclosure = [],
    estimatedCost = 0,
    currency = 'INR',
    riskLevel = 'MEDIUM',
    riskExplanation,
    evidence = [],
    executionService = 'n8n Automation Pipeline',
    expectedResult,
    status,
    requestedAt,
    expiresAt,
    approvedAt,
    executedAt,
    executionResult,
    failureReason,
    idempotencyKey,
  } = approval;

  const previewContent =
    actionPayload?.message ||
    actionPayload?.emailText ||
    actionPayload?.whatsappText ||
    (typeof actionPayload === 'object' ? JSON.stringify(actionPayload, null, 2) : String(actionPayload));

  const copyPayload = () => {
    navigator.clipboard.writeText(previewContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getRiskClass = (level) => {
    switch (String(level).toUpperCase()) {
      case 'CRITICAL':
        return 'critical';
      case 'HIGH':
        return 'high';
      case 'LOW':
        return 'low';
      default:
        return 'medium';
    }
  };

  return (
    <div className="doera-modal-backdrop" onClick={onClose}>
      <div className="doera-modal-container" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="doera-modal-header">
          <div className="doera-modal-title">
            <ShieldCheck size={18} color="#F12D98" />
            <span>Approval Request Dossier</span>
            <span className="doera-version-chip">v{actionVersion}</span>
          </div>
          <button type="button" onClick={onClose} className="doera-modal-close-btn" title="Close">
            <X size={18} />
          </button>
        </div>

        {/* Body — 12 Structured Approval Fields */}
        <div className="doera-modal-body">
          {/* 1. Action Title & Category */}
          <div className="doera-detail-section">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span className="doera-action-category-badge">{actionType}</span>
              <span className={`doera-risk-pill ${getRiskClass(riskLevel)}`}>
                <AlertTriangle size={11} />
                {riskLevel} Risk
              </span>
              <span className={`doera-status-pill ${status?.toLowerCase()}`}>{status}</span>
            </div>
            <h3 style={{ fontSize: 17, fontWeight: 700, color: '#FFF', margin: '4px 0 0 0' }}>
              {actionTitle}
            </h3>
          </div>

          {/* 2. Purpose & Explanation */}
          <div className="doera-detail-section">
            <h4 className="doera-section-heading">2. Purpose & Autonomous Justification</h4>
            <p style={{ margin: 0, fontSize: 13, color: '#CDBECF', lineHeight: 1.5 }}>
              {purpose}
            </p>
          </div>

          {/* 3. Requesting AI Agent */}
          <div className="doera-detail-section">
            <h4 className="doera-section-heading">3. Requesting AI Agent</h4>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#EDE4EE' }}>
              <Bot size={15} color="#087F8C" />
              <strong>{requestingAgent}</strong>
            </div>
          </div>

          {/* 4. Target Recipient / Destination Details */}
          <div className="doera-detail-section">
            <h4 className="doera-section-heading">4. Target Recipient / Provider</h4>
            <div className="doera-card-target-box">
              <div className="doera-target-item">
                <span className="doera-target-label">Name:</span>
                <span className="doera-target-val">{target.name || 'Direct Provider'}</span>
              </div>
              <div className="doera-target-item">
                <span className="doera-target-label">Destination:</span>
                <span className="doera-target-val">{target.destination || target.email || target.phone || 'Provider Gateway'}</span>
              </div>
              <div className="doera-target-item">
                <span className="doera-target-label">Channel:</span>
                <span className="doera-target-val">{target.channel || 'Direct Communication'}</span>
              </div>
              {target.address && (
                <div className="doera-target-item" style={{ width: '100%' }}>
                  <span className="doera-target-label">Address:</span>
                  <span className="doera-target-val">{target.address}</span>
                </div>
              )}
            </div>
          </div>

          {/* 5. Exact Message / Form Preview */}
          <div className="doera-detail-section">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h4 className="doera-section-heading">5. Exact Message / Payload Preview</h4>
              <button
                type="button"
                onClick={copyPayload}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#FF55BD',
                  fontSize: 11,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  cursor: 'pointer',
                }}
              >
                {copied ? <Check size={11} /> : <Copy size={11} />}
                <span>{copied ? 'Copied' : 'Copy Payload'}</span>
              </button>
            </div>
            {actionPayload?.subject && (
              <div style={{ fontSize: 12, color: '#FF7BD5', marginBottom: 4, fontWeight: 600 }}>
                Subject: {actionPayload.subject}
              </div>
            )}
            <div className="doera-preview-box">
              {previewContent}
            </div>
          </div>

          {/* 6. Data Disclosure */}
          <div className="doera-detail-section">
            <h4 className="doera-section-heading">6. User Information Disclosed</h4>
            <div className="doera-data-chips">
              {dataDisclosure.length > 0 ? (
                dataDisclosure.map((item, idx) => (
                  <span key={idx} className="doera-data-chip">
                    <UserCheck size={11} style={{ marginRight: 4, display: 'inline' }} />
                    {item}
                  </span>
                ))
              ) : (
                <span style={{ fontSize: 12, color: '#8C7B94' }}>No personal data disclosed beyond inquiry context.</span>
              )}
            </div>
          </div>

          {/* 7. Estimated Cost */}
          <div className="doera-detail-section">
            <h4 className="doera-section-heading">7. Estimated Financial Impact</h4>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#EDE4EE' }}>
              <DollarSign size={15} color="#10B981" />
              <span>
                {estimatedCost > 0 ? `${currency} ${estimatedCost}` : 'Free / No Direct Upfront Charge'}
              </span>
            </div>
          </div>

          {/* 8. Risk Level & Explanation */}
          <div className="doera-detail-section">
            <h4 className="doera-section-heading">8. Risk Assessment</h4>
            <p style={{ margin: 0, fontSize: 12.5, color: '#CDBECF' }}>
              <strong>{riskLevel} Risk:</strong> {riskExplanation || 'Dispatches data to an external provider system.'}
            </p>
          </div>

          {/* 9. Source URLs & Supporting Evidence */}
          <div className="doera-detail-section">
            <h4 className="doera-section-heading">9. Verified Source Evidence</h4>
            {evidence.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {evidence.map((ev, i) => (
                  <div key={i} style={{ fontSize: 12, color: '#EDE4EE', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ color: '#FF55BD' }}>•</span>
                    <span>{ev.title || 'Provider Evidence'}</span>
                    <span style={{ color: '#8C7B94', fontSize: 11 }}>({ev.source || 'Verified Directory'})</span>
                    {ev.url && (
                      <a
                        href={ev.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: '#FF55BD', display: 'inline-flex', alignItems: 'center', gap: 2 }}
                      >
                        <ExternalLink size={11} />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <span style={{ fontSize: 12, color: '#8C7B94' }}>Verified through DOERA Discovery Directory</span>
            )}
          </div>

          {/* 10. Execution Service */}
          <div className="doera-detail-section">
            <h4 className="doera-section-heading">10. Execution Service</h4>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#EDE4EE' }}>
              <Send size={14} color="#9C52E8" />
              <span>{executionService}</span>
            </div>
          </div>

          {/* 11. Expected Result */}
          <div className="doera-detail-section">
            <h4 className="doera-section-heading">11. Expected Execution Result</h4>
            <p style={{ margin: 0, fontSize: 12.5, color: '#CDBECF' }}>
              {expectedResult || 'Target provider will receive inquiry and respond with quote.'}
            </p>
          </div>

          {/* 12. Expiration Time & Cryptographic Idempotency */}
          <div className="doera-detail-section">
            <h4 className="doera-section-heading">12. Timing & Security Audit</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 11.5, color: '#8C7B94' }}>
              <div>Requested: {new Date(requestedAt).toLocaleString()}</div>
              <div>Expires: {expiresAt ? new Date(expiresAt).toLocaleString() : '24 hours from request'}</div>
              {approvedAt && <div style={{ color: '#10B981' }}>Approved At: {new Date(approvedAt).toLocaleString()}</div>}
              {executedAt && <div style={{ color: '#10B981' }}>Executed At: {new Date(executedAt).toLocaleString()}</div>}
              {idempotencyKey && <div style={{ fontFamily: 'monospace' }}>Idempotency Key: {idempotencyKey}</div>}
            </div>
          </div>

          {/* Execution Result Log (if completed or failed) */}
          {executionResult && (
            <div className="doera-detail-section" style={{ borderTop: '1px solid #281432', paddingTop: 12 }}>
              <h4 className="doera-section-heading" style={{ color: '#10B981' }}>
                <CheckCircle2 size={13} style={{ display: 'inline', marginRight: 4 }} />
                Real Execution Outcome
              </h4>
              <div className="doera-preview-box">
                {typeof executionResult === 'object'
                  ? JSON.stringify(executionResult, null, 2)
                  : String(executionResult)}
              </div>
            </div>
          )}

          {failureReason && (
            <div className="doera-detail-section" style={{ borderTop: '1px solid #281432', paddingTop: 12 }}>
              <h4 className="doera-section-heading" style={{ color: '#EF4444' }}>
                <XCircle size={13} style={{ display: 'inline', marginRight: 4 }} />
                Execution Failure Reason
              </h4>
              <p style={{ margin: 0, fontSize: 12.5, color: '#F87171' }}>{failureReason}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="doera-modal-footer">
          <button type="button" onClick={onClose} className="doera-btn-edit">
            Close Dossier
          </button>
        </div>
      </div>
    </div>
  );
};

export default ApprovalDetailsModal;
