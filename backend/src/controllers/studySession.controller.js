const { sendSuccess } = require('../utils/response');
const studySessionService = require('../services/studySession.service');

const create = async (req, res, next) => {
  try {
    const session = await studySessionService.createStudySession(req.user.id, req.body);
    sendSuccess(res, 201, { session }, 'Study session created successfully');
  } catch (error) {
    next(error);
  }
};

const getAll = async (req, res, next) => {
  try {
    const result = await studySessionService.getUserStudySessions(req.user.id, req.query);
    sendSuccess(res, 200, result, 'Study sessions retrieved successfully');
  } catch (error) {
    next(error);
  }
};

const getById = async (req, res, next) => {
  try {
    const session = await studySessionService.getStudySessionById(req.user.id, req.params.id);
    sendSuccess(res, 200, { session }, 'Study session retrieved successfully');
  } catch (error) {
    next(error);
  }
};

const explainConcept = async (req, res, next) => {
  try {
    const result = await studySessionService.explainConcept(
      req.user.id,
      req.params.id,
      req.body
    );
    sendSuccess(res, 200, result, 'Alternative explanation generated successfully');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  create,
  getAll,
  getById,
  explainConcept,
};
