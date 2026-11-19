import React, { useEffect, useRef, useMemo } from 'react';
import MessageItem from './MessageItem';
import AgentActivity from '../AgentActivity/AgentActivity';
import AnimatedLogo from '../UI/AnimatedLogo';
import ErrorBoundary from '../UI/ErrorBoundary';

const MessageList = ({ messages = [], activeTask, isSending }) => {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, activeTask, isSending]);

  // Safely deduplicate valid messages by unique ID
  const uniqueMessages = useMemo(() => {
    if (!Array.isArray(messages)) return [];
    const seen = new Set();
    return messages.filter((m) => {
      if (!m || typeof m !== 'object') return false;
      const id = m._id || m.id || `msg-${Math.random()}`;
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    });
  }, [messages]);

  // Check if activeTask is actively running (NOT completed or failed)
  const isTaskRunning =
    activeTask &&
    ['RECEIVED', 'UNDERSTANDING', 'PLANNING', 'AWAITING_APPROVAL', 'WAITING_FOR_APPROVAL', 'ACTION_REQUIRED', 'EXECUTING', 'VERIFYING', 'WAITING_FOR_RESPONSE'].includes(activeTask.status);

  // Check if this running task is already tied to an existing message
  const isTaskAlreadyInMessages = uniqueMessages.some((m) => {
    if (!m) return false;
    const t = m.task || (typeof m.taskId === 'object' && m.taskId !== null ? m.taskId : null);
    const mTaskId = t ? (t._id || t.taskId) : m.taskId;
    return mTaskId && (String(mTaskId) === String(activeTask?._id) || String(mTaskId) === String(activeTask?.taskId));
  });

  return (
    <div className="doera-chat-scroll-area">
      <div className="doera-chat-content-width">
        {uniqueMessages.map((message) => (
          <ErrorBoundary key={message._id || message.id || Math.random()}>
            <MessageItem
              message={message}
              activeTask={activeTask}
            />
          </ErrorBoundary>
        ))}

        {/* Live Running Task Progress (Only while actively executing, never duplicated after completion) */}
        {isTaskRunning && !isTaskAlreadyInMessages && (
          <ErrorBoundary>
            <div className="doera-msg-ai-row">
              <div className="doera-msg-ai-container">
                <div className="doera-msg-ai-avatar">
                  <AnimatedLogo size="sm" state="busy" showAura={false} />
                </div>
                <div className="doera-msg-ai-workspace">
                  <AgentActivity task={activeTask} />
                </div>
              </div>
            </div>
          </ErrorBoundary>
        )}

        <div ref={bottomRef} />
      </div>
    </div>
  );
};

export default MessageList;
