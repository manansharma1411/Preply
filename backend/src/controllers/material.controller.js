const { sendSuccess } = require('../utils/response');
const materialService = require('../services/material.service');
const pipelineService = require('../services/pipelineService');

const uploadAndProcess = async (req, res, next) => {
  try {
    let preferences = {
      subject: req.body.subject,
      studyGoal: req.body.studyGoal,
      studyTime: req.body.studyTime,
      targetDifficulty: req.body.targetDifficulty,
    };

    if (req.body.preferences) {
      try {
        const parsed = typeof req.body.preferences === 'string' ? JSON.parse(req.body.preferences) : req.body.preferences;
        preferences = { ...preferences, ...parsed };
      } catch {
        // Fallback to top-level req.body fields
      }
    }

    const result = await pipelineService.processDocumentPipeline(
      req.user.id,
      req.file,
      req.body.title || '',
      preferences
    );
    sendSuccess(res, 201, result, 'Document uploaded, extracted, and study session generated successfully');
  } catch (error) {
    next(error);
  }
};

const create = async (req, res, next) => {
  try {
    const material = await materialService.createMaterial(req.user.id, req.body);
    sendSuccess(res, 201, { material }, 'Study material created successfully');
  } catch (error) {
    next(error);
  }
};

const getAll = async (req, res, next) => {
  try {
    const result = await materialService.getUserMaterials(req.user.id, req.query);
    sendSuccess(res, 200, result, 'Study materials retrieved successfully');
  } catch (error) {
    next(error);
  }
};

const getById = async (req, res, next) => {
  try {
    const material = await materialService.getMaterialById(req.user.id, req.params.id);
    sendSuccess(res, 200, { material }, 'Study material retrieved successfully');
  } catch (error) {
    next(error);
  }
};

const deleteById = async (req, res, next) => {
  try {
    const result = await materialService.deleteMaterial(req.user.id, req.params.id);
    sendSuccess(res, 200, result, 'Study material deleted successfully');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  uploadAndProcess,
  create,
  getAll,
  getById,
  deleteById,
};
