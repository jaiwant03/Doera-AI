import React, { useState } from 'react';
import { 
  CheckCircle2, 
  AlertCircle, 
  XCircle, 
  ExternalLink, 
  Calendar, 
  Phone, 
  MapPin, 
  RotateCcw,
  Building,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  Clock,
  ShieldCheck
} from 'lucide-react';
import { useChat } from '../../context/ChatContext';

const TaskCompletionCard = ({ task }) => {
  const { resumeTask } = useChat();
  const [copied, setCopied] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  if (!task) return null;

  const isCompleted = task.status === 'COMPLETED';
  const isPartial = task.status === 'PARTIALLY_COMPLETED';
  const isAwaitingConfirmation = task.status === 'AWAITING_CONFIRMATION';
  const isActionRequired = task.status === 'ACTION_REQUIRED' || task.status === 'AWAITING_APPROVAL';
  const isFailed = task.status === 'FAILED';
  const isCancelled = task.status === 'CANCELLED';

  const outcome = task.outcome || {};
  const contacted = outcome.contacted || task.externalContacts || [];
  const bookings = outcome.booking || task.bookingDetails || null;
  const actionsPerformed = outcome.actionsPerformed || task.actionsPerformed || [];

  const isBookingConfirmed = Boolean(
    bookings &&
    bookings.bookingStatus === 'CONFIRMED' &&
    bookings.providerConfirmationId
  );

  const copyDetails = () => {
    const textToCopy = `DOERA AI Task Report [${task.taskId || task._id}]\nStatus: ${task.status}\nRequest: ${task.userRequest}\nProvider: ${contacted[0]?.businessName || 'N/A'}\n${isBookingConfirmed ? `Provider Confirmation: ${bookings.providerConfirmationId}` : `DOERA Tracking Code: ${bookings?.internalReferenceId || task.taskId}`}\n${bookings ? `Slot: ${bookings.dateTime || bookings.date}` : ''}`;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const headerStatusClass = isCompleted 
    ? 'completed' 
    : (isPartial || isAwaitingConfirmation || isActionRequired)
    ? 'partial' 
    : isCancelled 
    ? 'cancelled' 
    : 'failed';

  return (
    <div className="doera-completion-card">
      {/* Compact Status Header */}
      <div className={`doera-completion-header ${headerStatusClass}`}>
        <div className="doera-completion-header-left">
          {isCompleted && <CheckCircle2 size={18} style={{ color: 'var(--ramagreen)', flexShrink: 0 }} />}
          {isPartial && <AlertCircle size={18} style={{ color: 'var(--amber)', flexShrink: 0 }} />}
          {isAwaitingConfirmation && <Clock size={18} style={{ color: '#06B6D4', flexShrink: 0 }} />}
          {isActionRequired && <ShieldCheck size={18} style={{ color: '#F59E0B', flexShrink: 0 }} />}
          {isFailed && <XCircle size={18} style={{ color: 'var(--rose)', flexShrink: 0 }} />}
          {isCancelled && <XCircle size={18} style={{ color: 'var(--muted)', flexShrink: 0 }} />}

          <div>
            <div className="doera-completion-title-box">
              <span className="doera-completion-title">
                {isCompleted && 'Task Completed & Verified'}
                {isPartial && 'Partially Completed'}
                {isAwaitingConfirmation && 'Awaiting Provider Confirmation'}
                {isActionRequired && 'Authorization Required'}
                {isFailed && 'Execution Halt'}
                {isCancelled && 'Task Cancelled'}
              </span>
              <span className="doera-ref-pill">
                {task.taskId || task._id}
              </span>
            </div>
            <div style={{ fontSize: 10, color: 'var(--muted)' }}>
              {task.updatedAt ? new Date(task.updatedAt).toLocaleString() : new Date().toLocaleString()}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button onClick={copyDetails} className="doera-btn-icon" title="Copy report">
            {copied ? <Check size={14} style={{ color: 'var(--ramagreen)' }} /> : <Copy size={14} />}
          </button>
          {isFailed && (
            <button
              onClick={() => resumeTask(task._id || task.taskId)}
              style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'var(--rose)', color: '#FFFFFF', padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600 }}
            >
              <RotateCcw size={12} />
              <span>Retry</span>
            </button>
          )}
        </div>
      </div>

      {/* Structured Content Body */}
      <div className="doera-completion-body">
        {/* Request */}
        <div className="doera-req-summary">
          <strong>Request:</strong> "{task.userRequest || 'Autonomous task execution'}"
        </div>

        {/* Verified Provider Result */}
        {contacted.length > 0 && (
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 6 }}>
              Discovered Real-World Providers
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {contacted.slice(0, 3).map((contact, idx) => (
                <div key={idx} className="doera-provider-card">
                  <div className="doera-provider-top">
                    <div className="doera-provider-name-box">
                      <Building size={14} style={{ color: 'var(--peacock)' }} />
                      <span>{contact.businessName || contact.name || 'Service Provider'}</span>
                      {contact.rating ? (
                        <span className="doera-rating-badge">★ {contact.rating}</span>
                      ) : (
                        <span style={{ fontSize: 9.5, color: '#94A3B8' }}>(Directory verified)</span>
                      )}
                    </div>
                    {contact.sourceUrl && (
                      <a
                        href={contact.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ fontSize: 10, color: 'var(--peacock)', display: 'flex', alignItems: 'center', gap: 3 }}
                      >
                        <span>View Source</span>
                        <ExternalLink size={10} />
                      </a>
                    )}
                  </div>

                  <div className="doera-provider-details-grid">
                    {contact.address && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        <MapPin size={12} style={{ flexShrink: 0 }} />
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{contact.address}</span>
                      </div>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Phone size={12} style={{ color: contact.phone ? 'var(--ramagreen)' : '#94A3B8', flexShrink: 0 }} />
                      <span style={{ color: contact.phone ? 'inherit' : '#94A3B8' }}>
                        {contact.phone || 'Phone not publicly listed'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Booking Details */}
        {bookings && (
          <div className="doera-booking-box">
            <div className="doera-booking-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Calendar size={14} />
                <span>
                  {isBookingConfirmed ? 'Confirmed Appointment' : 'Appointment Request (Pending Provider Confirmation)'}
                </span>
              </div>
              {isBookingConfirmed && bookings.providerConfirmationId ? (
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, background: '#ECFDF5', color: '#059669', padding: '1px 6px', borderRadius: 4, border: '1px solid #A7F3D0' }}>
                  Code: {bookings.providerConfirmationId}
                </span>
              ) : (
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, background: '#F8FAFC', color: '#64748B', padding: '1px 6px', borderRadius: 4, border: '1px solid #E2E8F0' }}>
                  Tracking ID: {bookings.internalReferenceId || bookings.referenceId || task.taskId}
                </span>
              )}
            </div>
            <div style={{ fontSize: 11, color: 'var(--charcoal)', marginTop: 4 }}>
              <div><strong>Slot:</strong> {bookings.dateTime || bookings.date}</div>
              {bookings.service && <div><strong>Service:</strong> {bookings.service}</div>}
              {bookings.location && <div><strong>Location:</strong> {bookings.location}</div>}
              {!isBookingConfirmed && (
                <div style={{ marginTop: 4, fontStyle: 'italic', color: '#B45309' }}>
                  * Formal appointment confirmation requires confirmation from the provider's reception or booking system.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Response Outcome */}
        {outcome.responseReceived && (
          <div style={{ padding: 10, background: 'var(--peacock-light)', border: '1px solid var(--peacock-border)', borderRadius: 8, fontSize: 11, color: 'var(--charcoal)' }}>
            <strong style={{ color: 'var(--peacock)', display: 'block', marginBottom: 2 }}>Communication Outcome:</strong>
            {outcome.responseReceived}
          </div>
        )}

        {/* Collapsible History */}
        {actionsPerformed.length > 0 && (
          <div>
            <div onClick={() => setShowHistory(!showHistory)} className="doera-accordion-btn">
              <span>{showHistory ? 'Hide execution actions' : `View ${actionsPerformed.length} execution actions`}</span>
              {showHistory ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </div>

            {showHistory && (
              <div className="doera-history-list">
                {actionsPerformed.map((act, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                    <span style={{ color: 'var(--ramagreen)', fontWeight: 700 }}>✓</span>
                    <span>{act}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Failure reason if any */}
        {isFailed && task.error && (
          <div style={{ padding: 10, background: 'var(--rose-light)', border: '1px solid var(--rose-border)', borderRadius: 8, fontSize: 11, color: 'var(--rose)' }}>
            <strong>Diagnosis:</strong> {task.error.message || task.error}
          </div>
        )}
      </div>
    </div>
  );
};

export default TaskCompletionCard;
