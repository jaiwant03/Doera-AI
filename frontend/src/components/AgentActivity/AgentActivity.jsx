import React, { useState } from 'react';
import { 
  CheckCircle2, 
  Circle, 
  Clock, 
  AlertTriangle, 
  ShieldCheck, 
  XCircle, 
  Bot, 
  ChevronDown, 
  ChevronUp,
  Building,
  Phone,
  FileText,
  ExternalLink
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useChat } from '../../context/ChatContext';

const AgentActivity = ({ task }) => {
  const { approveTask, rejectTask, cancelTask } = useChat();
  const [showDetails, setShowDetails] = useState(true);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDraftPreview, setShowDraftPreview] = useState(true);

  if (!task) return null;

  const steps = task.steps || [
    { id: 'understand', name: 'Request understood & analyzed', status: 'completed' },
    { id: 'plan', name: 'Autonomous execution plan synthesized', status: task.status === 'UNDERSTANDING' ? 'in_progress' : 'completed' },
    { id: 'discover', name: 'Verified service providers discovered', status: task.status === 'EXECUTING' && task.currentAgent === 'Discovery' ? 'in_progress' : (task.status === 'PLANNING' ? 'pending' : 'completed') },
    { id: 'communicate', name: 'Outreach & quotation dispatched', status: task.status === 'EXECUTING' && task.currentAgent === 'Communication' ? 'in_progress' : 'pending' },
    { id: 'quote', name: 'Comparing received quotation responses', status: task.status === 'EXECUTING' && task.currentAgent === 'Quotation' ? 'in_progress' : 'pending' },
    { id: 'schedule', name: 'Confirming appointment slot availability', status: task.status === 'EXECUTING' && task.currentAgent === 'Scheduling' ? 'in_progress' : 'pending' },
    { id: 'verify', name: 'Verifying completed execution & evidence', status: task.status === 'VERIFYING' ? 'in_progress' : 'pending' },
  ];

  const currentAgent = task.currentAgent || 'Orchestrator';
  const currentAction = task.currentAction || 'Coordinating task lifecycle...';
  const isAwaitingApproval = task.status === 'AWAITING_APPROVAL';
  const isRunning = ['RECEIVED', 'UNDERSTANDING', 'PLANNING', 'EXECUTING', 'VERIFYING', 'AWAITING_APPROVAL'].includes(task.status);
  const contactedProviders = task.externalContacts || task.outcome?.contacted || [];

  const handleApprove = async () => {
    setIsSubmitting(true);
    try {
      await approveTask(task._id || task.taskId);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!showRejectInput) {
      setShowRejectInput(true);
      return;
    }
    setIsSubmitting(true);
    try {
      await rejectTask(task._id || task.taskId, rejectReason);
      setShowRejectInput(false);
      setRejectReason('');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = async () => {
    if (window.confirm('Cancel this ongoing autonomous task execution?')) {
      await cancelTask(task._id || task.taskId);
    }
  };

  return (
    <div className="doera-execution-workspace">
      {/* Workspace Header */}
      <div className="doera-exec-header">
        <div className="doera-exec-header-left">
          {isRunning ? (
            <span className="doera-live-pulse-dot" />
          ) : (
            <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#8993A4', display: 'inline-block' }} />
          )}
          <span className="doera-exec-title">DOERA Autonomous Execution Engine</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div className="doera-agent-pill">
            <Bot size={13} />
            <span>{currentAgent} Agent Active</span>
          </div>

          <button
            onClick={() => setShowDetails(!showDetails)}
            className="doera-btn-icon"
            title={showDetails ? 'Collapse details' : 'Expand details'}
          >
            {showDetails ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
          </button>
        </div>
      </div>

      {/* Two-Column Responsive Grid */}
      {showDetails && (
        <div className="doera-exec-grid">
          {/* Left Column: Real-Time Execution Timeline */}
          <div className="doera-exec-col-left">
            <div className="doera-col-header">
              <span className="doera-col-title">Agent Execution Timeline</span>
              <span style={{ fontSize: 11, color: '#8993A4', fontFamily: 'monospace' }}>
                {steps.filter(s => s.status === 'completed').length} / {steps.length} Completed
              </span>
            </div>

            {/* Current Action Callout */}
            <div className="doera-exec-current-callout">
              <div className="doera-callout-icon">
                <Bot size={16} />
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: 11, color: '#FF55BD', fontWeight: 700, textTransform: 'uppercase' }}>
                  {currentAgent} Agent
                </div>
                <div className="doera-callout-text">
                  {currentAction}
                </div>
              </div>
            </div>

            {/* Timeline Items */}
            <div className="doera-exec-timeline">
              {steps.map((step, idx) => {
                const isCompleted = step.status === 'completed';
                const isInProgress = step.status === 'in_progress';
                const isFailed = step.status === 'failed';

                return (
                  <div key={step.id || idx} className="doera-timeline-item">
                    <div className="doera-timeline-indicator">
                      {isCompleted && <CheckCircle2 size={16} style={{ color: '#10B981' }} />}
                      {isInProgress && (
                        <div style={{ width: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#FF55BD' }} className="animate-pulse" />
                        </div>
                      )}
                      {isFailed && <AlertTriangle size={16} style={{ color: '#EF4444' }} />}
                      {!isCompleted && !isInProgress && !isFailed && (
                        <Circle size={13} style={{ color: '#CBD5E1' }} />
                      )}
                    </div>

                    <div className="doera-timeline-info">
                      <span
                        className={`doera-timeline-name ${
                          isCompleted
                            ? 'completed'
                            : isInProgress
                            ? 'in-progress'
                            : isFailed
                            ? 'failed'
                            : 'pending'
                        }`}
                      >
                        {step.name}
                      </span>
                    </div>

                    {/* Dedicated Right-Aligned Timestamps */}
                    <div className="doera-timeline-time">
                      {step.timestamp
                        ? new Date(step.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                        : isCompleted
                        ? 'Verified'
                        : isInProgress
                        ? 'Running'
                        : 'Pending'}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Task Information & Verified Evidence */}
          <div className="doera-exec-col-right">
            {/* Task Directive */}
            <div className="doera-info-card">
              <div className="doera-info-card-header">
                <span className="doera-info-card-title">Task Directive</span>
                <span style={{ fontSize: 10, color: '#8993A4', fontFamily: 'monospace' }}>
                  {task.taskId || task._id}
                </span>
              </div>
              <div className="doera-request-quote">
                "{task.userRequest || 'Autonomous task execution'}"
              </div>
            </div>

            {/* Engaged Providers / Evidence */}
            <div className="doera-info-card">
              <div className="doera-info-card-header">
                <span className="doera-info-card-title">Engaged Providers & Evidence</span>
                <span className="doera-verified-badge">DOERA Verified</span>
              </div>

              {contactedProviders.length > 0 ? (
                contactedProviders.map((prov, pIdx) => (
                  <div key={pIdx} className="doera-provider-item">
                    <div>
                      <div className="doera-provider-name">{prov.businessName || 'Verified Professional'}</div>
                      <div className="doera-provider-meta">
                        {prov.phone || prov.email || 'Verified Direct Channel'} • {prov.status || 'Active'}
                      </div>
                    </div>
                    <span className="doera-verified-badge">Active</span>
                  </div>
                ))
              ) : (
                <div style={{ fontSize: 12, color: '#64748B', padding: '10px 0' }}>
                  Searching verified directory & synthesizing outreach plan...
                </div>
              )}
            </div>
          </div>

          {/* Prominent Human Authorization Gate */}
          {isAwaitingApproval && (
            <div className="doera-exec-auth-panel">
              <div className="doera-auth-header">
                <ShieldCheck size={20} style={{ color: '#D97706' }} />
                <span className="doera-auth-title">Human Authorization Required</span>
              </div>

              <p className="doera-auth-desc">
                {task.pendingApproval?.description || 
                  'DOERA has drafted an action requiring your confirmation before dispatching to external providers.'}
              </p>

              {task.pendingApproval?.details && (
                <div className="doera-auth-details-box">
                  {task.pendingApproval.details.recipient && (
                    <div><strong>Recipient:</strong> {task.pendingApproval.details.recipient}</div>
                  )}
                  {task.pendingApproval.details.subject && (
                    <div><strong>Subject:</strong> {task.pendingApproval.details.subject}</div>
                  )}

                  {(() => {
                    const draftContent =
                      task.pendingApproval.details.message ||
                      task.pendingApproval.details.emailText ||
                      task.pendingApproval.details.whatsappText ||
                      (typeof task.pendingApproval.details === 'string' ? task.pendingApproval.details : null);

                    if (!draftContent) return null;

                    return (
                      <div style={{ marginTop: 8 }}>
                        <button
                          type="button"
                          onClick={() => setShowDraftPreview(!showDraftPreview)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#FF55BD',
                            fontSize: 11.5,
                            fontWeight: 700,
                            cursor: 'pointer',
                            padding: '2px 0',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                          }}
                        >
                          {showDraftPreview ? 'Hide Message Draft ▲' : 'Inspect Full Message Draft ▼'}
                        </button>
                        {showDraftPreview && (
                          <div
                            style={{
                              marginTop: 8,
                              padding: '12px 14px',
                              background: '#09040D',
                              borderRadius: 8,
                              border: '1px solid #361744',
                              color: '#EDE4EE',
                              fontSize: 12.5,
                              lineHeight: 1.5,
                              whiteSpace: 'pre-wrap',
                              fontFamily: 'inherit',
                              boxShadow: 'inset 0 2px 6px rgba(0, 0, 0, 0.5)',
                            }}
                          >
                            {draftContent}
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              )}

              {showRejectInput && (
                <div style={{ marginBottom: 12 }}>
                  <input
                    type="text"
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="Provide specific adjustment instructions..."
                    style={{ width: '100%', padding: '8px 12px', fontSize: 12, border: '1px solid #F59E0B', borderRadius: 8, outline: 'none' }}
                  />
                </div>
              )}

              <div className="doera-auth-actions" style={{ flexWrap: 'wrap', gap: 8 }}>
                <button
                  onClick={handleApprove}
                  disabled={isSubmitting}
                  className="doera-btn-approve"
                >
                  <CheckCircle2 size={16} />
                  <span>Authorize & Execute Action</span>
                </button>

                <button
                  onClick={handleReject}
                  disabled={isSubmitting}
                  className="doera-btn-reject"
                >
                  {showRejectInput ? 'Confirm Revision' : 'Reject / Revise'}
                </button>

                <Link
                  to="/approvals"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                    fontSize: 12,
                    color: '#FF55BD',
                    textDecoration: 'none',
                    padding: '8px 12px',
                    borderRadius: 8,
                    background: 'rgba(241, 45, 152, 0.1)',
                    border: '1px solid rgba(241, 45, 152, 0.25)',
                    fontWeight: 600,
                  }}
                  title="Open in Human Approval Center"
                >
                  <ExternalLink size={13} />
                  <span>Open in Approval Center</span>
                </Link>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Cancel Task Footer Option */}
      {isRunning && !isAwaitingApproval && (
        <div style={{ padding: '8px 18px', background: '#130C15', borderTop: '1px solid #281432', display: 'flex', justifyContent: 'flex-end' }}>
          <button
            onClick={handleCancel}
            style={{ fontSize: 11, color: '#8993A4', display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer' }}
          >
            <XCircle size={13} />
            <span>Cancel Execution</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default AgentActivity;
