import Project from '../models/Project.js';
import Conversation from '../models/Conversation.js';
import FileMetadata from '../models/FileMetadata.js';

export const getProjects = async (req, res) => {
  try {
    const projects = await Project.find({ userId: req.user._id, isArchived: false }).sort({ createdAt: -1 });
    res.json({ projects });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to fetch projects' });
  }
};

export const getProject = async (req, res) => {
  try {
    const project = await Project.findOne({ _id: req.params.id, userId: req.user._id });
    if (!project) return res.status(404).json({ error: 'Project not found' });

    const conversations = await Conversation.find({ projectId: project._id }).sort({ updatedAt: -1 });
    const files = await FileMetadata.find({ projectId: project._id }).sort({ createdAt: -1 });

    res.json({ project, conversations, files });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to fetch project' });
  }
};

export const createProject = async (req, res) => {
  try {
    const { name, description, instructions, color } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'Project name is required' });

    const project = await Project.create({
      userId: req.user._id,
      name: name.trim(),
      description: description?.trim() || '',
      instructions: instructions?.trim() || '',
      color: color || '#087F8C',
    });

    res.status(201).json({ project });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to create project' });
  }
};

export const updateProject = async (req, res) => {
  try {
    const { name, description, instructions, color, isArchived } = req.body;
    const project = await Project.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      {
        ...(name && { name: name.trim() }),
        ...(description !== undefined && { description }),
        ...(instructions !== undefined && { instructions }),
        ...(color && { color }),
        ...(isArchived !== undefined && { isArchived }),
      },
      { new: true }
    );

    if (!project) return res.status(404).json({ error: 'Project not found' });
    res.json({ project });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to update project' });
  }
};

export const deleteProject = async (req, res) => {
  try {
    const project = await Project.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    if (!project) return res.status(404).json({ error: 'Project not found' });

    // Detach associated conversations and files
    await Conversation.updateMany({ projectId: project._id }, { $set: { projectId: null } });
    await FileMetadata.updateMany({ projectId: project._id }, { $set: { projectId: null } });

    res.json({ success: true, message: 'Project removed successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to delete project' });
  }
};
