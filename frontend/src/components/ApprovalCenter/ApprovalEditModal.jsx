import React, { useState } from 'react';
import { X, Edit3, ShieldAlert, CheckCircle2 } from 'lucide-react';

const ApprovalEditModal = ({ approval, isOpen, onClose, onSave }) => {
  if (!isOpen || !approval) return null;

  const currentPayload = approval.actionPayload || {};
  const currentTarget = approval.target || {};

  const [destination, setDestination] = useState(
    currentTarget.destination || currentTarget.email || currentTarget.phone || currentPayload.recipient || ''
  );
  const [subject, setSubject] = useState(currentPayload.subject || approval.actionTitle || '');
  const [message, setMessage] = useState(
    currentPayload.message || currentPayload.emailText || currentPayload.whatsappText || ''
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSaveOnly = async () => {
    setIsSubmitting(true);
    try {
      await onSave({
        target: { ...currentTarget, destination, email: destination.includes('@') ? destination : currentTarget.email },
        actionPayload: {
          ...currentPayload,
          subject,
          message,
          emailText: message,
          whatsappText: message,
        },
      }, false);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveAndApprove = async () => {
    setIsSubmitting(true);
    try {
      await onSave({
        target: { ...currentTarget, destination, email: destination.includes('@') ? destination : currentTarget.email },
        actionPayload: {
          ...currentPayload,
          subject,
          message,
          emailText: message,
          whatsappText: message,
        },
      }, true);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="doera-modal-backdrop" onClick={onClose}>
      <div className="doera-modal-container" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="doera-modal-header">
          <div className="doera-modal-title">
            <Edit3 size={17} color="#FF55BD" />
            <span>Edit Proposed Action (v{approval.actionVersion} ➔ v{(approval.actionVersion || 1) + 1})</span>
          </div>
          <button type="button" onClick={onClose} className="doera-modal-close-btn" title="Close">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="doera-modal-body">
          {/* Version Increment Notice */}
          <div
            style={{
              padding: '10px 14px',
              borderRadius: 8,
              background: 'rgba(241, 45, 152, 0.1)',
              border: '1px solid rgba(241, 45, 152, 0.3)',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              fontSize: 12,
              color: '#EDE4EE',
            }}
          >
            <ShieldAlert size={16} color="#FF55BD" />
            <span>
              Modifying these details will update the action to <strong>Version {(approval.actionVersion || 1) + 1}</strong>.
              Execution will only proceed using your exact approved revisions.
            </span>
          </div>

          {/* Destination */}
          <div className="doera-detail-section">
            <label style={{ fontSize: 12, fontWeight: 600, color: '#D3C4D6' }}>
              Target Recipient / Destination Address:
            </label>
            <input
              type="text"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              placeholder="e.g. clinic@example.com or +91 98765 43210"
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: 8,
                background: '#160B20',
                border: '1px solid #361744',
                color: '#FFF',
                fontSize: 13,
                outline: 'none',
              }}
            />
          </div>

          {/* Subject */}
          <div className="doera-detail-section">
            <label style={{ fontSize: 12, fontWeight: 600, color: '#D3C4D6' }}>
              Inquiry / Action Subject:
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Subject line"
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: 8,
                background: '#160B20',
                border: '1px solid #361744',
                color: '#FFF',
                fontSize: 13,
                outline: 'none',
              }}
            />
          </div>

          {/* Message Body */}
          <div className="doera-detail-section">
            <label style={{ fontSize: 12, fontWeight: 600, color: '#D3C4D6' }}>
              Exact Message Content / Directive:
            </label>
            <textarea
              rows={6}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Full text message or directive to dispatch..."
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: 8,
                background: '#0B0510',
                border: '1px solid #361744',
                color: '#FFF',
                fontSize: 12.5,
                lineHeight: 1.5,
                outline: 'none',
                resize: 'vertical',
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
            onClick={handleSaveOnly}
            disabled={isSubmitting}
            className="doera-btn-edit"
          >
            Save Revision (v{(approval.actionVersion || 1) + 1})
          </button>
          <button
            type="button"
            onClick={handleSaveAndApprove}
            disabled={isSubmitting}
            className="doera-btn-approve-primary"
          >
            <CheckCircle2 size={14} />
            <span>Save & Authorize Now</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ApprovalEditModal;
