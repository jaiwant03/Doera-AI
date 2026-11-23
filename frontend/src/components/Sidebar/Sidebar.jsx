import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  Plus, 
  MessageSquare, 
  Search, 
  Settings as SettingsIcon, 
  LogOut, 
  Trash2, 
  Edit3, 
  MoreVertical, 
  X, 
  Check,
  Activity,
  Layers,
  PanelLeft,
  ShieldCheck,
  Rocket,
  Sparkles
} from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useChat } from '../../context/ChatContext';
import AnimatedLogo from '../UI/AnimatedLogo';
import approvalService from '../../services/approvalService';
import wsClient from '../../services/websocket';

const Sidebar = ({ isOpen, onToggle, onClose }) => {
  const { user, logout } = useAuth();
  const { 
    conversations, 
    currentConversation, 
    selectConversation, 
    createNewConversation, 
    deleteConversation,
    renameConversation,
    connectionStatus,
    subscription,
    setShowUpgradeModal,
    fetchSubscription,
  } = useChat();

  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [activeMenuId, setActiveMenuId] = useState(null);
  const [isMobile, setIsMobile] = useState(() => {
    return typeof window !== 'undefined' ? window.innerWidth <= 1024 : false;
  });
  const [pendingApprovalCount, setPendingApprovalCount] = useState(0);
  const location = useLocation();
  const navigate = useNavigate();
  const menuRef = useRef(null);

  // Handle Logout to Landing Page
  const handleLogout = async () => {
    try {
      await logout();
    } finally {
      navigate('/', { replace: true });
    }
  };

  // Fetch pending approval count
  const updateApprovalCount = async () => {
    try {
      const counts = await approvalService.getApprovalCounts();
      if (typeof counts?.pending === 'number') {
        setPendingApprovalCount(counts.pending);
      }
    } catch (_) {}
  };

  useEffect(() => {
    updateApprovalCount();

    const unsubCreated = wsClient.on('approval_created', () => updateApprovalCount());
    const unsubUpdated = wsClient.on('approval_updated', () => updateApprovalCount());
    const unsubTask = wsClient.on('task_update', () => updateApprovalCount());

    return () => {
      if (unsubCreated) unsubCreated();
      if (unsubUpdated) unsubUpdated();
      if (unsubTask) unsubTask();
    };
  }, []);

  // Track viewport width for mobile-only overlay
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 1024);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Close context menu on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setActiveMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter conversations
  const filteredConversations = useMemo(() => {
    return conversations.filter((c) =>
      (c.title || 'Untitled Task')
        .toLowerCase()
        .includes(searchQuery.toLowerCase())
    );
  }, [conversations, searchQuery]);

  // Group conversations by date
  const groupedConversations = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const yesterday = today - 86400000;
    const pastWeek = today - 7 * 86400000;

    const groups = {
      Today: [],
      Yesterday: [],
      'Previous 7 Days': [],
      Older: [],
    };

    filteredConversations.forEach((conv) => {
      const convDate = new Date(conv.updatedAt || conv.createdAt || Date.now()).getTime();
      if (convDate >= today) {
        groups.Today.push(conv);
      } else if (convDate >= yesterday) {
        groups.Yesterday.push(conv);
      } else if (convDate >= pastWeek) {
        groups['Previous 7 Days'].push(conv);
      } else {
        groups.Older.push(conv);
      }
    });

    return groups;
  }, [filteredConversations]);

  const handleSelect = (id) => {
    selectConversation(id);
    setActiveMenuId(null);
    if (location.pathname !== '/chat') {
      navigate('/chat');
    }
    if (window.innerWidth < 1024 && onClose) {
      onClose();
    }
  };

  const handleNewChat = () => {
    createNewConversation();
    setActiveMenuId(null);
    if (location.pathname !== '/chat') {
      navigate('/chat');
    }
    if (window.innerWidth < 1024 && onClose) {
      onClose();
    }
  };

  const startEditing = (conv, e) => {
    e.stopPropagation();
    setEditingId(conv._id);
    setEditingTitle(conv.title || '');
    setActiveMenuId(null);
  };

  const saveEditing = async (id, e) => {
    e.stopPropagation();
    if (editingTitle.trim()) {
      await renameConversation(id, editingTitle.trim());
    }
    setEditingId(null);
  };

  const cancelEditing = (e) => {
    e.stopPropagation();
    setEditingId(null);
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (window.confirm('Delete this conversation history?')) {
      await deleteConversation(id);
    }
    setActiveMenuId(null);
  };

  return (
    <>
      {/* Mobile Drawer Backdrop — rendered strictly on mobile devices */}
      {isMobile && isOpen && (
        <div 
          className="doera-sidebar-backdrop"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside className={`doera-sidebar ${isOpen ? 'open' : 'collapsed'}`}>
        {/* 1. TOP BRAND HEADER */}
        <div className="doera-sidebar-header">
          <Link to="/chat" className="doera-brand-link">
            <AnimatedLogo size="sm" state="idle" showAura={false} />
            <div className="doera-brand-title-group">
              <span className="doera-brand-name">DOERA AI</span>
              <span className="doera-brand-badge">2.0</span>
            </div>
          </Link>
          <button
            onClick={onToggle || onClose}
            className="doera-sidebar-toggle-btn"
            title="Close sidebar"
            aria-label="Close sidebar"
          >
            <PanelLeft size={18} />
          </button>
        </div>

        {/* 2. NEW TASK PRIMARY ACTION */}
        <div className="doera-sidebar-action-wrap">
          <button
            onClick={handleNewChat}
            className="doera-btn-new-task"
            title="Start a new autonomous task (⌘N)"
          >
            <div className="doera-btn-new-task-left">
              <Plus size={16} strokeWidth={2.4} />
              <span>New Task</span>
            </div>
            <kbd className="doera-kbd-shortcut">⌘N</kbd>
          </button>
        </div>

        {/* 3. SEARCH BAR */}
        <div className="doera-sidebar-search-wrap">
          <div className="doera-search-input-box">
            <Search size={14} className="doera-search-icon" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="doera-search-input"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="doera-search-clear-btn"
                title="Clear search"
              >
                <X size={12} />
              </button>
            )}
          </div>
        </div>

        {/* 4. CONVERSATION HISTORY LIST */}
        <div className="doera-sidebar-history">
          {filteredConversations.length === 0 ? (
            <div className="doera-history-empty">
              <MessageSquare size={20} style={{ opacity: 0.4, marginBottom: 6 }} />
              <span>{searchQuery ? 'No matching tasks' : 'No tasks yet'}</span>
            </div>
          ) : (
            Object.entries(groupedConversations).map(([groupName, items]) => {
              if (!items.length) return null;
              return (
                <div key={groupName} className="doera-history-group">
                  <div className="doera-group-heading">{groupName}</div>
                  <div className="doera-group-items">
                    {items.map((conv) => {
                      const isActive = currentConversation?._id === conv._id;
                      const isEditing = editingId === conv._id;

                      return (
                        <div
                          key={conv._id}
                          onClick={() => !isEditing && handleSelect(conv._id)}
                          className={`doera-conv-item ${isActive ? 'active' : ''}`}
                        >
                          <MessageSquare size={14} className="doera-conv-icon" />

                          {isEditing ? (
                            <div className="doera-conv-edit-form" onClick={(e) => e.stopPropagation()}>
                              <input
                                type="text"
                                value={editingTitle}
                                onChange={(e) => setEditingTitle(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') saveEditing(conv._id, e);
                                  if (e.key === 'Escape') cancelEditing(e);
                                }}
                                autoFocus
                                className="doera-conv-edit-input"
                              />
                              <button
                                onClick={(e) => saveEditing(conv._id, e)}
                                className="doera-conv-edit-btn check"
                                title="Save"
                              >
                                <Check size={12} />
                              </button>
                              <button
                                onClick={cancelEditing}
                                className="doera-conv-edit-btn cancel"
                                title="Cancel"
                              >
                                <X size={12} />
                              </button>
                            </div>
                          ) : (
                            <>
                              <span className="doera-conv-title" title={conv.title || 'Untitled Task'}>
                                {conv.title || 'Untitled Task'}
                              </span>

                              {/* Context menu button */}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveMenuId(activeMenuId === conv._id ? null : conv._id);
                                }}
                                className="doera-conv-menu-trigger"
                                title="Options"
                              >
                                <MoreVertical size={13} />
                              </button>

                              {/* Context Dropdown */}
                              {activeMenuId === conv._id && (
                                <div 
                                  ref={menuRef} 
                                  className="doera-conv-dropdown animate-fadeIn"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <button
                                    onClick={(e) => startEditing(conv, e)}
                                    className="doera-dropdown-item"
                                  >
                                    <Edit3 size={12} />
                                    <span>Rename</span>
                                  </button>
                                  <button
                                    onClick={(e) => handleDelete(conv._id, e)}
                                    className="doera-dropdown-item danger"
                                  >
                                    <Trash2 size={12} />
                                    <span>Delete</span>
                                  </button>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* 5. BOTTOM STATUS & USER PROFILE */}
        <div className="doera-sidebar-footer">
          {/* Connection Status Pill */}
          <div className="doera-conn-status-row">
            <span className="doera-live-pulse-dot" />
            <span className="doera-conn-status-text">
              {connectionStatus === 'connected' ? 'DOERA Engine Live' : 'Connecting to Engine...'}
            </span>
          </div>

          {/* Navigation Links */}
          <Link
            to="/chat?tab=multi-agent"
            className={`doera-footer-nav-link ${location.search.includes('tab=multi-agent') ? 'active' : ''}`}
            style={{ display: 'flex', alignItems: 'center', gap: 10 }}
          >
            <Sparkles size={16} color="#FF55BD" />
            <span>Multi-Agent Research</span>
          </Link>

          <Link
            to="/missions"
            className={`doera-footer-nav-link ${location.pathname === '/missions' ? 'active' : ''}`}
            style={{ display: 'flex', alignItems: 'center', gap: 10 }}
          >
            <Rocket size={16} color="#F12D98" />
            <span>Mission Control</span>
          </Link>

          <Link
            to="/approvals"
            className={`doera-footer-nav-link ${location.pathname === '/approvals' ? 'active' : ''}`}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <ShieldCheck size={16} />
              <span>Approval Center</span>
            </div>
            {pendingApprovalCount > 0 && (
              <span
                style={{
                  background: '#F12D98',
                  color: '#FFF',
                  fontSize: '10px',
                  fontWeight: '700',
                  padding: '2px 7px',
                  borderRadius: '10px',
                  boxShadow: '0 0 10px rgba(241, 45, 152, 0.5)',
                }}
              >
                {pendingApprovalCount}
              </span>
            )}
          </Link>

          <Link
            to="/settings"
            className={`doera-footer-nav-link ${location.pathname === '/settings' ? 'active' : ''}`}
          >
            <SettingsIcon size={16} />
            <span>Integrations & Settings</span>
          </Link>

          {/* User Profile Card */}
          <div className="doera-user-card">
            <div className="doera-user-avatar">
              <span>{user?.name ? user.name.charAt(0).toUpperCase() : 'U'}</span>
            </div>
            <div className="doera-user-meta">
              <span className="doera-user-name">{user?.name || 'Authorized User'}</span>
              <span className="doera-user-email">{user?.email || 'user@doera.ai'}</span>
            </div>
            <button
              onClick={handleLogout}
              className="doera-btn-icon doera-logout-btn"
              title="Sign out of DOERA"
            >
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
