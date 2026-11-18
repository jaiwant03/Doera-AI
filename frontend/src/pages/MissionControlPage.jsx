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
  Eye,
  RefreshCw,
  Search,
  Activity,
  Layers,
  ArrowRight,
  PanelLeft,
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
  const [stats, setStats] = useState({ all: 0, active: 0, awaitingApproval: 0, completed: 0, failed: 0 });
  const [activeTab, setActiveTab] = useState('ALL');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedMission, setSelectedMission] = useState(null);
  const [dossierLoading, setDossierLoading] = useState(false);
  const [dossierData, setDossierData] = useState(null);

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
      setDossierLoading(true);
      const res = await missionService.getMissionById(mission.taskId || mission._id);
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
    } catch (err) {
      console.error('[Mission Control] Pause failed:', err);
    }
  };

  const handleResume = async (id, e) => {
    e.stopPropagation();
    try {
      await missionService.resumeMission(id);
      fetchMissions();
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
    } catch (err) {
      console.error('[Mission Control] Cancel failed:', err);
    }
  };

  return (
    <div className="doera-mission-layout" style={{ display: 'flex', height: '100vh', width: '100vw', background: '#08050B', overflow: 'hidden', position: 'relative' }}>
      <Sidebar
        isOpen={sidebarOpen}
        onToggle={toggleSidebar}
        onClose={() => setSidebarOpen(false)}
      />

      <main className="doera-mission-main" style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100vh', overflowY: 'auto', position: 'relative' }}>
        <AmbientBackground />

        {/* Floating Toggle if Sidebar is closed */}
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
          style={{ display: 'flex', alignItems: 'center', gap: 6, border: '1px solid #361744' }}
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Metrics Row */}
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
            <div className="doera-stat-number" style={{ color: '#F12D98' }}>{stats.active}</div>
            <div className="doera-stat-label">Active Agents</div>
          </div>
          <Activity size={22} color="#F12D98" />
        </div>

        <div className="doera-stat-card">
          <div>
            <div className="doera-stat-number" style={{ color: '#FBBF24' }}>{stats.awaitingApproval}</div>
            <div className="doera-stat-label">Awaiting Approval</div>
          </div>
          <ShieldCheck size={22} color="#FBBF24" />
        </div>

        <div className="doera-stat-card">
          <div>
            <div className="doera-stat-number" style={{ color: '#10B981' }}>{stats.completed}</div>
            <div className="doera-stat-label">Completed</div>
          </div>
          <CheckCircle2 size={22} color="#10B981" />
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="doera-filter-bar">
        <div className="doera-tabs">
          {['ALL', 'ACTIVE', 'AWAITING_APPROVAL', 'COMPLETED', 'FAILED'].map((tab) => (
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
            placeholder="Search missions..."
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
            const progress = m.progress || (m.status === 'COMPLETED' ? 100 : m.status === 'RUNNING' ? 50 : 25);
            const subtasks = m.subtasks || [];

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
                      <span style={{ color: '#F12D98', fontWeight: 600 }}>{m.category || 'GENERAL'}</span>
                      <span>•</span>
                      <span>ID: {m.taskId || m._id}</span>
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
                        background:
                          m.status === 'COMPLETED'
                            ? 'rgba(16, 185, 129, 0.15)'
                            : m.status === 'WAITING_FOR_APPROVAL'
                            ? 'rgba(245, 158, 11, 0.15)'
                            : 'rgba(241, 45, 152, 0.15)',
                        color:
                          m.status === 'COMPLETED'
                            ? '#10B981'
                            : m.status === 'WAITING_FOR_APPROVAL'
                            ? '#FBBF24'
                            : '#F12D98',
                        border: '1px solid currentColor',
                      }}
                    >
                      {m.status.replace(/_/g, ' ')}
                    </span>

                    {m.status === 'RUNNING' && (
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

                    {(m.status === 'RUNNING' || m.status === 'PAUSED') && (
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

                {/* Progress bar */}
                <div className="doera-progress-bar-wrap">
                  <div className="doera-progress-bar-fill" style={{ width: `${progress}%` }} />
                </div>

                {/* Subtasks */}
                {subtasks.length > 0 && (
                  <div className="doera-subtasks-chips">
                    {subtasks.map((st, sIdx) => (
                      <span key={sIdx} className={`doera-subtask-chip ${st.status}`}>
                        {st.status === 'completed' ? (
                          <CheckCircle2 size={10} color="#10B981" />
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
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <div>
                <h2 style={{ fontSize: 20, fontWeight: 800, color: '#FFFFFF', margin: 0 }}>
                  Mission Dossier: {selectedMission.taskId || selectedMission._id}
                </h2>
                <div style={{ fontSize: 12, color: '#A38FA8', marginTop: 4 }}>
                  "{selectedMission.userRequest}"
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedMission(null)}
                style={{ background: 'none', border: 'none', color: '#A38FA8', cursor: 'pointer', fontSize: 18 }}
              >
                ✕
              </button>
            </div>

            {dossierLoading ? (
              <div style={{ padding: '40px 0', textAlign: 'center', color: '#A38FA8' }}>
                Loading mission audit records...
              </div>
            ) : (
              <div>
                {/* Proof of Execution section */}
                {dossierData?.evidence && dossierData.evidence.length > 0 && (
                  <div style={{ marginBottom: 20 }}>
                    <h4 style={{ fontSize: 13, textTransform: 'uppercase', color: '#F12D98', letterSpacing: 0.5 }}>
                      Verifiable Proof of Execution ({dossierData.evidence.length})
                    </h4>
                    {dossierData.evidence.map((ev) => (
                      <ProofOfExecutionCard key={ev._id} evidence={ev} />
                    ))}
                  </div>
                )}

                {/* FollowUp Tracker */}
                {dossierData?.followUps && dossierData.followUps.length > 0 && (
                  <div style={{ marginBottom: 20 }}>
                    <h4 style={{ fontSize: 13, textTransform: 'uppercase', color: '#9C52E8', letterSpacing: 0.5 }}>
                      Response Tracking & Follow-Ups ({dossierData.followUps.length})
                    </h4>
                    {dossierData.followUps.map((flw) => (
                      <FollowUpTrackerCard key={flw._id} followUp={flw} />
                    ))}
                  </div>
                )}

                {/* Real-time TaskEvent Timeline */}
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
                              {evt.agentName || evt.agent || 'Agent'}
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
