import React, { useState } from 'react';
import { X, XCircle, AlertTriangle } from 'lucide-react';

const ApprovalRejectModal = ({ approval, isOpen, onClose, onReject }) => {
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !approval) return null;

  const handleConfirm = async () => {
    setIsSubmitting(true);
    try {
      await onReject(reason.trim());
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="doera-modal-backdrop" onClick={onClose}>
      <div className="doera-modal-container" style={{ maxWidth: 500 }} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="doera-modal-header">
          <div className="doera-modal-title" style={{ color: '#F87171' }}>
            <XCircle size={18} color="#EF4444" />
            <span>Reject Proposed Action</span>
          </div>
          <button type="button" onClick={onClose} className="doera-modal-close-btn" title="Close">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="doera-modal-body">
          <p style={{ margin: 0, fontSize: 13, color: '#EDE4EE', lineHeight: 1.5 }}>
            Are you sure you want to reject <strong>{approval.actionTitle}</strong>?
            This will halt the current execution and cancel dispatch to {approval.target?.name || 'the provider'}.
          </p>

          <div className="doera-detail-section">
            <label style={{ fontSize: 12, fontWeight: 600, color: '#D3C4D6' }}>
              Adjustment Instructions / Reason (Optional):
            </label>
            <textarea
              rows={4}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Please search for an alternative provider or adjust requested consultation timing..."
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: 8,
                background: '#0B0510',
                border: '1px solid #361744',
                color: '#FFF',
                fontSize: 12.5,
                lineHeight: 1.4,
                outline: 'none',
                resize: 'none',
                fontFamily: 'inherit',
              }}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="doera-modal-footer">
          <button type="button" onClick={onClose} className="doera-btn-edit">
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isSubmitting}
            className="doera-btn-reject"
            style={{ padding: '8px 18px', fontWeight: 600 }}
          >
            Confirm Rejection
          </button>
        </div>
      </div>
    </div>
  );
};

export default ApprovalRejectModal;
