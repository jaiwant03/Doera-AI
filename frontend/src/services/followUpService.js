import api from './api';

export const followUpService = {
  // Get all follow-ups
  async getFollowUps({ status = 'ALL' } = {}) {
    const params = status && status !== 'ALL' ? `?status=${status}` : '';
    const res = await api.get(`/followups${params}`);
    return res.data;
  },

  // Get follow-ups for a specific task
  async getFollowUpByTask(taskId) {
    const res = await api.get(`/followups/task/${taskId}`);
    return res.data;
  },

  // Trigger immediate check
  async checkNow(id) {
    const res = await api.post(`/followups/${id}/check-now`);
    return res.data;
  },

  // Simulate provider reply (demo mode helper)
  async simulateReply(id, params = {}) {
    const res = await api.post(`/followups/${id}/simulate-reply`, params);
    return res.data;
  },

  // Stop tracking
  async stopFollowUp(id) {
    const res = await api.post(`/followups/${id}/stop`);
    return res.data;
  },
};

export default followUpService;
