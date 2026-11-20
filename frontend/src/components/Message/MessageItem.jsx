import React, { useState, useMemo } from 'react';
import { 
  FileText, 
  Check, 
  Copy, 
  Volume2, 
  VolumeX, 
  ThumbsUp, 
  ThumbsDown, 
  CheckCircle2, 
  Clock, 
  XCircle,
  RotateCcw
} from 'lucide-react';
import MarkdownRenderer from './MarkdownRenderer';
import ExecutionDetails from '../TaskStatus/ExecutionDetails';
import AgentActivity from '../AgentActivity/AgentActivity';
import LocationMap from '../Map/LocationMap';
import ProofOfExecutionCard from '../ProofOfExecution/ProofOfExecutionCard';
import FollowUpTrackerCard from '../FollowUp/FollowUpTrackerCard';
import SpreadsheetChart from '../Chart/SpreadsheetChart';
import ErrorBoundary from '../UI/ErrorBoundary';
import { useAuth } from '../../context/AuthContext';
import { useChat } from '../../context/ChatContext';

const MessageItem = ({ message, activeTask }) => {
  if (!message || typeof message !== 'object') return null;

  const isUser = message.sender === 'user' || message.role === 'user';
  const { user } = useAuth();
  const { feedbackMessage, sendMessage, messages, userLocation } = useChat();
  const [copied, setCopied] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [userFeedback, setUserFeedback] = useState(message.feedback || null);

  const handleRegenerate = () => {
    if (!sendMessage) return;
    if (Array.isArray(messages) && messages.length > 0) {
      const currentIndex = messages.findIndex((m) => m._id === message._id);
      const searchStart = currentIndex >= 0 ? currentIndex - 1 : messages.length - 1;
      for (let i = searchStart; i >= 0; i--) {
        if (messages[i].sender === 'user' || messages[i].role === 'user') {
          sendMessage(messages[i].content);
          return;
        }
      }
    }
    if (message.content) {
      sendMessage(message.content);
    }
  };

  const attachedTask =
    message.task ||
    (typeof message.taskId === 'object' && message.taskId !== null ? message.taskId : null) ||
    (activeTask && (String(activeTask._id) === String(message.taskId) || activeTask.taskId === message.taskId) ? activeTask : null);

  // Compute location intelligence & interactive map payload
  const activeLocationData = useMemo(() => {
    if (message.locationData && typeof message.locationData === 'object') {
      return message.locationData;
    }
    if (attachedTask?.locationData && typeof attachedTask.locationData === 'object') {
      return attachedTask.locationData;
    }
    if (
      attachedTask?.externalContacts &&
      Array.isArray(attachedTask.externalContacts) &&
      attachedTask.externalContacts.some((c) => c.location?.lat)
    ) {
      const placesWithCoords = attachedTask.externalContacts
        .filter((c) => c.location?.lat && c.location?.lng)
        .map((c, i) => ({
          id: c._id || `contact-${i + 1}`,
          index: i + 1,
          name: c.businessName || c.name || `Provider ${i + 1}`,
          address: c.address || 'Verified Address',
          phone: c.phone || null,
          rating: c.rating || null,
          reviewsCount: c.reviewsCount || null,
          lat: c.location.lat,
          lng: c.location.lng,
          source: c.source || 'OpenStreetMap Nominatim',
          sourceUrl: c.sourceUrl || null,
          distanceKm: c.distanceKm || null,
          travelTime: c.travelTime || null,
        }));

      if (placesWithCoords.length > 0) {
        return {
          type: 'places',
          places: placesWithCoords,
          center: {
            lat: placesWithCoords[0].lat,
            lng: placesWithCoords[0].lng,
          },
        };
      }
    }
    return null;
  }, [message.locationData, attachedTask]);

  // Compute active spreadsheet chart configuration
  const activeChartConfig = useMemo(() => {
    if (message.chartConfig && typeof message.chartConfig === 'object') {
      return message.chartConfig;
    }
    if (attachedTask?.chartConfig && typeof attachedTask.chartConfig === 'object') {
      return attachedTask.chartConfig;
    }
    if (attachedTask?.discoveredData?.dataAnalysis?.chartConfig) {
      return attachedTask.discoveredData.dataAnalysis.chartConfig;
    }
    // Check if message content contains embedded ```json:doera-chart block
    if (typeof message.content === 'string' && message.content.includes('```json:doera-chart')) {
      try {
        const match = message.content.match(/```json:doera-chart\s*([\s\S]*?)\s*```/);
        if (match && match[1]) {
          return JSON.parse(match[1]);
        }
      } catch (_) {}
    }
    return null;
  }, [message.chartConfig, message.content, attachedTask]);

  const formatTime = (dateStr) => {
    try {
      if (!dateStr) return '';
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return '';
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  // Build natural conversational response text for task outcomes safely
  const getDisplayContent = () => {
    try {
      let rawContent = message.content || '';
      // Strip ```json:doera-chart block when rendered via dynamic interactive component
      if (activeChartConfig && rawContent.includes('```json:doera-chart')) {
        rawContent = rawContent.replace(/```json:doera-chart\s*[\s\S]*?\s*```/g, '').trim();
      }

      if (!attachedTask || !['COMPLETED', 'PARTIALLY_COMPLETED'].includes(attachedTask.status)) {
        return rawContent;
      }

      const isLocalResearch =
        attachedTask.category === 'LOCATION_DISCOVERY' ||
        attachedTask.category === 'LOCAL_SERVICE_RESEARCH' ||
        attachedTask.category === 'LOCAL_SERVICE' ||
        rawContent.includes('Research completed. No business was contacted');

      if (isLocalResearch || (rawContent && rawContent.length > 180 && !rawContent.startsWith('Understood. I am actively coordinating'))) {
        return rawContent;
      }

      const outcome = attachedTask.outcome || {};
      const contact = (outcome.contacted && outcome.contacted[0]) || (attachedTask.externalContacts && attachedTask.externalContacts[0]);
      const booking = outcome.booking || attachedTask.bookingDetails;
      const comm = outcome.responseReceived || (Array.isArray(attachedTask.steps) ? attachedTask.steps.find(s => s && s.agent === 'Communication')?.details : null);

      let text = `I found verified options and coordinated the execution process for: "${attachedTask.userRequest || message.content}".\n\n`;

      if (contact) {
        text += `### Service provider\n\n**${contact.businessName || contact.name || 'Verified Provider'}**\n`;
        if (contact.address) text += `- Location: ${contact.address}\n`;
        if (contact.phone) text += `- Contact: ${contact.phone}\n`;
        if (contact.rating) text += `- Rating: ★ ${contact.rating}\n`;
        text += '\n';
      }

      if (booking) {
        text += `### Appointment details\n\n`;
        text += `- Status: Confirmed\n`;
        if (booking.dateTime || booking.date) text += `- Date & Time: ${booking.dateTime || booking.date}\n`;
        if (booking.referenceId || attachedTask.taskId) text += `- Reference: ${booking.referenceId || attachedTask.taskId}\n`;
        text += '\n';
      }

      if (comm) {
        text += `### Communication\n\n${comm}\n\n`;
      }

      text += `Your appointment details are ready.`;
      return text;
    } catch (err) {
      return message.content || '';
    }
  };

  const copyToClipboard = () => {
    try {
      navigator.clipboard.writeText(getDisplayContent());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (_) {}
  };

  const toggleSpeech = () => {
    if (!('speechSynthesis' in window)) return;
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(getDisplayContent());
    utterance.rate = 1.0;
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  const handleFeedback = (type) => {
    const next = userFeedback === type ? null : type;
    setUserFeedback(next);
    if (message._id && feedbackMessage) {
      feedbackMessage(message._id, next);
    }
  };

  // Render User Message (Gradient bubble + Avatar on right)
  if (isUser) {
    return (
      <div className="doera-msg-user-row">
        <div className="doera-msg-user-wrapper">
          <div className="doera-msg-user-content-col">
            {Array.isArray(message.attachments) && message.attachments.length > 0 && (
              <div className="doera-msg-user-attachments">
                {message.attachments.map((att, idx) => (
                  <div key={idx} className="doera-attachment-chip">
                    <FileText size={12} className="doera-chip-icon" />
                    <span className="doera-chip-name">{att?.name || 'Attachment'}</span>
                  </div>
                ))}
              </div>
            )}
            <div className="doera-msg-user-bubble">
              {message.content || ''}
            </div>
            <span className="doera-msg-timestamp">
              {formatTime(message.createdAt)}
            </span>
          </div>
          <div className="doera-msg-user-avatar" title={user?.name || 'User'}>
            <span>{user?.name ? user.name.charAt(0).toUpperCase() : 'U'}</span>
          </div>
        </div>
      </div>
    );
  }

  // Render Assistant Message (4-Point Star Avatar + Clean Prose)
  return (
    <div className="doera-msg-ai-row">
      <div className="doera-msg-ai-container">
        {/* 4-Point Glowing Neural Star Avatar */}
        <div className="doera-msg-ai-avatar">
          <svg viewBox="0 0 24 24" className="doera-ai-star-icon" fill="currentColor">
            <path d="M12 2C12 7.52285 7.52285 12 2 12C7.52285 12 12 16.4771 12 22C12 16.4771 16.4771 12 22 12C16.4771 12 12 7.52285 12 2Z" />
          </svg>
        </div>

        {/* Conversational Stream Workspace */}
        <div className="doera-msg-ai-workspace">
          {/* Top Identity & Action Row */}
          <div className="doera-msg-header-row">
            <div className="doera-msg-header-left">
              <span className="doera-msg-author-name">DOERA AI</span>

              {/* Minimalist Inline Status Pill */}
              {attachedTask && attachedTask.status === 'COMPLETED' && (
                <span className="doera-inline-status completed">
                  <CheckCircle2 size={12} />
                  <span>Task completed</span>
                </span>
              )}
              {attachedTask && ['AWAITING_APPROVAL', 'WAITING_FOR_APPROVAL', 'ACTION_REQUIRED'].includes(attachedTask.status) && (
                <span className="doera-inline-status pending">
                  <Clock size={12} />
                  <span>Awaiting authorization</span>
                </span>
              )}
              {attachedTask && attachedTask.status === 'FAILED' && (
                <span className="doera-inline-status failed">
                  <XCircle size={12} />
                  <span>Task failed</span>
                </span>
              )}
            </div>

            {/* Response Actions */}
            <div className="doera-msg-actions-toolbar">
              <button
                type="button"
                onClick={copyToClipboard}
                className="doera-action-btn"
                title="Copy response"
              >
                {copied ? <Check size={13} style={{ color: '#10B981' }} /> : <Copy size={13} />}
              </button>
              <button
                type="button"
                onClick={() => handleFeedback('like')}
                className={`doera-action-btn ${userFeedback === 'like' ? 'active' : ''}`}
                title="Good response"
              >
                <ThumbsUp size={13} />
              </button>
              <button
                type="button"
                onClick={() => handleFeedback('dislike')}
                className={`doera-action-btn ${userFeedback === 'dislike' ? 'active' : ''}`}
                title="Bad response"
              >
                <ThumbsDown size={13} />
              </button>
              {'speechSynthesis' in window && (
                <button
                  type="button"
                  onClick={toggleSpeech}
                  className={`doera-action-btn ${isSpeaking ? 'active' : ''}`}
                  title={isSpeaking ? 'Stop speech' : 'Read aloud'}
                >
                  {isSpeaking ? <VolumeX size={13} /> : <Volume2 size={13} />}
                </button>
              )}
              {sendMessage && !message.isError && (
                <button
                  type="button"
                  onClick={handleRegenerate}
                  className="doera-action-btn"
                  title="Regenerate response"
                >
                  <RotateCcw size={13} />
                </button>
              )}
            </div>
          </div>

          {/* Natural Conversational Body rendered via MarkdownRenderer */}
          <div className="doera-msg-prose-wrap">
            <ErrorBoundary fallback={<p>{getDisplayContent()}</p>}>
              <MarkdownRenderer
                content={getDisplayContent()}
                isStreaming={message.status === 'streaming'}
              />
            </ErrorBoundary>
          </div>

          {/* DOERA LIVE LOCATION INTELLIGENCE: Interactive Map */}
          {activeLocationData && (
            <div style={{ marginTop: 14 }}>
              <ErrorBoundary>
                <LocationMap locationData={activeLocationData} userLocation={userLocation} />
              </ErrorBoundary>
            </div>
          )}

          {/* DOERA ADVANCED SPREADSHEET INTELLIGENCE: Dynamic Interactive Chart */}
          {activeChartConfig && (
            <div style={{ marginTop: 14 }}>
              <ErrorBoundary>
                <SpreadsheetChart chartConfig={activeChartConfig} />
              </ErrorBoundary>
            </div>
          )}

          {/* Interactive Human Approval Gate (Only when awaiting approval) */}
          {attachedTask && ['AWAITING_APPROVAL', 'WAITING_FOR_APPROVAL', 'ACTION_REQUIRED'].includes(attachedTask.status) && (
            <div style={{ marginTop: 14 }}>
              <ErrorBoundary>
                <AgentActivity task={attachedTask} />
              </ErrorBoundary>
            </div>
          )}

          {/* DOERA Proof of Execution Card */}
          {(attachedTask?.executionEvidence || message.evidence) && (
            <div style={{ marginTop: 14 }}>
              <ErrorBoundary>
                <ProofOfExecutionCard evidence={attachedTask?.executionEvidence || message.evidence} />
              </ErrorBoundary>
            </div>
          )}

          {/* DOERA Autonomous Follow-Up Tracker */}
          {(attachedTask?.followUp || message.followUp) && (
            <div style={{ marginTop: 14 }}>
              <ErrorBoundary>
                <FollowUpTrackerCard followUp={attachedTask?.followUp || message.followUp} />
              </ErrorBoundary>
            </div>
          )}

          {/* Expandable Clean Execution Details Timeline */}
          {attachedTask && ['COMPLETED', 'PARTIALLY_COMPLETED', 'FAILED'].includes(attachedTask.status) && (
            <ErrorBoundary>
              <ExecutionDetails task={attachedTask} />
            </ErrorBoundary>
          )}

          {/* Timestamp */}
          <div className="doera-msg-timestamp-bottom">
            {formatTime(message.createdAt)}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MessageItem;
