import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import api from '../services/api';
import wsClient from '../services/websocket';
import { useAuth } from './AuthContext';

const ChatContext = createContext(null);

export const ChatProvider = ({ children }) => {
  const { user, token } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [currentConversation, setCurrentConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [activeTask, setActiveTask] = useState(null);
  const [tasks, setTasks] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [selectedModel, setSelectedModel] = useState('llama-3.3-70b-versatile');
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const abortControllerRef = useRef(null);
  const [subscription, setSubscription] = useState({
    plan: 'free',
    status: 'active',
    usedRequests: 0,
    dailyLimit: 20,
    limitRequests: 20,
    remainingRequests: 20,
    resetsIn: '24h 00m',
    resetAt: null,
  });
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  // DOERA Live Location Intelligence
  const [userLocation, setUserLocation] = useState(null);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [isTrackingActive, setIsTrackingActive] = useState(false);
  const watchIdRef = useRef(null);

  const toggleLiveTracking = useCallback(() => {
    if (isTrackingActive) {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      setIsTrackingActive(false);
    } else {
      if (!navigator.geolocation) return;
      setIsTrackingActive(true);
      watchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          setUserLocation({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
            name: 'Live GPS Position',
          });
        },
        () => {
          setIsTrackingActive(false);
        },
        { enableHighAccuracy: true }
      );
    }
  }, [isTrackingActive]);

  // Fetch subscription & daily usage data
  const fetchSubscription = useCallback(async (overridePlan, overrideUsage) => {
    if (!token) return;
    if (overridePlan && overrideUsage) {
      setSubscription(prev => ({
        ...prev,
        ...overrideUsage,
        plan: overridePlan,
        dailyLimit: overrideUsage.dailyLimit,
        limitRequests: overrideUsage.dailyLimit,
        usedRequests: overrideUsage.usedRequests || 0,
        remainingRequests: overrideUsage.remainingRequests,
      }));
      return;
    }
    try {
      const [subRes, usageRes] = await Promise.allSettled([
        api.get('/subscription/status'),
        api.get('/usage'),
      ]);

      const subData = subRes.status === 'fulfilled' ? subRes.value.data : {};
      const usageData = usageRes.status === 'fulfilled' ? usageRes.value.data : {};

      const plan = usageData.plan || subData.plan || 'free';
      const dailyLimit = usageData.dailyLimit || subData.dailyLimit || (plan === 'pro' ? 300 : plan === 'max' ? 500 : 20);
      const usedRequests = usageData.usedRequests !== undefined ? usageData.usedRequests : (subData.usedRequests || 0);
      const remainingRequests = usageData.remainingRequests !== undefined ? usageData.remainingRequests : Math.max(0, dailyLimit - usedRequests);

      setSubscription({
        ...subData,
        ...usageData,
        plan,
        dailyLimit,
        limitRequests: dailyLimit,
        usedRequests,
        remainingRequests,
        resetAt: usageData.resetAt || subData.resetAt,
        resetsIn: usageData.resetsIn || subData.resetsIn,
      });
    } catch (err) {
      console.error('[DOERA Chat] Failed to load subscription & usage:', err);
    }
  }, [token]);

  // Auto-refresh usage on window focus and tab visibility change (Requirement #7)
  useEffect(() => {
    if (!token) return;

    const handleFocus = () => {
      fetchSubscription();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchSubscription();
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [token, fetchSubscription]);

  // Load conversations on mount or auth change
  const loadConversations = useCallback(async () => {
    if (!token) return;
    try {
      setIsLoading(true);
      const res = await api.get('/chat/conversations');
      const convs = res.data.conversations || [];
      setConversations(convs);
      if (convs.length > 0 && !currentConversation) {
        selectConversation(convs[0]._id || convs[0].id);
      }
    } catch (err) {
      console.error('[DOERA Chat] Failed to load conversations:', err);
    } finally {
      setIsLoading(false);
    }
  }, [token, currentConversation]);

  useEffect(() => {
    if (token) {
      loadConversations();
      fetchSubscription();
    } else {
      setConversations([]);
      setCurrentConversation(null);
      setMessages([]);
      setActiveTask(null);
      setTasks({});
      setSubscription({
        plan: 'free',
        status: 'active',
        usedRequests: 0,
        dailyLimit: 20,
        limitRequests: 20,
        remainingRequests: 20,
        resetsIn: '24h 00m',
        resetAt: null,
      });
    }
  }, [token, fetchSubscription]);

  // Load messages for selected conversation
  const selectConversation = async (conversationId) => {
    if (!conversationId) return;
    try {
      setIsLoading(true);
      const res = await api.get(`/chat/conversations/${conversationId}`);
      setCurrentConversation(res.data.conversation);
      setMessages(res.data.messages || []);
      
      // If conversation has an ongoing task, load it
      if (res.data.tasks && res.data.tasks.length > 0) {
        const taskMap = {};
        res.data.tasks.forEach(t => {
          taskMap[t._id || t.taskId] = t;
        });
        setTasks(taskMap);
        const ongoing = res.data.tasks.find(t => ['RECEIVED', 'UNDERSTANDING', 'PLANNING', 'AWAITING_APPROVAL', 'WAITING_FOR_APPROVAL', 'ACTION_REQUIRED', 'EXECUTING', 'VERIFYING', 'WAITING_FOR_RESPONSE'].includes(t.status));
        setActiveTask(ongoing || res.data.tasks[res.data.tasks.length - 1]);
      } else {
        setActiveTask(null);
      }
    } catch (err) {
      console.error('[DOERA Chat] Failed to select conversation:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Create new conversation
  const createNewConversation = () => {
    setCurrentConversation(null);
    setMessages([]);
    setActiveTask(null);
  };

  // Delete conversation
  const deleteConversation = async (conversationId) => {
    try {
      await api.delete(`/chat/conversations/${conversationId}`);
      setConversations(prev => prev.filter(c => (c._id || c.id) !== conversationId));
      if (currentConversation && (currentConversation._id || currentConversation.id) === conversationId) {
        createNewConversation();
      }
    } catch (err) {
      console.error('[DOERA Chat] Failed to delete conversation:', err);
    }
  };

  // Rename conversation
  const renameConversation = async (conversationId, newTitle) => {
    if (!newTitle || !newTitle.trim()) return;
    try {
      const res = await api.patch(`/chat/conversations/${conversationId}`, { title: newTitle.trim() });
      setConversations(prev => prev.map(c => (c._id || c.id) === conversationId ? { ...c, title: newTitle.trim() } : c));
      if (currentConversation && (currentConversation._id || currentConversation.id) === conversationId) {
        setCurrentConversation(prev => ({ ...prev, title: newTitle.trim() }));
      }
      return res.data;
    } catch (err) {
      console.error('[DOERA Chat] Failed to rename conversation:', err);
    }
  };

  // Send message
  const sendMessage = async (content, attachments = []) => {
    if ((!content || !content.trim()) && attachments.length === 0) return;
    if (isSending) return;

    try {
      setIsSending(true);

      const optimisticMsg = {
        _id: 'temp-' + Date.now(),
        sender: 'user',
        content,
        attachments,
        createdAt: new Date().toISOString(),
      };
      setMessages(prev => [...prev, optimisticMsg]);

      const res = await api.post('/chat/message', {
        conversationId: currentConversation ? (currentConversation._id || currentConversation.id) : null,
        message: content,
        model: selectedModel,
        attachments,
        userLocation: userLocation || null,
      });

      const data = res.data || {};
      const conversation = data.conversation;
      const userMsg = data.userMessage || optimisticMsg;
      const aiMsg = data.aiMessage;
      const task = data.task;
      const locationData = data.locationData || aiMsg?.locationData || task?.locationData || null;
      const chartConfig = data.chartConfig || aiMsg?.chartConfig || task?.chartConfig || null;

      // Update current conversation safely
      if (conversation && (!currentConversation || currentConversation._id !== conversation._id)) {
        setCurrentConversation(conversation);
        setConversations(prev => {
          if (!Array.isArray(prev)) return [conversation];
          const exists = prev.some(c => c && c._id === conversation._id);
          if (exists) {
            return prev.map(c => (c && c._id === conversation._id ? conversation : c));
          }
          return [conversation, ...prev];
        });
      }

      // Replace optimistic message and append real AI message with task & locationData attached safely
      const aiMsgWithTask = aiMsg
        ? {
            ...aiMsg,
            task: aiMsg.task || task,
            locationData: locationData,
            chartConfig: chartConfig,
          }
        : null;
      setMessages(prev => {
        const list = Array.isArray(prev) ? prev.filter(m => m && m._id !== optimisticMsg._id) : [];
        const nextList = [...list, userMsg];
        if (aiMsgWithTask) nextList.push(aiMsgWithTask);
        return nextList;
      });

      // Update daily usage tracking if returned
      if (data.usage) {
        setSubscription(prev => ({
          ...prev,
          plan: data.usage.plan || prev.plan,
          dailyLimit: data.usage.dailyLimit || data.usage.limit || prev.dailyLimit,
          limitRequests: data.usage.dailyLimit || data.usage.limit || prev.limitRequests,
          usedRequests: data.usage.used !== undefined ? data.usage.used : prev.usedRequests,
          remainingRequests: data.usage.remaining !== undefined ? data.usage.remaining : prev.remainingRequests,
          resetAt: data.usage.resetAt || prev.resetAt,
          resetsIn: data.usage.resetsIn || prev.resetsIn,
        }));
      }

      // If task was launched
      if (task) {
        setActiveTask(task);
        setTasks(prev => ({ ...prev, [task._id || task.taskId]: task }));
      }
    } catch (err) {
      console.error('[DOERA Chat] Error sending message:', err);

      // Check if user reached daily allowance (Requirement #8)
      if (
        err.response?.data?.error === 'DAILY_LIMIT_REACHED' ||
        err.response?.data?.error === 'FREE_LIMIT_REACHED' ||
        err.response?.data?.code === 'SUBSCRIPTION_LIMIT_EXCEEDED'
      ) {
        const details = err.response?.data || {};
        const plan = (details.plan || subscription?.plan || 'free').toLowerCase();
        const limit = details.dailyLimit || (plan === 'pro' ? 300 : plan === 'max' ? 500 : 20);
        const resetsIn = details.resetsIn || 'the next reset';

        setShowUpgradeModal(true);

        let messageText = '';
        if (plan === 'free') {
          messageText = `**Your daily DOERA FREE allowance has been used.**\n\nYou have used all ${limit} requests for today. Your allowance will automatically refresh in **${resetsIn}** (at next UTC reset).\n\nNeed more requests now? Upgrade to **DOERA Pro ($12/mo for 300 requests/day)** or **DOERA Max ($25/mo for 500 requests/day)**.`;
        } else if (plan === 'pro') {
          messageText = `**Your daily Pro allowance has been used.**\n\nYou have used all ${limit} requests for today. Your allowance will automatically refresh in **${resetsIn}**.\n\nNeed higher capacity? Upgrade to **DOERA Max ($25/mo for 500 requests/day)**.`;
        } else {
          messageText = `**You have reached today's ${limit}-request allowance.**\n\nYour DOERA Max allowance will automatically refresh in **${resetsIn}** (at next UTC reset).`;
        }

        setMessages(prev => [
          ...prev,
          {
            _id: 'limit-' + Date.now(),
            sender: 'assistant',
            content: messageText,
            createdAt: new Date().toISOString(),
          }
        ]);
        return;
      }

      // Determine user-friendly error message
      let errorText = 'I encountered an error processing your request. Please check your network and configuration, then try again.';
      if (!err.response && (err.code === 'ERR_NETWORK' || err.message?.includes('Network Error') || err.message?.includes('ECONNREFUSED'))) {
        errorText = 'Unable to connect to DOERA Backend Engine. Please verify that the backend server is running on port 5000.';
      } else if (err.response?.data?.error && typeof err.response.data.error === 'string') {
        errorText = `Error: ${err.response.data.error}`;
      } else if (err.response?.data?.message && typeof err.response.data.message === 'string') {
        errorText = `Error: ${err.response.data.message}`;
      }

      // Append standard error message to chat
      setMessages(prev => [
        ...prev,
        {
          _id: 'err-' + Date.now(),
          sender: 'assistant',
          content: errorText,
          isError: true,
          createdAt: new Date().toISOString(),
        }
      ]);
    } finally {
      setIsSending(false);
    }
  };

  // Stop response generation
  const stopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsStreaming(false);
    setIsSending(false);
  };

  // Submit message feedback (like / dislike)
  const feedbackMessage = async (messageId, feedback) => {
    try {
      const res = await api.post(`/chat/messages/${messageId}/feedback`, { feedback });
      setMessages(prev => prev.map(m => (m._id === messageId ? { ...m, feedback } : m)));
      return res.data;
    } catch (err) {
      console.error('[DOERA Chat] Failed to set message feedback:', err);
    }
  };

  // Toggle pin conversation
  const togglePinConversation = async (conversationId) => {
    try {
      const res = await api.patch(`/chat/conversations/${conversationId}/pin`);
      setConversations(prev =>
        prev.map(c => ((c._id || c.id) === conversationId ? { ...c, isPinned: res.data.isPinned } : c))
      );
      return res.data;
    } catch (err) {
      console.error('[DOERA Chat] Failed to toggle pin:', err);
    }
  };

  // Archive conversation
  const archiveConversation = async (conversationId) => {
    try {
      const res = await api.patch(`/chat/conversations/${conversationId}/archive`);
      setConversations(prev =>
        prev.map(c => ((c._id || c.id) === conversationId ? { ...c, status: res.data.status } : c))
      );
      return res.data;
    } catch (err) {
      console.error('[DOERA Chat] Failed to archive conversation:', err);
    }
  };

  // Approve a task action
  const approveTask = async (taskId, comments = '') => {
    try {
      const res = await api.post(`/tasks/${taskId}/approve`, { comments });
      const updated = res.data.task;
      setActiveTask(updated);
      setTasks(prev => ({ ...prev, [taskId]: updated }));
    } catch (err) {
      console.error('[DOERA Chat] Failed to approve task:', err);
    }
  };

  // Reject a task action
  const rejectTask = async (taskId, reason = '') => {
    try {
      const res = await api.post(`/tasks/${taskId}/reject`, { reason });
      const updated = res.data.task;
      setActiveTask(updated);
      setTasks(prev => ({ ...prev, [taskId]: updated }));
    } catch (err) {
      console.error('[DOERA Chat] Failed to reject task:', err);
    }
  };

  // Cancel running task
  const cancelTask = async (taskId) => {
    try {
      const res = await api.post(`/tasks/${taskId}/cancel`);
      const updated = res.data.task;
      setActiveTask(updated);
      setTasks(prev => ({ ...prev, [taskId]: updated }));
    } catch (err) {
      console.error('[DOERA Chat] Failed to cancel task:', err);
    }
  };

  // Resume interrupted task
  const resumeTask = async (taskId) => {
    try {
      const res = await api.post(`/tasks/${taskId}/resume`);
      const updated = res.data.task;
      setActiveTask(updated);
      setTasks(prev => ({ ...prev, [taskId]: updated }));
    } catch (err) {
      console.error('[DOERA Chat] Failed to resume task:', err);
    }
  };

  // Setup WebSocket event subscriptions
  useEffect(() => {
    const unsubConnection = wsClient.on('connection_change', (data) => {
      setConnectionStatus(data.status);
    });

    const unsubTaskUpdate = wsClient.on('task_update', (data) => {
      const updatedTask = data.task || data;
      if (!updatedTask || (!updatedTask._id && !updatedTask.taskId)) return;
      const tid = updatedTask._id || updatedTask.taskId;

      setTasks(prev => ({
        ...prev,
        [tid]: {
          ...(prev[tid] || {}),
          ...updatedTask
        }
      }));

      setActiveTask(prev => {
        if (!prev || (prev._id === tid || prev.taskId === tid)) {
          return { ...(prev || {}), ...updatedTask };
        }
        return prev;
      });

      // Synchronize attached task on messages in real-time
      setMessages(prev =>
        prev.map(m => {
          const mTaskId = typeof m.taskId === 'object' && m.taskId !== null
            ? (m.taskId._id || m.taskId.taskId)
            : m.taskId;
          if (mTaskId === tid || (m.task && (m.task._id === tid || m.task.taskId === tid))) {
            return {
              ...m,
              task: { ...(m.task || {}), ...updatedTask },
              taskId: typeof m.taskId === 'object' && m.taskId !== null
                ? { ...m.taskId, ...updatedTask }
                : updatedTask,
            };
          }
          return m;
        })
      );
    });

    const unsubTaskStep = wsClient.on('task_step', (data) => {
      const { taskId, step, currentAgent, currentAction } = data;
      setActiveTask(prev => {
        if (!prev || (prev._id !== taskId && prev.taskId !== taskId)) return prev;
        const steps = [...(prev.steps || [])];
        const stepIdx = steps.findIndex(s => s.name === step.name || s.id === step.id);
        if (stepIdx >= 0) {
          steps[stepIdx] = { ...steps[stepIdx], ...step };
        } else {
          steps.push(step);
        }
        return {
          ...prev,
          currentAgent: currentAgent || prev.currentAgent,
          currentAction: currentAction || prev.currentAction,
          steps,
        };
      });
    });

    // Listen for incoming messages from websocket (supports new_message, chat_message, task_completed)
    const handleIncomingMessage = (data) => {
      const incoming = (data && (data.message || data.aiMessage || data)) || null;
      if (!incoming || typeof incoming !== 'object' || !incoming.content) return;
      const incomingConvId = incoming.conversationId || data.conversationId;
      const currentConvId = currentConversation ? (currentConversation._id || currentConversation.id) : null;
      
      // If belongs to current conversation, or no conversation was selected yet
      if (!currentConvId || !incomingConvId || String(incomingConvId) === String(currentConvId)) {
        setMessages(prev => {
          const list = Array.isArray(prev) ? prev.filter(Boolean) : [];
          const incomingId = incoming._id || incoming.id;
          if (incomingId && list.some(m => (m._id || m.id) === incomingId)) {
            return list.map(m => ((m._id || m.id) === incomingId ? { ...m, ...incoming } : m));
          }
          return [...list, incoming];
        });
      }
    };

    const unsubNewMessage = wsClient.on('new_message', handleIncomingMessage);
    const unsubChatMessage = wsClient.on('chat_message', handleIncomingMessage);
    const unsubTaskCompleted = wsClient.on('task_completed', (data) => {
      if (data?.message) {
        handleIncomingMessage(data.message);
      }
      if (data?.task) {
        setActiveTask(data.task);
      }
    });

    return () => {
      unsubConnection();
      unsubTaskUpdate();
      unsubTaskStep();
      unsubNewMessage();
      unsubChatMessage();
      unsubTaskCompleted();
    };
  }, [currentConversation]);

  return (
    <ChatContext.Provider
      value={{
        conversations,
        currentConversation,
        messages,
        activeTask,
        tasks,
        isLoading,
        isSending,
        isStreaming,
        selectedModel,
        setSelectedModel,
        stopGeneration,
        connectionStatus,
        selectConversation,
        createNewConversation,
        deleteConversation,
        renameConversation,
        togglePinConversation,
        archiveConversation,
        feedbackMessage,
        sendMessage,
        approveTask,
        rejectTask,
        cancelTask,
        resumeTask,
        loadConversations,
        subscription,
        fetchSubscription,
        showUpgradeModal,
        setShowUpgradeModal,
        userLocation,
        setUserLocation,
        isLocationModalOpen,
        setIsLocationModalOpen,
        isTrackingActive,
        toggleLiveTracking,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};
