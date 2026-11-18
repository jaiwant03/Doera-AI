import api from './api';

export const evidenceService = {
  // Get all verifiable evidence for a task
  async getEvidenceByTask(taskId) {
    const res = await api.get(`/evidence/task/${taskId}`);
    return res.data;
  },

  // Get single evidence details
  async getEvidenceById(id) {
    const res = await api.get(`/evidence/${id}`);
    return res.data;
  },
};

export default evidenceService;
