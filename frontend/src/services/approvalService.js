import api from './api';

export const approvalService = {
  /**
   * Fetch approvals with status, risk, and pagination filters
   */
  async getApprovals(params = {}) {
    const res = await api.get('/approvals', { params });
    return res.data;
  },

  /**
   * Fast counts for pending, approved, rejected, executed, etc.
   */
  async getApprovalCounts() {
    const res = await api.get('/approvals/counts');
    return res.data.counts;
  },

  /**
   * Fetch single approval details
   */
  async getApproval(id) {
    const res = await api.get(`/approvals/${id}`);
    return res.data.approval;
  },

  /**
   * Fetch approvals tied to a specific task
   */
  async getTaskApprovals(taskId) {
    const res = await api.get(`/approvals/task/${taskId}`);
    return res.data.approvals;
  },

  /**
   * Edit pending approval request (increments version)
   */
  async editApproval(id, data) {
    const res = await api.put(`/approvals/${id}`, data);
    return res.data.approval;
  },

  /**
   * Authorize and execute approval request
   */
  async approveAction(id, { comments, actionVersion, idempotencyKey } = {}) {
    const res = await api.post(`/approvals/${id}/approve`, {
      comments,
      actionVersion,
      idempotencyKey,
    });
    return res.data;
  },

  /**
   * Reject approval request with revision instructions / reason
   */
  async rejectAction(id, { reason } = {}) {
    const res = await api.post(`/approvals/${id}/reject`, { reason });
    return res.data.approval;
  },

  /**
   * Explicitly execute an approved action
   */
  async executeAction(id) {
    const res = await api.post(`/approvals/${id}/execute`);
    return res.data.result;
  },
};

export default approvalService;
