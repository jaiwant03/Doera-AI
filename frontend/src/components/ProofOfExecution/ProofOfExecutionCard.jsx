import React, { useState } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  Clock,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  FileText,
  AlertCircle,
  Copy,
  Check,
} from 'lucide-react';
import './ProofOfExecutionCard.css';

export const ProofOfExecutionCard = ({ evidence }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!evidence) return null;

  const {
    actionType,
    status = 'DELIVERED',
    actionSummary,
    target = {},
    service = 'Gmail / Native API',
    externalReferenceId,
    verifiedResponse,
    executedAt,
    sourceUrl,
  } = evidence;

  const statusClass = (() => {
    switch (status) {
      case 'CONFIRMED':
      case 'VERIFIED':
        return 'status-confirmed';
      case 'DELIVERED':
      case 'ACCEPTED':
        return 'status-delivered';
      case 'SUBMITTED':
      case 'APPROVED':
        return 'status-submitted';
      case 'APPROVAL_PENDING':
      case 'PREPARED':
        return 'status-pending';
      case 'FAILED':
        return 'status-failed';
      default:
        return 'status-delivered';
    }
  })();

  const handleCopyRef = (text) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formattedDate = executedAt
    ? new Date(executedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : 'Just now';

  return (
    <div className="doera-proof-card">
      <div className="doera-proof-header">
        <div className="doera-proof-title-wrap">
          <div className="doera-proof-badge-icon">
            <ShieldCheck size={14} />
          </div>
          <div>
            <div className="doera-proof-title">
              {actionSummary || `Execution Proof: ${actionType || 'Verified Action'}`}
            </div>
          </div>
        </div>

        <span className={`doera-proof-status-pill ${statusClass}`}>
          {status === 'CONFIRMED' ? (
            <CheckCircle2 size={11} />
          ) : status === 'FAILED' ? (
            <AlertCircle size={11} />
          ) : (
            <Clock size={11} />
          )}
          {status.replace(/_/g, ' ')}
        </span>
      </div>

      {/* Prominent Hackathon Safe Simulation Badge */}
      <div
        style={{
          margin: '8px 14px 10px 14px',
          padding: '6px 10px',
          background: 'rgba(8, 127, 140, 0.15)',
          border: '1px solid rgba(8, 127, 140, 0.35)',
          borderRadius: 6,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          fontSize: 10.5,
          fontWeight: 700,
          color: '#2DD4BF',
          letterSpacing: '0.3px',
        }}
      >
        <ShieldCheck size={13} color="#2DD4BF" style={{ flexShrink: 0 }} />
        <span>SIMULATED EXECUTION — NO REAL EXTERNAL ACTION PERFORMED</span>
      </div>

      <div className="doera-proof-body">
        {target?.recipient && (
          <div className="doera-proof-field">
            <span className="doera-proof-label">Recipient / Provider</span>
            <span className="doera-proof-value">
              {target.name ? `${target.name} (${target.recipient})` : target.recipient}
            </span>
          </div>
        )}

        <div className="doera-proof-field">
          <span className="doera-proof-label">Transport Channel</span>
          <span className="doera-proof-value">{service}</span>
        </div>

        {externalReferenceId && (
          <div className="doera-proof-field">
            <span className="doera-proof-label">Verification Reference ID</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span className="doera-proof-ref">{externalReferenceId}</span>
              <button
                type="button"
                onClick={() => handleCopyRef(externalReferenceId)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#A38FA8', padding: 0 }}
                title="Copy reference ID"
              >
                {copied ? <Check size={12} color="#10B981" /> : <Copy size={12} />}
              </button>
            </div>
          </div>
        )}

        <div className="doera-proof-field">
          <span className="doera-proof-label">Timestamp</span>
          <span className="doera-proof-value">{formattedDate}</span>
        </div>
      </div>

      {verifiedResponse && (
        <div style={{ marginTop: 10 }}>
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            style={{
              background: 'none',
              border: 'none',
              color: '#F12D98',
              fontSize: 11.5,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              padding: 0,
            }}
          >
            {isExpanded ? 'Hide Raw Provider Response' : 'View Verified Provider Response'}
            {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>

          {isExpanded && (
            <div
              style={{
                marginTop: 8,
                padding: '10px 12px',
                background: '#040206',
                border: '1px solid #23112E',
                borderRadius: 8,
                fontSize: 11.5,
                fontFamily: 'monospace',
                color: '#D1C4D4',
                maxHeight: 160,
                overflowY: 'auto',
                whiteSpace: 'pre-wrap',
              }}
            >
              {typeof verifiedResponse === 'object'
                ? JSON.stringify(verifiedResponse, null, 2)
                : verifiedResponse}
            </div>
          )}
        </div>
      )}

      <div className="doera-proof-footer">
        <span className="doera-proof-audit-tag">
          <ShieldCheck size={12} />
          DOERA Anti-Hallucination & Truthful Execution Policy Active
        </span>

        {sourceUrl && (
          <a
            href={sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              color: '#F12D98',
              textDecoration: 'none',
              fontWeight: 600,
            }}
          >
            Source Proof <ExternalLink size={11} />
          </a>
        )}
      </div>
    </div>
  );
};

export default ProofOfExecutionCard;
