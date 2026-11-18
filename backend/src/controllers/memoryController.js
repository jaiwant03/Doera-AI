import Memory from '../models/Memory.js';

export const getMemories = async (req, res, next) => {
  try {
    const memories = await Memory.find({ userId: req.user._id }).sort({ createdAt: -1 });
    res.json({ memories });
  } catch (err) {
    next(err);
  }
};

export const createMemory = async (req, res, next) => {
  try {
    const { key, content, category } = req.body;
    if (!key || !content) {
      return res.status(400).json({ error: 'Key and content are required' });
    }

    const memory = await Memory.create({
      userId: req.user._id,
      key,
      content,
      category: category || 'general',
    });

    res.status(201).json({ memory });
  } catch (err) {
    next(err);
  }
};

export const updateMemory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { key, content, category, isActive } = req.body;

    const memory = await Memory.findOneAndUpdate(
      { _id: id, userId: req.user._id },
      { $set: { key, content, category, isActive } },
      { new: true }
    );

    if (!memory) return res.status(404).json({ error: 'Memory not found' });
    res.json({ memory });
  } catch (err) {
    next(err);
  }
};

export const deleteMemory = async (req, res, next) => {
  try {
    const { id } = req.params;
    await Memory.findOneAndDelete({ _id: id, userId: req.user._id });
    res.json({ message: 'Memory deleted' });
  } catch (err) {
    next(err);
  }
};

export const clearAllMemories = async (req, res, next) => {
  try {
    await Memory.deleteMany({ userId: req.user._id });
    res.json({ message: 'All memories cleared' });
  } catch (err) {
    next(err);
  }
};
