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
  BarChart3,
  FileSpreadsheet,
  Search,
  Mail,
} from 'lucide-react';
import './ProofOfExecutionCard.css';

export const ProofOfExecutionCard = ({ evidence }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!evidence) return null;

  const {
    actionType,
    evidenceType,
    status = 'VERIFIED',
    verificationStatus,
    actionSummary,
    requestSummary,
    target = {},
    targetData = {},
    service = 'DOERA Execution Engine',
    externalProvider,
    externalReferenceId,
    externalReference,
    verifiedResponse,
    actualProviderResponse,
    executedAt,
    createdAt,
    sourceUrl,
    sourceUrls = [],
    isSimulated,
    executionMode,
    deliverableRef,
  } = evidence;

  const effectiveStatus = (verificationStatus || status || 'VERIFIED').toUpperCase();
  const effectiveRef = externalReference || externalReferenceId;
  const effectiveService = externalProvider || service;
  const isSim = isSimulated === true || executionMode === 'SIMULATED' || effectiveStatus === 'SIMULATED';

  const statusClass = (() => {
    switch (effectiveStatus) {
      case 'CONFIRMED':
      case 'VERIFIED':
        return 'status-verified';
      case 'COMPLETED_UNVERIFIED':
        return 'status-unverified';
      case 'SIMULATED':
        return 'status-simulated';
      case 'DELIVERED':
      case 'ACCEPTED':
        return 'status-delivered';
      case 'SUBMITTED':
      case 'APPROVED':
        return 'status-submitted';
      case 'APPROVAL_PENDING':
      case 'PREPARED':
      case 'PENDING':
        return 'status-pending';
      case 'FAILED':
        return 'status-failed';
      default:
        return 'status-verified';
    }
  })();

  const statusDisplay = (() => {
    switch (effectiveStatus) {
      case 'VERIFIED':
      case 'CONFIRMED':
        return 'VERIFIED';
      case 'COMPLETED_UNVERIFIED':
        return 'COMPLETED (UNVERIFIED)';
      case 'SIMULATED':
        return 'SIMULATED';
      case 'PENDING':
      case 'APPROVAL_PENDING':
        return 'PENDING';
      case 'FAILED':
        return 'FAILED';
      default:
        return effectiveStatus.replace(/_/g, ' ');
    }
  })();

  const handleCopyRef = (text) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formattedDate = (executedAt || createdAt)
    ? new Date(executedAt || createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : 'Just now';

  return (
    <div className="doera-proof-card">
      <div className="doera-proof-header">
        <div className="doera-proof-title-wrap">
          <div className="doera-proof-badge-icon">
            {evidenceType === 'SPREADSHEET_ANALYSED' ? (
              <FileSpreadsheet size={14} />
            ) : evidenceType === 'CHART_GENERATED' ? (
              <BarChart3 size={14} />
            ) : evidenceType === 'RESEARCH_COMPLETED' ? (
              <Search size={14} />
            ) : evidenceType === 'EMAIL_SENT' ? (
              <Mail size={14} />
            ) : evidenceType === 'DOCUMENT_PROCESSED' ? (
              <FileText size={14} />
            ) : (
              <ShieldCheck size={14} />
            )}
          </div>
          <div>
            <div className="doera-proof-title">
              {requestSummary || actionSummary || `Execution Proof: ${actionType || 'Verified Task'}`}
            </div>
            {evidenceType && (
              <div style={{ fontSize: 10, color: '#A38FA8', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 2 }}>
                Evidence Record: {evidenceType.replace(/_/g, ' ')}
              </div>
            )}
          </div>
        </div>

        <span className={`doera-proof-status-pill ${statusClass}`}>
          {effectiveStatus === 'VERIFIED' || effectiveStatus === 'CONFIRMED' ? (
            <CheckCircle2 size={11} />
          ) : effectiveStatus === 'FAILED' ? (
            <AlertCircle size={11} />
          ) : (
            <Clock size={11} />
          )}
          {statusDisplay}
        </span>
      </div>

      {/* Detailed Target Data Display */}
      <div className="doera-proof-body">
        {targetData?.filename && (
          <div className="doera-proof-field">
            <span className="doera-proof-label">Processed File</span>
            <span className="doera-proof-value" style={{ fontFamily: 'monospace' }}>
              {targetData.filename} {targetData.pageCount ? `(${targetData.pageCount} pages)` : ''}
              {targetData.rowCount ? `(${targetData.rowCount} rows, ${targetData.columnCount} cols)` : ''}
            </span>
          </div>
        )}

        {targetData?.chartType && (
          <div className="doera-proof-field">
            <span className="doera-proof-label">Chart Type & Series</span>
            <span className="doera-proof-value">
              {targetData.chartType.toUpperCase()} ({targetData.dataPointsCount || targetData.labels?.length || 0} Data Points)
            </span>
          </div>
        )}

        {target?.recipient && (
          <div className="doera-proof-field">
            <span className="doera-proof-label">Recipient</span>
            <span className="doera-proof-value">
              {target.name ? `${target.name} (${target.recipient})` : target.recipient}
            </span>
          </div>
        )}

        <div className="doera-proof-field">
          <span className="doera-proof-label">Execution Channel</span>
          <span className="doera-proof-value">{effectiveService}</span>
        </div>

        {effectiveRef && (
          <div className="doera-proof-field">
            <span className="doera-proof-label">Reference ID</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span className="doera-proof-ref">{effectiveRef}</span>
              <button
                type="button"
                onClick={() => handleCopyRef(effectiveRef)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#A38FA8', padding: 0 }}
                title="Copy reference ID"
              >
                {copied ? <Check size={12} color="#10B981" /> : <Copy size={12} />}
              </button>
            </div>
          </div>
        )}

        {deliverableRef && (
          <div className="doera-proof-field">
            <span className="doera-proof-label">Deliverable Ref</span>
            <span className="doera-proof-value" style={{ color: '#F12D98', fontWeight: 600 }}>
              {deliverableRef}
            </span>
          </div>
        )}

        <div className="doera-proof-field">
          <span className="doera-proof-label">Execution Time</span>
          <span className="doera-proof-value">{formattedDate}</span>
        </div>
      </div>

      {/* Citations / Source URLs */}
      {(sourceUrls.length > 0 || sourceUrl) && (
        <div style={{ marginTop: 10, paddingTop: 8, borderTop: '1px solid #1E0F28' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#A38FA8', marginBottom: 4, textTransform: 'uppercase' }}>
            Verified Research Sources ({sourceUrls.length || (sourceUrl ? 1 : 0)})
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {sourceUrls.map((s, idx) => (
              <a
                key={idx}
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  fontSize: 11,
                  padding: '3px 8px',
                  borderRadius: 4,
                  background: 'rgba(241, 45, 152, 0.1)',
                  color: '#FF55BD',
                  textDecoration: 'none',
                  border: '1px solid rgba(241, 45, 152, 0.25)',
                }}
              >
                {s.title || s.url} <ExternalLink size={10} />
              </a>
            ))}
            {sourceUrls.length === 0 && sourceUrl && (
              <a
                href={sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  fontSize: 11,
                  padding: '3px 8px',
                  borderRadius: 4,
                  background: 'rgba(241, 45, 152, 0.1)',
                  color: '#FF55BD',
                  textDecoration: 'none',
                  border: '1px solid rgba(241, 45, 152, 0.25)',
                }}
              >
                Source Proof <ExternalLink size={10} />
              </a>
            )}
          </div>
        </div>
      )}

      {/* Raw Provider Response Dropdown */}
      {(actualProviderResponse || verifiedResponse) && (
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
                fontSize: 11,
                fontFamily: 'monospace',
                color: '#D1C4D4',
                maxHeight: 160,
                overflowY: 'auto',
                whiteSpace: 'pre-wrap',
              }}
            >
              {JSON.stringify(actualProviderResponse || verifiedResponse, null, 2)}
            </div>
          )}
        </div>
      )}

      <div className="doera-proof-footer">
        <span className="doera-proof-audit-tag">
          <ShieldCheck size={12} />
          DOERA Anti-Hallucination & Truthful Execution Policy Active
        </span>
      </div>
    </div>
  );
};

export default ProofOfExecutionCard;
