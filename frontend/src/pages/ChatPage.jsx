import React, { useState, useEffect } from 'react';
import { PanelLeft, Plus } from 'lucide-react';
import Sidebar from '../components/Sidebar/Sidebar';
import Header from '../components/UI/Header';
import AmbientBackground from '../components/AmbientBackground';
import DoeraFullScreenLoader from '../components/DoeraFullScreenLoader';
import WelcomeScreen from '../components/Chat/WelcomeScreen';
import MessageList from '../components/Message/MessageList';
import ChatInput from '../components/Chat/ChatInput';
import UpgradeModal from '../components/Subscription/UpgradeModal';
import { useChat } from '../context/ChatContext';

const ChatPage = () => {
  // Sidebar defaults to open on desktop ("otherwise it should be visible")
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    if (typeof window !== 'undefined' && window.innerWidth <= 1024) {
      return false;
    }
    const saved = localStorage.getItem('doera_sidebar_open');
    return saved !== null ? saved === 'true' : true;
  });

  const [prefilledInput, setPrefilledInput] = useState('');
  const {
    messages,
    activeTask,
    isSending,
    isStreaming,
    isLoading,
    sendMessage,
    stopGeneration,
    createNewConversation,
    subscription,
    showUpgradeModal,
    setShowUpgradeModal,
    fetchSubscription,
  } = useChat();

  const toggleSidebar = () => {
    setSidebarOpen((prev) => {
      const next = !prev;
      localStorage.setItem('doera_sidebar_open', String(next));
      return next;
    });
  };

  // Keyboard shortcut Ctrl+B / Cmd+B to toggle sidebar (ChatGPT standard)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        toggleSidebar();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSelectPrompt = (promptText) => {
    setPrefilledInput(promptText);
  };

  const handleSendMessage = (content, attachments) => {
    sendMessage(content, attachments);
    setPrefilledInput('');
  };

  const hasMessages = messages && messages.length > 0;

  // Derive dynamic context-aware message based on actual backend execution states
  const getLoaderMessage = () => {
    if (isLoading) return 'Loading your DOERA AI workspace...';
    if (activeTask?.currentAction) return activeTask.currentAction;
    if (activeTask?.status === 'PLANNING') return 'Orchestrating intelligent agents...';
    if (activeTask?.status === 'UNDERSTANDING') return 'Understanding your request & requirements...';
    if (activeTask?.status === 'EXECUTING') return 'Turning intelligence into action...';
    if (isSending) return 'DOERA is thinking...';
    return 'DOERA is executing your request...';
  };

  const getLoaderSubText = () => {
    if (activeTask?.title) return activeTask.title;
    if (activeTask?.status === 'EXECUTING') return 'Executing verified external integrations...';
    if (activeTask?.status === 'PLANNING') return 'Deconstructing workflow into autonomous subtasks...';
    return 'Synthesizing response with real-world verification...';
  };

  // Show the 3D particle mesh loader when waiting for AI generation, dismounting seamlessly when streaming starts
  const showFullScreenLoader = isSending && !isStreaming;

  return (
    <div className="doera-app-layout">
      {/* Navigation Sidebar */}
      <Sidebar 
        isOpen={sidebarOpen} 
        onToggle={toggleSidebar} 
        onClose={() => setSidebarOpen(false)} 
      />

      {/* Main Execution Workspace */}
      <main className="doera-workspace">
        {/* Subtle Animated Ambient Glow Background ONLY for Main Workspace */}
        <AmbientBackground />

        {/* Floating Top-Left Controls when Sidebar is Closed (ChatGPT style) */}
        {!sidebarOpen && (
          <div className="doera-workspace-floating-bar animate-fadeIn">
            <button
              onClick={toggleSidebar}
              className="doera-sidebar-floating-btn"
              title="Open sidebar (Ctrl+B)"
              aria-label="Open sidebar"
            >
              <PanelLeft size={18} />
            </button>
            <button
              onClick={() => {
                createNewConversation();
                setPrefilledInput('');
              }}
              className="doera-sidebar-floating-btn"
              title="New Task"
              aria-label="New Task"
            >
              <Plus size={18} />
            </button>
          </div>
        )}

        {/* Mobile Header */}
        <Header onOpenSidebar={() => setSidebarOpen(true)} />

        {/* Content Area: Welcome Experience or Message Stream */}
        <div className="doera-workspace-content">
          {!hasMessages && !activeTask ? (
            <div className="doera-welcome-viewport-wrapper">
              <WelcomeScreen 
                onSelectPrompt={handleSelectPrompt} 
                onSendMessage={handleSendMessage}
              />
            </div>
          ) : (
            <div className="doera-chat-scroll-wrapper">
              <MessageList messages={messages} activeTask={activeTask} isSending={isSending} isStreaming={isStreaming} />
            </div>
          )}

          {/* 3D Particle-Mesh Neural Loader (Image 2 - Third Phone reference) */}
          <DoeraFullScreenLoader
            isLoading={showFullScreenLoader}
            operationType="task"
            statusText={getLoaderMessage()}
            subText={getLoaderSubText()}
            onCancel={stopGeneration}
          />

          {/* Dedicated Floating Chat Input Composer — Always Visible & Interactive */}
          <section className="doera-composer-section">
            <ChatInput
              onSendMessage={handleSendMessage}
              isSending={isSending}
              initialValue={prefilledInput}
            />
          </section>
        </div>
      </main>

      {/* Luxury Plan Selection & Upgrade Modal (Daily Renewable Limits) */}
      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        currentPlan={subscription?.plan || 'free'}
        usedRequests={subscription?.usedRequests || 0}
        dailyLimit={subscription?.dailyLimit || subscription?.limitRequests || 20}
        remainingRequests={subscription?.remainingRequests}
        resetsIn={subscription?.resetsIn}
        resetAt={subscription?.resetAt}
        onPlanUpdated={(plan, usage) => fetchSubscription(plan, usage)}
      />
    </div>
  );
};

export default ChatPage;
