import express from 'express';
import { authenticate } from '../middleware/auth.js';
import Workflow from '../models/Workflow.js';
import WorkflowExecution from '../models/WorkflowExecution.js';
import workflowCompiler from '../services/workflowCompiler.js';

const router = express.Router();
router.use(authenticate);

// List user workflows
router.get('/', async (req, res) => {
  try {
    const workflows = await Workflow.find({ userId: req.user._id }).sort({ createdAt: -1 });
    res.json({ workflows });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to fetch workflows' });
  }
});

// Compile natural language prompt into workflow
router.post('/compile', async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt?.trim()) return res.status(400).json({ error: 'Prompt is required' });

    const compiled = await workflowCompiler.compileFromPrompt(prompt, req.user._id);
    const workflow = await Workflow.create(compiled);
    res.status(201).json({ workflow });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to compile workflow' });
  }
});

// Toggle pause/resume
router.patch('/:id/toggle', async (req, res) => {
  try {
    const wf = await Workflow.findOne({ _id: req.params.id, userId: req.user._id });
    if (!wf) return res.status(404).json({ error: 'Workflow not found' });

    wf.status = wf.status === 'active' ? 'paused' : 'active';
    await wf.save();
    res.json({ success: true, workflow: wf });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to toggle workflow' });
  }
});

// Delete workflow
router.delete('/:id', async (req, res) => {
  try {
    await Workflow.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    await WorkflowExecution.deleteMany({ workflowId: req.params.id });
    res.json({ success: true, message: 'Workflow deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to delete workflow' });
  }
});

export default router;
