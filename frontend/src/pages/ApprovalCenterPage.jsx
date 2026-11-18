import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Clock,
  Filter,
  Search,
  RefreshCw,
  AlertTriangle,
  PanelLeft,
} from 'lucide-react';
import Sidebar from '../components/Sidebar/Sidebar';
import AmbientBackground from '../components/AmbientBackground';
import ApprovalCard from '../components/ApprovalCenter/ApprovalCard';
import ApprovalDetailsModal from '../components/ApprovalCenter/ApprovalDetailsModal';
import ApprovalEditModal from '../components/ApprovalCenter/ApprovalEditModal';
import ApprovalConfirmModal from '../components/ApprovalCenter/ApprovalConfirmModal';
import ApprovalRejectModal from '../components/ApprovalCenter/ApprovalRejectModal';
import approvalService from '../services/approvalService';
import wsClient from '../services/websocket';
import '../components/ApprovalCenter/ApprovalCenter.css';

const ApprovalCenterPage = () => {
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    if (typeof window !== 'undefined' && window.innerWidth <= 1024) return false;
    const saved = localStorage.getItem('doera_sidebar_open');
    return saved !== null ? saved === 'true' : true;
  });

  const [activeTab, setActiveTab] = useState('pending'); // 'pending' | 'approved' | 'rejected' | 'history' | 'all'
  const [riskFilter, setRiskFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [approvals, setApprovals] = useState([]);
  const [counts, setCounts] = useState({
    pending: 0,
    approved: 0,
    rejected: 0,
    executed: 0,
    failed: 0,
    expired: 0,
    total: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [actionNotice, setActionNotice] = useState(null);

  // Active Modals state
  const [detailsApproval, setDetailsApproval] = useState(null);
  const [editApproval, setEditApproval] = useState(null);
  const [confirmApproval, setConfirmApproval] = useState(null);
  const [rejectApproval, setRejectApproval] = useState(null);

  const toggleSidebar = () => {
    setSidebarOpen((prev) => {
      const next = !prev;
      localStorage.setItem('doera_sidebar_open', String(next));
      return next;
    });
  };

  const fetchApprovals = useCallback(async (showIndicator = false) => {
    if (showIndicator) setRefreshing(true);
    setError(null);
    try {
      const data = await approvalService.getApprovals({
        status: activeTab,
        riskLevel: riskFilter || undefined,
        search: searchQuery || undefined,
        limit: 50,
      });
      setApprovals(data.approvals || []);
      if (data.counts) setCounts(data.counts);
    } catch (err) {
      console.error('[ApprovalCenter] Failed to fetch approvals:', err.message);
      setError(err.response?.data?.error || err.message || 'Failed to load approvals queue.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeTab, riskFilter, searchQuery]);

  useEffect(() => {
    fetchApprovals();
  }, [fetchApprovals]);

  // Subscribe to real-time WebSocket updates
  useEffect(() => {
    const unsubCreated = wsClient.on('approval_created', (data) => {
      fetchApprovals();
    });

    const unsubUpdated = wsClient.on('approval_updated', (data) => {
      fetchApprovals();
    });

    const unsubTask = wsClient.on('task_update', () => {
      fetchApprovals();
    });

    return () => {
      if (unsubCreated) unsubCreated();
      if (unsubUpdated) unsubUpdated();
      if (unsubTask) unsubTask();
    };
  }, [fetchApprovals]);

  // Approve action handler
  const handleInitiateApprove = (approval) => {
    const isHighImpact =
      ['HIGH', 'CRITICAL'].includes(approval.riskLevel) ||
      ['BOOK_APPOINTMENT', 'CONFIRM_BOOKING', 'EXECUTE_PAYMENT', 'SUBMIT_FORM'].includes(approval.actionType);

    if (isHighImpact) {
      setConfirmApproval(approval);
    } else {
      executeApproveDirect(approval);
    }
  };

  const executeApproveDirect = async (approval) => {
    setActionNotice(null);
    try {
      await approvalService.approveAction(approval._id, {
        actionVersion: approval.actionVersion,
      });
      setActionNotice({ type: 'success', text: `Action "${approval.actionTitle}" successfully authorized & dispatched!` });
      await fetchApprovals();
    } catch (err) {
      const errMsg = err.response?.data?.error || err.message;
      setActionNotice({ type: 'error', text: `Approval error: ${errMsg}` });
    }
  };

  // Edit action handler
  const handleSaveEdit = async (updates, approveAfter) => {
    if (!editApproval) return;
    setActionNotice(null);
    try {
      const updated = await approvalService.editApproval(editApproval._id, updates);
      if (approveAfter) {
        await approvalService.approveAction(updated._id, {
          actionVersion: updated.actionVersion,
        });
        setActionNotice({ type: 'success', text: `Action "${updated.actionTitle}" updated & authorized!` });
      } else {
        setActionNotice({ type: 'success', text: `Action parameters updated (v${updated.actionVersion}).` });
      }
      await fetchApprovals();
    } catch (err) {
      setActionNotice({ type: 'error', text: `Edit error: ${err.response?.data?.error || err.message}` });
    }
  };

  // Reject action handler
  const handleConfirmReject = async (reason) => {
    if (!rejectApproval) return;
    setActionNotice(null);
    try {
      await approvalService.rejectAction(rejectApproval._id, { reason });
      setActionNotice({ type: 'success', text: `Action "${rejectApproval.actionTitle}" rejected.` });
      await fetchApprovals();
    } catch (err) {
      setActionNotice({ type: 'error', text: `Rejection error: ${err.response?.data?.error || err.message}` });
    }
  };

  return (
    <div className="doera-approval-page">
      <Sidebar
        isOpen={sidebarOpen}
        onToggle={toggleSidebar}
        onClose={() => setSidebarOpen(false)}
      />

      <main className="doera-approval-main">
        <AmbientBackground />

        {/* Floating Toggle if Sidebar is closed */}
        {!sidebarOpen && (
          <div className="doera-workspace-floating-bar animate-fadeIn" style={{ position: 'absolute', top: 16, left: 16, zIndex: 100 }}>
            <button
              onClick={toggleSidebar}
              className="doera-sidebar-floating-btn"
              title="Open sidebar"
            >
              <PanelLeft size={18} />
            </button>
          </div>
        )}

        <div className="doera-approval-container" style={{ position: 'relative', zIndex: 1 }}>
          {error && (
            <div
              style={{
                background: 'rgba(239, 68, 68, 0.12)',
                border: '1px solid rgba(239, 68, 68, 0.4)',
                color: '#F87171',
                borderRadius: 12,
                padding: '14px 18px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <AlertTriangle size={18} />
                <span style={{ fontSize: 13, fontWeight: 500 }}>{error}</span>
              </div>
              <button
                type="button"
                onClick={() => fetchApprovals(true)}
                className="doera-btn-edit"
                style={{ borderColor: 'rgba(239, 68, 68, 0.5)', color: '#FFF' }}
              >
                Retry
              </button>
            </div>
          )}

          {actionNotice && (
            <div
              style={{
                background: actionNotice.type === 'error' ? 'rgba(239, 68, 68, 0.12)' : 'rgba(16, 185, 129, 0.12)',
                border: `1px solid ${actionNotice.type === 'error' ? 'rgba(239, 68, 68, 0.4)' : 'rgba(16, 185, 129, 0.4)'}`,
                color: actionNotice.type === 'error' ? '#F87171' : '#10B981',
                borderRadius: 12,
                padding: '12px 18px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {actionNotice.type === 'error' ? <AlertTriangle size={18} /> : <CheckCircle2 size={18} />}
                <span style={{ fontSize: 13, fontWeight: 500 }}>{actionNotice.text}</span>
              </div>
              <button
                type="button"
                onClick={() => setActionNotice(null)}
                style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: 16 }}
              >
                ✕
              </button>
            </div>
          )}

          {/* Top Bar with Back to Chat */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <Link
              to="/chat"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 7,
                fontSize: 13,
                fontWeight: 600,
                color: '#FF55BD',
                textDecoration: 'none',
                padding: '6px 12px',
                borderRadius: 8,
                background: 'rgba(241, 45, 152, 0.08)',
                border: '1px solid rgba(241, 45, 152, 0.25)',
                transition: 'all 0.2s ease',
              }}
              title="Return to active chat workspace"
            >
              <ArrowLeft size={15} />
              <span>Back to Chat</span>
            </Link>
          </div>

          {/* Header */}
          <header className="doera-approval-header">
            <div className="doera-approval-header-left">
              <div className="doera-approval-header-icon">
                <ShieldCheck size={24} />
              </div>
              <div className="doera-approval-title-group">
                <h1>
                  Human Approval Center
                  <span className="doera-approval-live-badge">
                    <span className="doera-live-pulse-dot" style={{ width: 6, height: 6 }} />
                    Live Authorization Gate
                  </span>
                </h1>
                <p className="doera-approval-desc">
                  Review, authorize, adjust, or audit autonomous external actions before real-world execution.
                </p>
              </div>
            </div>

            {/* Header Stat Badges */}
            <div className="doera-approval-header-stats">
              <div className="doera-approval-stat-chip">
                <span className="doera-stat-num pending">{counts.pending}</span>
                <span className="doera-stat-label">Pending</span>
              </div>
              <div className="doera-approval-stat-chip">
                <span className="doera-stat-num approved">{counts.approved + counts.executed}</span>
                <span className="doera-stat-label">Authorized</span>
              </div>
              <div className="doera-approval-stat-chip">
                <span className="doera-stat-num rejected">{counts.rejected}</span>
                <span className="doera-stat-label">Rejected</span>
              </div>
              <div className="doera-approval-stat-chip">
                <span className="doera-stat-num">{counts.total}</span>
                <span className="doera-stat-label">Total Actions</span>
              </div>
            </div>
          </header>

          {/* Filter Toolbar */}
          <div className="doera-approval-toolbar">
            <div className="doera-approval-tabs">
              <button
                type="button"
                className={`doera-approval-tab-btn ${activeTab === 'pending' ? 'active' : ''}`}
                onClick={() => setActiveTab('pending')}
              >
                <span>Pending Approvals</span>
                <span className="doera-tab-counter">{counts.pending}</span>
              </button>

              <button
                type="button"
                className={`doera-approval-tab-btn ${activeTab === 'approved' ? 'active' : ''}`}
                onClick={() => setActiveTab('approved')}
              >
                <span>Approved</span>
                <span className="doera-tab-counter">{counts.approved}</span>
              </button>

              <button
                type="button"
                className={`doera-approval-tab-btn ${activeTab === 'rejected' ? 'active' : ''}`}
                onClick={() => setActiveTab('rejected')}
              >
                <span>Rejected</span>
                <span className="doera-tab-counter">{counts.rejected}</span>
              </button>

              <button
                type="button"
                className={`doera-approval-tab-btn ${activeTab === 'history' ? 'active' : ''}`}
                onClick={() => setActiveTab('history')}
              >
                <span>Execution History</span>
                <span className="doera-tab-counter">{counts.executed + counts.failed + counts.expired}</span>
              </button>

              <button
                type="button"
                className={`doera-approval-tab-btn ${activeTab === 'all' ? 'active' : ''}`}
                onClick={() => setActiveTab('all')}
              >
                <span>All</span>
                <span className="doera-tab-counter">{counts.total}</span>
              </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              {/* Risk Level Filter */}
              <select
                className="doera-risk-select"
                value={riskFilter}
                onChange={(e) => setRiskFilter(e.target.value)}
                aria-label="Filter by Risk Level"
              >
                <option value="">All Risk Levels</option>
                <option value="CRITICAL">Critical Risk</option>
                <option value="HIGH">High Risk</option>
                <option value="MEDIUM">Medium Risk</option>
                <option value="LOW">Low Risk</option>
              </select>

              {/* Search Box */}
              <div className="doera-approval-search-wrap">
                <div className="doera-approval-search-box">
                  <Search size={14} color="#796882" />
                  <input
                    type="text"
                    placeholder="Search by action, target, or agent..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="doera-approval-search-input"
                  />
                </div>
              </div>

              {/* Refresh Button */}
              <button
                type="button"
                onClick={() => fetchApprovals(true)}
                className="doera-btn-edit"
                title="Refresh approval queue"
              >
                <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>

          {/* List of Approval Cards */}
          <div className="doera-approval-list">
            {loading ? (
              <div style={{ textAlign: 'center', padding: '60px 0', color: '#8C7B94' }}>
                <div className="doera-live-pulse-dot" style={{ margin: '0 auto 12px' }} />
                <span>Loading Human Approval Queue...</span>
              </div>
            ) : approvals.length === 0 ? (
              <div className="doera-empty-approvals">
                <div className="doera-empty-icon">
                  <ShieldCheck size={28} />
                </div>
                <h3 className="doera-empty-title">
                  {activeTab === 'pending'
                    ? 'No Pending Approvals'
                    : `No ${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Actions`}
                </h3>
                <p className="doera-empty-desc">
                  {activeTab === 'pending'
                    ? 'All autonomous actions are currently up to date. When an agent stages an external dispatch or high-stakes booking, it will appear here for your review.'
                    : 'No records found matching your selected status and filter criteria.'}
                </p>
              </div>
            ) : (
              approvals.map((approval) => (
                <ApprovalCard
                  key={approval._id}
                  approval={approval}
                  onApprove={handleInitiateApprove}
                  onEdit={(appr) => setEditApproval(appr)}
                  onReject={(appr) => setRejectApproval(appr)}
                  onViewDetails={(appr) => setDetailsApproval(appr)}
                />
              ))
            )}
          </div>
        </div>
      </main>

      {/* Modals */}
      <ApprovalDetailsModal
        approval={detailsApproval}
        isOpen={Boolean(detailsApproval)}
        onClose={() => setDetailsApproval(null)}
      />

      <ApprovalEditModal
        approval={editApproval}
        isOpen={Boolean(editApproval)}
        onClose={() => setEditApproval(null)}
        onSave={handleSaveEdit}
      />

      <ApprovalConfirmModal
        approval={confirmApproval}
        isOpen={Boolean(confirmApproval)}
        onClose={() => setConfirmApproval(null)}
        onConfirm={() => executeApproveDirect(confirmApproval)}
      />

      <ApprovalRejectModal
        approval={rejectApproval}
        isOpen={Boolean(rejectApproval)}
        onClose={() => setRejectApproval(null)}
        onReject={handleConfirmReject}
      />
    </div>
  );
};

export default ApprovalCenterPage;
