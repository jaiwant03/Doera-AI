import React, { useState } from 'react';
import { 
  ChevronDown, 
  ChevronUp, 
  CheckCircle2, 
  Clock, 
  ShieldCheck, 
  Copy, 
  Check 
} from 'lucide-react';

const ExecutionDetails = ({ task }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!task) return null;

  const steps = task.steps || [];
  const taskId = task.taskId || task._id;

  const copyTaskId = (e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(taskId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="doera-execution-container">
      <button 
        type="button" 
        onClick={() => setIsOpen(!isOpen)} 
        className="doera-execution-toggle-btn"
      >
        <div className="doera-execution-toggle-left">
          <ShieldCheck size={13.5} className="doera-execution-shield" />
          <span className="doera-execution-toggle-label">
            {isOpen ? 'Hide execution details' : 'View execution details'}
          </span>
          <span className="doera-execution-ref-chip">{taskId}</span>
        </div>
        {isOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
      </button>

      {isOpen && (
        <div className="doera-execution-content animate-fadeIn">
          <div className="doera-execution-timeline">
            {steps.map((step, idx) => (
              <div key={idx} className="doera-timeline-item">
                <div className="doera-timeline-marker">
                  <CheckCircle2 size={12.5} className="doera-timeline-icon" />
                  {idx < steps.length - 1 && <div className="doera-timeline-line" />}
                </div>

                <div className="doera-timeline-body">
                  <div className="doera-timeline-header">
                    <span className="doera-timeline-step-name">{step.name}</span>
                    <span className="doera-timeline-agent-pill">{step.agent}</span>
                  </div>
                  {step.details && (
                    <p className="doera-timeline-step-desc">{step.details}</p>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="doera-execution-footer">
            <span className="doera-execution-timestamp">
              <Clock size={11} />
              Verified at {task.updatedAt ? new Date(task.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Live'}
            </span>
            <button type="button" onClick={copyTaskId} className="doera-execution-copy-btn">
              {copied ? <Check size={11} /> : <Copy size={11} />}
              <span>{copied ? 'Copied' : 'Copy reference'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExecutionDetails;
