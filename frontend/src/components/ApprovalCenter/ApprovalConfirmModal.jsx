import React, { useState } from 'react';
import { AlertTriangle, ShieldCheck, X, CheckCircle2 } from 'lucide-react';

const ApprovalConfirmModal = ({ approval, isOpen, onClose, onConfirm }) => {
  const [understood, setUnderstood] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !approval) return null;

  const isHighImpact =
    ['HIGH', 'CRITICAL'].includes(approval.riskLevel) ||
    ['BOOK_APPOINTMENT', 'CONFIRM_BOOKING', 'EXECUTE_PAYMENT', 'SUBMIT_FORM'].includes(approval.actionType);

  const handleConfirm = async () => {
    setIsSubmitting(true);
    try {
      await onConfirm();
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="doera-modal-backdrop" onClick={onClose}>
      <div className="doera-modal-container" style={{ maxWidth: 520 }} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="doera-modal-header">
          <div className="doera-modal-title" style={{ color: '#FBBF24' }}>
            <AlertTriangle size={18} color="#FBBF24" />
            <span>High-Impact Action Confirmation</span>
          </div>
          <button type="button" onClick={onClose} className="doera-modal-close-btn" title="Close">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="doera-modal-body">
          <p style={{ margin: 0, fontSize: 13.5, color: '#EDE4EE', lineHeight: 1.5 }}>
            You are authorizing <strong>{approval.actionTitle}</strong>.
            This action will execute externally via <strong>{approval.executionService}</strong>.
          </p>

          <div
            style={{
              background: '#160B20',
              border: '1px solid #361744',
              borderRadius: 8,
              padding: '12px 14px',
              fontSize: 12.5,
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
            }}
          >
            <div>
              <span style={{ color: '#8C7B94' }}>Action Category:</span>{' '}
              <strong style={{ color: '#FFF' }}>{approval.actionType}</strong>
            </div>
            <div>
              <span style={{ color: '#8C7B94' }}>Target:</span>{' '}
              <strong style={{ color: '#FFF' }}>{approval.target?.name || approval.target?.destination || 'Provider'}</strong>
            </div>
            {approval.estimatedCost > 0 && (
              <div>
                <span style={{ color: '#8C7B94' }}>Financial Commitment:</span>{' '}
                <strong style={{ color: '#10B981' }}>{approval.currency} {approval.estimatedCost}</strong>
              </div>
            )}
            <div>
              <span style={{ color: '#8C7B94' }}>Risk Level:</span>{' '}
              <span style={{ color: approval.riskLevel === 'CRITICAL' ? '#EF4444' : '#FBBF24', fontWeight: 700 }}>
                {approval.riskLevel}
              </span>
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 10,
              padding: '10px 12px',
              background: 'rgba(245, 158, 11, 0.08)',
              border: '1px solid rgba(245, 158, 11, 0.3)',
              borderRadius: 8,
            }}
          >
            <ShieldCheck size={16} color="#FBBF24" style={{ flexShrink: 0, marginTop: 2 }} />
            <span style={{ fontSize: 12, color: '#FDE68A', lineHeight: 1.4 }}>
              This authorization triggers real-world execution. Once dispatched, this action cannot be recalled.
            </span>
          </div>

          {/* Explicit User Checkbox */}
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              cursor: 'pointer',
              fontSize: 12.5,
              color: '#EDE4EE',
              paddingTop: 4,
            }}
          >
            <input
              type="checkbox"
              checked={understood}
              onChange={(e) => setUnderstood(e.target.checked)}
              style={{ accentColor: '#F12D98', width: 16, height: 16, cursor: 'pointer' }}
            />
            <span>I have reviewed the payload and authorize DOERA AI to execute this action.</span>
          </label>
        </div>

        {/* Footer */}
        <div className="doera-modal-footer">
          <button type="button" onClick={onClose} className="doera-btn-edit">
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!understood || isSubmitting}
            className="doera-btn-approve-primary"
            style={{
              opacity: !understood || isSubmitting ? 0.5 : 1,
              cursor: !understood || isSubmitting ? 'not-allowed' : 'pointer',
            }}
          >
            <CheckCircle2 size={14} />
            <span>Confirm & Execute</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ApprovalConfirmModal;
