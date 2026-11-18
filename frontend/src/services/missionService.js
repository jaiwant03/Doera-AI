import api from './api';

export const missionService = {
  // Get paginated list of missions with filters
  async getMissions({ status = 'ALL', search = '', page = 1, limit = 20 } = {}) {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    if (search) params.append('search', search);
    if (page) params.append('page', String(page));
    if (limit) params.append('limit', String(limit));

    const res = await api.get(`/missions?${params.toString()}`);
    return res.data;
  },

  // Get full mission dossier
  async getMissionById(id) {
    const res = await api.get(`/missions/${id}`);
    return res.data;
  },

  // Pause a mission
  async pauseMission(id) {
    const res = await api.post(`/missions/${id}/pause`);
    return res.data;
  },

  // Resume a paused mission
  async resumeMission(id) {
    const res = await api.post(`/missions/${id}/resume`);
    return res.data;
  },

  // Cancel a mission
  async cancelMission(id) {
    const res = await api.post(`/missions/${id}/cancel`);
    return res.data;
  },
};

export default missionService;
