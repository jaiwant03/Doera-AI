import React from 'react';
import {
  ShieldCheck,
  AlertTriangle,
  Bot,
  Clock,
  DollarSign,
  Send,
  Eye,
  Edit3,
  CheckCircle2,
  XCircle,
  ExternalLink,
} from 'lucide-react';

const ApprovalCard = ({
  approval,
  onApprove,
  onEdit,
  onReject,
  onViewDetails,
}) => {
  if (!approval) return null;

  const {
    _id,
    actionTitle,
    actionType,
    actionVersion = 1,
    requestingAgent = 'Communication Agent',
    purpose,
    target = {},
    estimatedCost = 0,
    currency = 'INR',
    riskLevel = 'MEDIUM',
    executionService = 'Direct Integration',
    status = 'PENDING_APPROVAL',
    requestedAt,
    expiresAt,
    executionResult,
    failureReason,
  } = approval;

  const isPending = status === 'PENDING_APPROVAL';
  const isApproved = status === 'APPROVED' || status === 'EXECUTED';
  const isRejected = status === 'REJECTED';
  const isExecuting = status === 'EXECUTING';

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

  const getStatusClass = (st) => {
    switch (String(st).toUpperCase()) {
      case 'PENDING_APPROVAL':
        return 'pending';
      case 'APPROVED':
        return 'approved';
      case 'EXECUTING':
        return 'executing';
      case 'EXECUTED':
        return 'executed';
      case 'REJECTED':
        return 'rejected';
      case 'FAILED':
        return 'failed';
      case 'EXPIRED':
        return 'expired';
      default:
        return 'pending';
    }
  };

  const formatTimeAgo = (dateStr) => {
    if (!dateStr) return 'Recently';
    const date = new Date(dateStr);
    const now = new Date();
    const diffSec = Math.floor((now - date) / 1000);
    if (diffSec < 60) return 'Just now';
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const formatExpiresIn = (dateStr) => {
    if (!dateStr) return null;
    const exp = new Date(dateStr);
    const now = new Date();
    const diffMs = exp - now;
    if (diffMs <= 0) return 'Expired';
    const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
    if (diffHrs < 1) {
      const diffMins = Math.floor(diffMs / (1000 * 60));
      return `Expires in ${diffMins}m`;
    }
    return `Expires in ${diffHrs}h`;
  };

  return (
    <div className={`doera-approval-card ${getStatusClass(status)}`}>
      {/* Top Badges Row */}
      <div className="doera-card-top-row">
        <div className="doera-card-badges-left">
          <span className="doera-action-category-badge">{actionType}</span>
          <div className="doera-agent-tag">
            <Bot size={13} color="#087F8C" />
            <span>{requestingAgent}</span>
          </div>
          <span className="doera-version-chip">v{actionVersion}</span>
        </div>

        <div className="doera-card-badges-right">
          <span className={`doera-risk-pill ${getRiskClass(riskLevel)}`}>
            <AlertTriangle size={11} />
            {riskLevel} Risk
          </span>
          <span className={`doera-status-pill ${getStatusClass(status)}`}>
            {status}
          </span>
        </div>
      </div>

      {/* Permanent Demo Mode Simulation Warning Banner */}
      <div
        style={{
          margin: '10px 0 6px 0',
          padding: '6px 10px',
          background: 'rgba(8, 127, 140, 0.12)',
          border: '1px solid rgba(8, 127, 140, 0.35)',
          borderRadius: 6,
          display: 'flex',
          alignItems: 'center',
          gap: 7,
          fontSize: 11,
          fontWeight: 600,
          color: '#2DD4BF',
          letterSpacing: '0.2px',
        }}
      >
        <ShieldCheck size={13} color="#2DD4BF" style={{ flexShrink: 0 }} />
        <span>SIMULATED EXECUTION — NO REAL EXTERNAL ACTION PERFORMED</span>
      </div>

      {/* Title & Purpose */}
      <div className="doera-card-body">
        <h3 className="doera-card-title">{actionTitle}</h3>
        <p className="doera-card-purpose">{purpose}</p>
      </div>

      {/* Target Recipient Box */}
      <div className="doera-card-target-box">
        <div className="doera-target-item">
          <span className="doera-target-label">Target:</span>
          <span className="doera-target-val">{target.name || 'Direct Provider'}</span>
        </div>
        <div className="doera-target-item">
          <span className="doera-target-label">Destination:</span>
          <span className="doera-target-val">{target.destination || target.email || target.phone || 'Direct Gateway'}</span>
        </div>
        <div className="doera-target-item">
          <span className="doera-target-label">Pipeline:</span>
          <span className="doera-target-val" style={{ color: '#C084FC' }}>{executionService}</span>
        </div>
      </div>

      {/* Card Metadata Footer */}
      <div className="doera-card-meta-row">
        <div className="doera-meta-group">
          {estimatedCost > 0 && (
            <div className="doera-meta-item" style={{ color: '#10B981', fontWeight: 600 }}>
              <DollarSign size={13} />
              <span>{currency} {estimatedCost}</span>
            </div>
          )}
          <div className="doera-meta-item">
            <Clock size={12} />
            <span>Requested {formatTimeAgo(requestedAt)}</span>
          </div>
          {isPending && expiresAt && (
            <div className="doera-meta-item" style={{ color: '#FBBF24' }}>
              <span>• {formatExpiresIn(expiresAt)}</span>
            </div>
          )}
        </div>

        {/* Execution Snippet if complete or failed */}
        {executionResult && (
          <div style={{ color: '#10B981', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}>
            <CheckCircle2 size={12} />
            <span>Execution Verified</span>
          </div>
        )}
        {failureReason && (
          <div style={{ color: '#F87171', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}>
            <XCircle size={12} />
            <span>Execution Halt: {failureReason}</span>
          </div>
        )}
      </div>

      {/* Controls Toolbar */}
      <div className="doera-card-actions">
        <button
          type="button"
          onClick={() => onViewDetails(approval)}
          className="doera-btn-details"
          title="Inspect full 12-point dossier and evidence"
        >
          <Eye size={13} />
          <span>View Dossier & Evidence</span>
        </button>

        {(isPending || status === 'FAILED') && (
          <>
            <button
              type="button"
              onClick={() => onReject(approval)}
              className="doera-btn-reject"
              title="Reject or revise action"
            >
              <XCircle size={13} />
              <span>Reject</span>
            </button>

            <button
              type="button"
              onClick={() => onEdit(approval)}
              className="doera-btn-edit"
              title="Edit parameters before authorizing"
            >
              <Edit3 size={13} />
              <span>Edit & Approve</span>
            </button>

            <button
              type="button"
              onClick={() => onApprove(approval)}
              className="doera-btn-approve-primary"
              title={status === 'FAILED' ? 'Retry and execute action' : 'Authorize and execute action immediately'}
            >
              <CheckCircle2 size={14} />
              <span>{status === 'FAILED' ? 'Retry & Execute' : 'Approve & Execute'}</span>
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default ApprovalCard;
