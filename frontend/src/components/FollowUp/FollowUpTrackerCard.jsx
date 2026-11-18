import React, { useState } from 'react';
import {
  BellRing,
  Clock,
  RefreshCw,
  CheckCircle2,
  StopCircle,
  AlertTriangle,
} from 'lucide-react';
import followUpService from '../../services/followUpService';
import './FollowUpTrackerCard.css';

export const FollowUpTrackerCard = ({ followUp, onUpdated }) => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(followUp);

  if (!data) return null;

  const {
    _id,
    recipient,
    recipientName,
    channel = 'Email',
    status = 'WAITING',
    attemptCount = 0,
    maximumAttempts = 3,
    nextCheckAt,
    notes,
  } = data;

  const handleCheckNow = async () => {
    if (!_id || loading) return;
    try {
      setLoading(true);
      const res = await followUpService.checkNow(_id);
      if (res?.followUp) {
        setData(res.followUp);
        onUpdated?.(res.followUp);
      }
    } catch (err) {
      console.error('[FollowUp] Check now failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleStop = async () => {
    if (!_id || loading) return;
    try {
      setLoading(true);
      const res = await followUpService.stopFollowUp(_id);
      if (res?.followUp) {
        setData(res.followUp);
        onUpdated?.(res.followUp);
      }
    } catch (err) {
      console.error('[FollowUp] Stop failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const formattedNext = nextCheckAt
    ? new Date(nextCheckAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : '24 hours';

  const isTerminal = status === 'COMPLETED' || status === 'STOPPED' || status === 'RESPONSE_RECEIVED';

  return (
    <div className="doera-followup-card">
      <div className="doera-followup-header">
        <div className="doera-followup-title-wrap">
          <div className="doera-followup-icon">
            <BellRing size={14} />
          </div>
          <div className="doera-followup-title">
            Autonomous Follow-Up & Response Tracker
          </div>
        </div>

        <span
          style={{
            fontSize: '10.5px',
            fontWeight: 700,
            textTransform: 'uppercase',
            padding: '3px 8px',
            borderRadius: '20px',
            background:
              status === 'RESPONSE_RECEIVED' || status === 'COMPLETED'
                ? 'rgba(16, 185, 129, 0.15)'
                : status === 'STOPPED'
                ? 'rgba(100, 116, 139, 0.2)'
                : 'rgba(156, 82, 232, 0.15)',
            color:
              status === 'RESPONSE_RECEIVED' || status === 'COMPLETED'
                ? '#10B981'
                : status === 'STOPPED'
                ? '#94A3B8'
                : '#C084FC',
            border: '1px solid currentColor',
          }}
        >
          {status.replace(/_/g, ' ')}
        </span>
      </div>

      <div className="doera-followup-grid">
        <div className="doera-followup-field">
          <span className="doera-followup-label">Target Recipient</span>
          <span className="doera-followup-value">
            {recipientName ? `${recipientName} (${recipient})` : recipient}
          </span>
        </div>

        <div className="doera-followup-field">
          <span className="doera-followup-label">Outreach Channel</span>
          <span className="doera-followup-value">{channel}</span>
        </div>

        <div className="doera-followup-field">
          <span className="doera-followup-label">Check Attempts</span>
          <span className="doera-followup-value">
            {attemptCount} / {maximumAttempts} checks completed
          </span>
        </div>

        <div className="doera-followup-field">
          <span className="doera-followup-label">Next Verification Due</span>
          <span className="doera-followup-value">{isTerminal ? 'Concluded' : formattedNext}</span>
        </div>
      </div>

      {/* Simulated Vendor Reply Box */}
      {data.lastResponse?.responseMessage && (
        <div
          style={{
            margin: '10px 0',
            padding: '10px 12px',
            background: 'rgba(16, 185, 129, 0.08)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            borderRadius: 8,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <CheckCircle2 size={13} color="#10B981" />
            <span style={{ fontSize: 11, fontWeight: 700, color: '#10B981', textTransform: 'uppercase' }}>
              Simulated Vendor Reply Received
            </span>
          </div>
          <div style={{ fontSize: 12, color: '#E2D9E5', fontStyle: 'italic', lineHeight: 1.45 }}>
            "{data.lastResponse.responseMessage}"
          </div>
          {data.lastResponse.feeEstimate && (
            <div style={{ fontSize: 11, color: '#34D399', fontWeight: 600, marginTop: 4 }}>
              Quote / Fee: {data.lastResponse.feeEstimate}
            </div>
          )}
        </div>
      )}

      {notes && (
        <div style={{ fontSize: 11.5, color: '#A38FA8', marginBottom: 10 }}>
          {notes}
        </div>
      )}

      {!isTerminal && (
        <div className="doera-followup-actions">
          <button
            type="button"
            className="doera-btn-check-now"
            onClick={handleCheckNow}
            disabled={loading}
            title="Trigger immediate backend check or simulate response"
          >
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
            Simulate Response Check
          </button>

          <button
            type="button"
            className="doera-btn-stop"
            onClick={handleStop}
            disabled={loading}
          >
            <StopCircle size={12} />
            Stop Tracking
          </button>
        </div>
      )}
    </div>
  );
};

export default FollowUpTrackerCard;
