import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  Rocket,
  ShieldCheck,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Play,
  Pause,
  XCircle,
  RefreshCw,
  Search,
  Activity,
  Layers,
  Send,
  FileText,
  Check,
  Copy,
  ChevronDown,
  ChevronUp,
  Bot,
  PanelLeft,
  Sparkles,
  Inbox,
} from 'lucide-react';
import Sidebar from '../components/Sidebar/Sidebar';
import AmbientBackground from '../components/AmbientBackground';
import missionService from '../services/missionService';
import ProofOfExecutionCard from '../components/ProofOfExecution/ProofOfExecutionCard';
import FollowUpTrackerCard from '../components/FollowUp/FollowUpTrackerCard';
import './MissionControl.css';

export const MissionControlPage = () => {
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    if (typeof window !== 'undefined' && window.innerWidth <= 1024) return false;
    const saved = localStorage.getItem('doera_sidebar_open');
    return saved !== null ? saved === 'true' : true;
  });

  const [missions, setMissions] = useState([]);
  const [stats, setStats] = useState({ all: 0, active: 0, waitingForInput: 0, completed: 0, failed: 0 });
  const [activeTab, setActiveTab] = useState('ALL');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedMission, setSelectedMission] = useState(null);
  const [dossierLoading, setDossierLoading] = useState(false);
  const [dossierData, setDossierData] = useState(null);
  const [dossierTab, setDossierTab] = useState('OVERVIEW');
  const [followUpText, setFollowUpText] = useState('');
  const [followUpSubmitting, setFollowUpSubmitting] = useState(false);
  const [copiedId, setCopiedId] = useState(null);

  const toggleSidebar = () => {
    setSidebarOpen((prev) => {
      const next = !prev;
      localStorage.setItem('doera_sidebar_open', String(next));
      return next;
    });
  };

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

  const fetchMissions = async () => {
    try {
      setLoading(true);
      const res = await missionService.getMissions({ status: activeTab, search });
      setMissions(res.missions || []);
      setStats(res.stats || stats);
    } catch (err) {
      console.error('[Mission Control] Failed to fetch missions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMissions();
  }, [activeTab]);

  const handleOpenDossier = async (mission) => {
    try {
      setSelectedMission(mission);
      setDossierTab('OVERVIEW');
      setDossierLoading(true);
      const res = await missionService.getMissionById(mission.taskId || mission.missionId || mission._id);
      setDossierData(res);
    } catch (err) {
      console.error('[Mission Control] Failed to load dossier:', err);
    } finally {
      setDossierLoading(false);
    }
  };

  const handlePause = async (id, e) => {
    e.stopPropagation();
    try {
      await missionService.pauseMission(id);
      fetchMissions();
      if (selectedMission) {
        const res = await missionService.getMissionById(id);
        setDossierData(res);
      }
    } catch (err) {
      console.error('[Mission Control] Pause failed:', err);
    }
  };

  const handleResume = async (id, e) => {
    e.stopPropagation();
    try {
      await missionService.resumeMission(id);
      fetchMissions();
      if (selectedMission) {
        const res = await missionService.getMissionById(id);
        setDossierData(res);
      }
    } catch (err) {
      console.error('[Mission Control] Resume failed:', err);
    }
  };

  const handleCancel = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to cancel this mission?')) return;
    try {
      await missionService.cancelMission(id);
      fetchMissions();
      if (selectedMission) {
        const res = await missionService.getMissionById(id);
        setDossierData(res);
      }
    } catch (err) {
      console.error('[Mission Control] Cancel failed:', err);
    }
  };

  const handleSubmitFollowUp = async (e) => {
    e.preventDefault();
    if (!followUpText.trim() || followUpSubmitting || !selectedMission) return;
    try {
      setFollowUpSubmitting(true);
      const missionId = selectedMission.taskId || selectedMission.missionId || selectedMission._id;
      const res = await missionService.addFollowUp(missionId, followUpText.trim());
      setFollowUpText('');
      // Reload updated mission dossier from backend
      const updatedDossier = await missionService.getMissionById(missionId);
      setDossierData(updatedDossier);
      setSelectedMission(updatedDossier.mission);
      fetchMissions();
      setDossierTab('DELIVERABLES');
    } catch (err) {
      console.error('[Mission Control] Follow-up submission failed:', err);
      alert('Failed to submit follow-up directive: ' + (err.response?.data?.error || err.message));
    } finally {
      setFollowUpSubmitting(false);
    }
  };

  const handleCopyText = (id, text) => {
    if (!text) return;
    const contentToCopy = typeof text === 'object' ? JSON.stringify(text, null, 2) : String(text);
    navigator.clipboard.writeText(contentToCopy);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Helper for actual progress % calculation
  const calculateActualProgress = (m) => {
    if (m?.actualProgress !== undefined) return m.actualProgress;
    const subtasks = m?.subtasks || [];
    if (subtasks.length > 0) {
      const completed = subtasks.filter((s) => s.status === 'completed').length;
      return Math.round((completed / subtasks.length) * 100);
    }
    if (m?.status === 'COMPLETED') return 100;
    if (m?.status === 'FAILED' || m?.status === 'CANCELLED') return 0;
    return m?.progress || 0;
  };

  // Status badge styling helper
  const getStatusBadge = (status = 'CREATED') => {
    const norm = status.toUpperCase();
    if (norm === 'COMPLETED') {
      return { bg: 'rgba(16, 185, 129, 0.15)', color: '#10B981', border: '#10B981', label: 'COMPLETED' };
    }
    if (norm === 'PARTIALLY_COMPLETED') {
      return { bg: 'rgba(245, 158, 11, 0.15)', color: '#FBBF24', border: '#FBBF24', label: 'PARTIALLY COMPLETED' };
    }
    if (norm === 'WAITING_FOR_INPUT' || norm === 'WAITING_FOR_APPROVAL' || norm === 'AWAITING_APPROVAL') {
      return { bg: 'rgba(245, 158, 11, 0.15)', color: '#FBBF24', border: '#FBBF24', label: 'WAITING FOR INPUT' };
    }
    if (norm === 'FAILED') {
      return { bg: 'rgba(239, 68, 68, 0.15)', color: '#F87171', border: '#F87171', label: 'FAILED' };
    }
    if (norm === 'CANCELLED') {
      return { bg: 'rgba(100, 116, 139, 0.2)', color: '#94A3B8', border: '#94A3B8', label: 'CANCELLED' };
    }
    if (norm === 'PAUSED') {
      return { bg: 'rgba(148, 163, 184, 0.15)', color: '#CBD5E1', border: '#CBD5E1', label: 'PAUSED' };
    }
    if (norm === 'PLANNING') {
      return { bg: 'rgba(156, 82, 232, 0.15)', color: '#C084FC', border: '#C084FC', label: 'PLANNING' };
    }
    if (norm === 'VERIFICATION' || norm === 'VERIFYING') {
      return { bg: 'rgba(236, 72, 153, 0.15)', color: '#F472B6', border: '#F472B6', label: 'VERIFICATION' };
    }
    return { bg: 'rgba(241, 45, 152, 0.15)', color: '#F12D98', border: '#F12D98', label: norm.replace(/_/g, ' ') };
  };

  const activeMission = dossierData?.mission || selectedMission;
  const subtasksList = activeMission?.subtasks || dossierData?.subtasks || [];
  const completedTasks = subtasksList.filter((s) => s.status === 'completed');
  const pendingTasks = subtasksList.filter((s) => s.status === 'pending' || s.status === 'in_progress');
  const failedTasks = subtasksList.filter((s) => s.status === 'failed');
  const deliverablesList = activeMission?.deliverables || dossierData?.deliverables || [];
  const evidenceList = dossierData?.evidence || [];
  const assignedAgentsList = activeMission?.assignedAgents || dossierData?.assignedAgents || [];
  const currentProgress = calculateActualProgress(activeMission);

  return (
    <div
      className="doera-mission-layout"
      style={{
        display: 'flex',
        height: '100vh',
        width: '100vw',
        background: '#08050B',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      <Sidebar isOpen={sidebarOpen} onToggle={toggleSidebar} onClose={() => setSidebarOpen(false)} />

      <main
        className="doera-mission-main"
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          height: '100vh',
          overflowY: 'auto',
          position: 'relative',
        }}
      >
        <AmbientBackground />

        {/* Floating Toggle when Sidebar is closed */}
        {!sidebarOpen && (
          <div className="doera-workspace-floating-bar animate-fadeIn" style={{ position: 'absolute', top: 16, left: 16, zIndex: 100 }}>
            <button
              onClick={toggleSidebar}
              className="doera-sidebar-floating-btn"
              title="Open sidebar (Ctrl+B)"
              aria-label="Open sidebar"
            >
              <PanelLeft size={18} />
            </button>
          </div>
        )}

        <div className="doera-mission-page">
          {/* Top Navbar with Back to Chat */}
          <div className="doera-mission-navbar">
            <Link to="/chat" className="doera-mission-back-btn" title="Return to active chat workspace">
              <ArrowLeft size={16} />
              <span>Back to Chat</span>
            </Link>
            <div className="doera-mission-brand">
              <img src="/favicon.svg" alt="DOERA" style={{ width: 20, height: 20 }} />
              <span>DOERA AI 2.0</span>
            </div>
          </div>

          {/* Header */}
          <div className="doera-mission-header">
            <div>
              <h1 className="doera-mission-headline">
                <Rocket size={28} color="#F12D98" />
                DOERA Mission Control
              </h1>
              <p className="doera-mission-subline">
                Centralized orchestration dashboard monitoring autonomous agents, live executions, and response trackers.
              </p>
            </div>

            <button
              type="button"
              onClick={fetchMissions}
              className="doera-tab-btn"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                background: 'rgba(241, 45, 152, 0.14)',
                border: '1px solid #F12D98',
                color: '#FFFFFF',
                fontWeight: 600,
                padding: '7px 16px',
                borderRadius: 8,
                boxShadow: '0 0 12px rgba(241, 45, 152, 0.25)',
              }}
            >
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>

          {/* Metrics Grid */}
          <div className="doera-stats-grid">
            <div className="doera-stat-card">
              <div>
                <div className="doera-stat-number">{stats.all}</div>
                <div className="doera-stat-label">Total Missions</div>
              </div>
              <Layers size={22} color="#A38FA8" />
            </div>

            <div className="doera-stat-card">
              <div>
                <div className="doera-stat-number" style={{ color: '#F12D98' }}>
                  {stats.active}
                </div>
                <div className="doera-stat-label">In Progress</div>
              </div>
              <Activity size={22} color="#F12D98" />
            </div>

            <div className="doera-stat-card">
              <div>
                <div className="doera-stat-number" style={{ color: '#FBBF24' }}>
                  {stats.waitingForInput || stats.awaitingApproval || 0}
                </div>
                <div className="doera-stat-label">Waiting for Input</div>
              </div>
              <ShieldCheck size={22} color="#FBBF24" />
            </div>

            <div className="doera-stat-card">
              <div>
                <div className="doera-stat-number" style={{ color: '#10B981' }}>
                  {stats.completed}
                </div>
                <div className="doera-stat-label">Completed</div>
              </div>
              <CheckCircle2 size={22} color="#10B981" />
            </div>
          </div>

          {/* Filter and Search Bar */}
          <div className="doera-filter-bar">
            <div className="doera-tabs">
              {['ALL', 'IN_PROGRESS', 'WAITING_FOR_INPUT', 'COMPLETED', 'FAILED'].map((tab) => (
                <button
                  key={tab}
                  type="button"
                  className={`doera-tab-btn ${activeTab === tab ? 'active' : ''}`}
                  onClick={() => setActiveTab(tab)}
                >
                  {tab.replace(/_/g, ' ')}
                </button>
              ))}
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                fetchMissions();
              }}
            >
              <input
                type="text"
                className="doera-search-input"
                placeholder="Search by ID, title, or request..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </form>
          </div>

          {/* Mission Cards List */}
          <div className="doera-missions-list">
            {loading && missions.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: '#A38FA8' }}>
                Loading missions telemetry...
              </div>
            ) : missions.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: '#A38FA8' }}>
                No missions found matching current filter.
              </div>
            ) : (
              missions.map((m) => {
                const progress = calculateActualProgress(m);
                const subtasks = m.subtasks || [];
                const badge = getStatusBadge(m.status);

                return (
                  <div
                    key={m._id}
                    className="doera-mission-item"
                    onClick={() => handleOpenDossier(m)}
                    style={{ cursor: 'pointer' }}
                  >
                    <div className="doera-mission-top">
                      <div>
                        <h3 className="doera-mission-title">
                          {m.title || m.userRequest?.slice(0, 70) || 'Autonomous Execution Mission'}
                        </h3>
                        <div className="doera-mission-meta">
                          <span style={{ color: '#F12D98', fontWeight: 600 }}>{m.category || 'MISSION_PLANNING'}</span>
                          <span>•</span>
                          <span style={{ fontFamily: 'monospace' }}>ID: {m.missionId || m.taskId || m._id}</span>
                          <span>•</span>
                          <span>{new Date(m.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            padding: '4px 10px',
                            borderRadius: 20,
                            background: badge.bg,
                            color: badge.color,
                            border: `1px solid ${badge.border}`,
                          }}
                        >
                          {badge.label}
                        </span>

                        {(m.status === 'RUNNING' || m.status === 'IN_PROGRESS' || m.status === 'EXECUTING') && (
                          <button
                            type="button"
                            onClick={(e) => handlePause(m.taskId || m._id, e)}
                            className="doera-tab-btn"
                            style={{ padding: '4px 8px' }}
                            title="Pause mission"
                          >
                            <Pause size={12} />
                          </button>
                        )}

                        {m.status === 'PAUSED' && (
                          <button
                            type="button"
                            onClick={(e) => handleResume(m.taskId || m._id, e)}
                            className="doera-tab-btn"
                            style={{ padding: '4px 8px' }}
                            title="Resume mission"
                          >
                            <Play size={12} />
                          </button>
                        )}

                        {(m.status === 'RUNNING' || m.status === 'IN_PROGRESS' || m.status === 'PAUSED') && (
                          <button
                            type="button"
                            onClick={(e) => handleCancel(m.taskId || m._id, e)}
                            className="doera-tab-btn"
                            style={{ padding: '4px 8px', color: '#F87171' }}
                            title="Cancel mission"
                          >
                            <XCircle size={12} />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Accurate Progress bar based on real subtasks */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 11, color: '#A38FA8', marginBottom: 4 }}>
                      <span>Progress ({progress}%)</span>
                      <span>
                        {subtasks.filter((s) => s.status === 'completed').length} / {subtasks.length || 1} tasks verified
                      </span>
                    </div>
                    <div className="doera-progress-bar-wrap">
                      <div className="doera-progress-bar-fill" style={{ width: `${progress}%` }} />
                    </div>

                    {/* Subtasks Chips */}
                    {subtasks.length > 0 && (
                      <div className="doera-subtasks-chips">
                        {subtasks.map((st, sIdx) => (
                          <span key={sIdx} className={`doera-subtask-chip ${st.status}`}>
                            {st.status === 'completed' ? (
                              <CheckCircle2 size={10} color="#10B981" />
                            ) : st.status === 'failed' ? (
                              <AlertTriangle size={10} color="#F87171" />
                            ) : (
                              <Clock size={10} />
                            )}
                            {st.title || st.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Full Mission Dossier Modal */}
          {selectedMission && (
            <div className="doera-modal-backdrop" onClick={() => setSelectedMission(null)}>
              <div className="doera-dossier-modal" onClick={(e) => e.stopPropagation()}>
                {/* Modal Header */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                      <h2 style={{ fontSize: 20, fontWeight: 800, color: '#FFFFFF', margin: 0 }}>
                        {activeMission?.title || 'Mission Dossier'}
                      </h2>
                      <span
                        style={{
                          fontSize: 10.5,
                          fontWeight: 700,
                          padding: '3px 8px',
                          borderRadius: 14,
                          background: getStatusBadge(activeMission?.status).bg,
                          color: getStatusBadge(activeMission?.status).color,
                          border: `1px solid ${getStatusBadge(activeMission?.status).border}`,
                        }}
                      >
                        {getStatusBadge(activeMission?.status).label}
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: '#A38FA8', marginTop: 4 }}>
                      <span style={{ fontFamily: 'monospace', color: '#FF55BD' }}>
                        ID: {activeMission?.missionId || activeMission?.taskId || activeMission?._id}
                      </span>
                      <span> • Created: {new Date(activeMission?.createdAt || Date.now()).toLocaleString()}</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSelectedMission(null)}
                    style={{ background: 'none', border: 'none', color: '#A38FA8', cursor: 'pointer', fontSize: 20, padding: '0 4px' }}
                    title="Close modal"
                  >
                    ✕
                  </button>
                </div>

                {/* Dossier Navigation Tabs */}
                <div className="doera-dossier-tabs">
                  {[
                    { id: 'OVERVIEW', label: 'Overview' },
                    { id: 'SUBTASKS', label: `Tasks (${subtasksList.length})` },
                    { id: 'DELIVERABLES', label: `Deliverables (${deliverablesList.length})` },
                    { id: 'EVIDENCE', label: `Proof of Execution (${evidenceList.length})` },
                    { id: 'FOLLOW_UP', label: 'Follow-Up Tracker' },
                    { id: 'TIMELINE', label: `Timeline (${dossierData?.events?.length || 0})` },
                  ].map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      className={`doera-dossier-tab-btn ${dossierTab === t.id ? 'active' : ''}`}
                      onClick={() => setDossierTab(t.id)}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>

                {dossierLoading ? (
                  <div style={{ padding: '40px 0', textAlign: 'center', color: '#A38FA8' }}>
                    Loading mission audit records...
                  </div>
                ) : (
                  <div>
                    {/* 1. OVERVIEW TAB */}
                    {dossierTab === 'OVERVIEW' && (
                      <div>
                        <div style={{ background: '#0D0714', border: '1px solid #23112E', borderRadius: 12, padding: 16, marginBottom: 16 }}>
                          <h4 style={{ fontSize: 12, textTransform: 'uppercase', color: '#F12D98', margin: '0 0 6px 0' }}>
                            Original User Request
                          </h4>
                          <p style={{ color: '#EDE4EE', fontSize: 13, lineHeight: 1.6, margin: 0, fontStyle: 'italic' }}>
                            "{activeMission?.userRequest}"
                          </p>
                        </div>

                        {/* Actual Progress Bar */}
                        <div style={{ background: '#0D0714', border: '1px solid #23112E', borderRadius: 12, padding: 16, marginBottom: 16 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                            <span style={{ fontSize: 12, fontWeight: 700, color: '#FFFFFF' }}>
                              Actual Progress: {currentProgress}%
                            </span>
                            <span style={{ fontSize: 11, color: '#A38FA8' }}>
                              {completedTasks.length} completed / {pendingTasks.length} pending / {failedTasks.length} failed
                            </span>
                          </div>
                          <div className="doera-progress-bar-wrap">
                            <div className="doera-progress-bar-fill" style={{ width: `${currentProgress}%` }} />
                          </div>
                        </div>

                        {/* Assigned Agents */}
                        {assignedAgentsList.length > 0 && (
                          <div style={{ background: '#0D0714', border: '1px solid #23112E', borderRadius: 12, padding: 16, marginBottom: 16 }}>
                            <h4 style={{ fontSize: 12, textTransform: 'uppercase', color: '#C084FC', margin: '0 0 10px 0' }}>
                              Assigned Autonomous Agents ({assignedAgentsList.length})
                            </h4>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                              {assignedAgentsList.map((agent, aIdx) => (
                                <span
                                  key={aIdx}
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 6,
                                    fontSize: 11.5,
                                    padding: '4px 10px',
                                    borderRadius: 6,
                                    background: 'rgba(156, 82, 232, 0.12)',
                                    color: '#C084FC',
                                    border: '1px solid rgba(156, 82, 232, 0.3)',
                                  }}
                                >
                                  <Bot size={12} />
                                  {agent} Agent
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* 2. SUBTASKS TAB */}
                    {dossierTab === 'SUBTASKS' && (
                      <div>
                        {/* Completed Subtasks */}
                        {completedTasks.length > 0 && (
                          <div style={{ marginBottom: 18 }}>
                            <h4 style={{ fontSize: 12, textTransform: 'uppercase', color: '#10B981', margin: '0 0 10px 0', display: 'flex', alignItems: 'center', gap: 6 }}>
                              <CheckCircle2 size={13} /> Completed Tasks ({completedTasks.length})
                            </h4>
                            {completedTasks.map((st, idx) => (
                              <div key={idx} className="doera-subtask-detail-card completed">
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                  <div>
                                    <div style={{ fontSize: 13, fontWeight: 700, color: '#FFFFFF' }}>
                                      {st.title}
                                    </div>
                                    <div style={{ fontSize: 11, color: '#A38FA8', marginTop: 3 }}>
                                      Assigned: <span style={{ color: '#F12D98' }}>{st.agent}</span>
                                      {st.dependencies?.length > 0 && (
                                        <span> • Depends on: {st.dependencies.join(', ')}</span>
                                      )}
                                    </div>
                                  </div>
                                  <span style={{ fontSize: 10, color: '#10B981', fontWeight: 700, textTransform: 'uppercase' }}>
                                    Completed
                                  </span>
                                </div>
                                {st.details && (
                                  <div style={{ fontSize: 11.5, color: '#D1C4D4', marginTop: 6, background: '#050208', padding: '6px 10px', borderRadius: 6 }}>
                                    {st.details}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Pending Subtasks */}
                        {pendingTasks.length > 0 && (
                          <div style={{ marginBottom: 18 }}>
                            <h4 style={{ fontSize: 12, textTransform: 'uppercase', color: '#A38FA8', margin: '0 0 10px 0', display: 'flex', alignItems: 'center', gap: 6 }}>
                              <Clock size={13} /> Pending & In-Progress Tasks ({pendingTasks.length})
                            </h4>
                            {pendingTasks.map((st, idx) => (
                              <div key={idx} className={`doera-subtask-detail-card ${st.status}`}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                  <div>
                                    <div style={{ fontSize: 13, fontWeight: 700, color: '#FFFFFF' }}>
                                      {st.title}
                                    </div>
                                    <div style={{ fontSize: 11, color: '#A38FA8', marginTop: 3 }}>
                                      Assigned: <span style={{ color: '#F12D98' }}>{st.agent}</span>
                                      {st.dependencies?.length > 0 && (
                                        <span> • Dependencies: {st.dependencies.join(', ')}</span>
                                      )}
                                    </div>
                                  </div>
                                  <span style={{ fontSize: 10, color: '#FBBF24', fontWeight: 700, textTransform: 'uppercase' }}>
                                    {st.status.replace(/_/g, ' ')}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Failed Subtasks */}
                        {failedTasks.length > 0 && (
                          <div>
                            <h4 style={{ fontSize: 12, textTransform: 'uppercase', color: '#EF4444', margin: '0 0 10px 0', display: 'flex', alignItems: 'center', gap: 6 }}>
                              <AlertTriangle size={13} /> Failed Tasks ({failedTasks.length})
                            </h4>
                            {failedTasks.map((st, idx) => (
                              <div key={idx} className="doera-subtask-detail-card failed">
                                <div style={{ fontSize: 13, fontWeight: 700, color: '#F87171' }}>
                                  {st.title}
                                </div>
                                <div style={{ fontSize: 11, color: '#EF4444', marginTop: 4 }}>
                                  Error: {st.error || 'Task execution could not complete successfully.'}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* 3. DELIVERABLES TAB */}
                    {dossierTab === 'DELIVERABLES' && (
                      <div>
                        {deliverablesList.length === 0 ? (
                          <div style={{ textAlign: 'center', padding: '30px 0', color: '#A38FA8' }}>
                            No deliverables generated yet.
                          </div>
                        ) : (
                          deliverablesList.map((deliv, idx) => {
                            const contentStr = typeof deliv.content === 'object'
                              ? JSON.stringify(deliv.content, null, 2)
                              : String(deliv.content || '');

                            return (
                              <div key={deliv.id || idx} className="doera-deliverable-card">
                                <div className="doera-deliverable-header">
                                  <div>
                                    <h4 style={{ fontSize: 14, fontWeight: 700, color: '#FFFFFF', margin: 0 }}>
                                      {deliv.title}
                                    </h4>
                                    <div style={{ fontSize: 11, color: '#A38FA8', marginTop: 3 }}>
                                      Generated: {new Date(deliv.generatedAt || Date.now()).toLocaleTimeString()}
                                    </div>
                                  </div>

                                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <span className="doera-deliverable-type-badge">
                                      {deliv.type || 'DOCUMENT'}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => handleCopyText(deliv.id, contentStr)}
                                      className="doera-tab-btn"
                                      style={{ padding: '4px 8px', display: 'flex', alignItems: 'center', gap: 4 }}
                                      title="Copy deliverable content"
                                    >
                                      {copiedId === deliv.id ? <Check size={12} color="#10B981" /> : <Copy size={12} />}
                                      <span style={{ fontSize: 11 }}>{copiedId === deliv.id ? 'Copied' : 'Copy'}</span>
                                    </button>
                                  </div>
                                </div>

                                {deliv.summary && (
                                  <div style={{ fontSize: 12, color: '#D1C4D4', marginBottom: 8 }}>
                                    {deliv.summary}
                                  </div>
                                )}

                                <div className="doera-deliverable-preview">
                                  {contentStr.slice(0, 1800)}
                                  {contentStr.length > 1800 ? '\n\n... [Content truncated for preview. Click Copy to retrieve complete document]' : ''}
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    )}

                    {/* 4. EVIDENCE TAB */}
                    {dossierTab === 'EVIDENCE' && (
                      <div>
                        {evidenceList.length === 0 ? (
                          <div style={{ textAlign: 'center', padding: '30px 0', color: '#A38FA8' }}>
                            No proof of execution evidence records found for this mission.
                          </div>
                        ) : (
                          evidenceList.map((ev) => (
                            <ProofOfExecutionCard key={ev._id} evidence={ev} />
                          ))
                        )}
                      </div>
                    )}

                    {/* 5. FOLLOW-UP TRACKER TAB */}
                    {dossierTab === 'FOLLOW_UP' && (
                      <div>
                        <div style={{ marginBottom: 16 }}>
                          <h3 style={{ fontSize: 15, fontWeight: 800, color: '#FFFFFF', margin: '0 0 6px 0' }}>
                            Autonomous Follow-Up Tracker & Directives Terminal
                          </h3>
                          <p style={{ fontSize: 12, color: '#A38FA8', margin: 0 }}>
                            Return to previous missions at any time. Submit follow-up instructions to refine deliverables, resume paused actions, or perform secondary tasks without losing historical context.
                          </p>
                        </div>

                        {/* Interactive Follow-up Directive Terminal */}
                        <form onSubmit={handleSubmitFollowUp} className="doera-followup-box">
                          <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#F12D98', marginBottom: 8, textTransform: 'uppercase' }}>
                            Continue Mission with Follow-Up Directive
                          </label>
                          <textarea
                            className="doera-followup-textarea"
                            rows={3}
                            placeholder="Enter follow-up directive (e.g. 'Adjust budget by reallocating ₹5,000 from marketing to catering' or 'Draft a follow-up email to the Principal with venue confirmation')..."
                            value={followUpText}
                            onChange={(e) => setFollowUpText(e.target.value)}
                            disabled={followUpSubmitting}
                          />
                          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                            <button
                              type="submit"
                              className="doera-followup-send-btn"
                              disabled={!followUpText.trim() || followUpSubmitting}
                            >
                              <Send size={13} className={followUpSubmitting ? 'animate-spin' : ''} />
                              <span>{followUpSubmitting ? 'Processing Directive...' : 'Submit Follow-Up Directive'}</span>
                            </button>
                          </div>
                        </form>

                        {/* Registered Asynchronous Follow-Ups */}
                        {dossierData?.followUps && dossierData.followUps.length > 0 && (
                          <div style={{ marginTop: 24 }}>
                            <h4 style={{ fontSize: 13, textTransform: 'uppercase', color: '#9C52E8', letterSpacing: 0.5, marginBottom: 12 }}>
                              Active Response Trackers ({dossierData.followUps.length})
                            </h4>
                            {dossierData.followUps.map((flw) => (
                              <FollowUpTrackerCard key={flw._id} followUp={flw} onUpdated={fetchMissions} />
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* 6. TIMELINE TAB */}
                    {dossierTab === 'TIMELINE' && (
                      <div>
                        <h4 style={{ fontSize: 13, textTransform: 'uppercase', color: '#FFFFFF', letterSpacing: 0.5 }}>
                          Real-Time Agent Execution Timeline
                        </h4>

                        <div className="doera-timeline">
                          {dossierData?.events && dossierData.events.length > 0 ? (
                            dossierData.events.map((evt, eIdx) => (
                              <div key={eIdx} className="doera-timeline-item">
                                <div className="doera-timeline-dot" />
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                  <span style={{ color: '#F12D98', fontWeight: 700 }}>
                                    {evt.agentName || evt.agent || 'Supervisor'}
                                  </span>
                                  <span style={{ color: '#6B7280', fontSize: 11 }}>
                                    {new Date(evt.timestamp).toLocaleTimeString()}
                                  </span>
                                </div>
                                <div style={{ color: '#EDE4EE', marginTop: 2 }}>
                                  {evt.action || evt.message}
                                </div>
                              </div>
                            ))
                          ) : (
                            <div style={{ color: '#6B7280', fontSize: 12 }}>
                              No execution events recorded for this task yet.
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default MissionControlPage;
