const ApiError = require('../utils/ApiError');
const StudyMaterial = require('../models/StudyMaterial');

const createMaterial = async (userId, materialData) => {
  const material = await StudyMaterial.create({
    userId,
    ...materialData,
    processingStatus: 'completed',
  });
  return material.toJSON();
};

const escapeRegex = (string = '') => {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

const getUserMaterials = async (userId, { page = 1, limit = 10, search, subject } = {}) => {
  const query = { userId };

  if (search) {
    query.title = { $regex: escapeRegex(search), $options: 'i' };
  }

  if (subject) {
    query.subject = subject;
  }

  const skip = (page - 1) * limit;

  const [materials, total] = await Promise.all([
    StudyMaterial.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    StudyMaterial.countDocuments(query),
  ]);

  return {
    materials: materials.map((m) => m.toJSON()),
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
};

const getMaterialById = async (userId, materialId) => {
  const material = await StudyMaterial.findOne({ _id: materialId, userId });
  if (!material) {
    throw ApiError.notFound('Study material not found or unauthorized');
  }
  return material.toJSON();
};

const deleteMaterial = async (userId, materialId) => {
  const material = await StudyMaterial.findOneAndDelete({ _id: materialId, userId });
  if (!material) {
    throw ApiError.notFound('Study material not found or unauthorized');
  }
  return { id: materialId };
};

module.exports = {
  createMaterial,
  getUserMaterials,
  getMaterialById,
  deleteMaterial,
};
