const { sendSuccess } = require('../utils/response');
const quizService = require('../services/quiz.service');

const getById = async (req, res, next) => {
  try {
    const quiz = await quizService.getQuizById(req.user.id, req.params.id);
    sendSuccess(res, 200, { quiz }, 'Quiz retrieved successfully');
  } catch (error) {
    next(error);
  }
};

const getNextQuestion = async (req, res, next) => {
  try {
    const { currentAnswers = [] } = req.body;
    const adaptiveState = await quizService.getNextAdaptiveQuestion(req.user.id, req.params.id, currentAnswers);
    sendSuccess(res, 200, adaptiveState, 'Next adaptive question calculated successfully');
  } catch (error) {
    next(error);
  }
};

const createAttempt = async (req, res, next) => {
  try {
    const attempt = await quizService.submitQuizAttempt(req.user.id, req.params.id, req.body);
    sendSuccess(res, 201, { attempt }, 'Quiz attempt evaluated successfully');
  } catch (error) {
    next(error);
  }
};

const getAttempts = async (req, res, next) => {
  try {
    const attempts = await quizService.getQuizAttempts(req.user.id, req.params.id);
    sendSuccess(res, 200, { attempts }, 'Quiz attempt history retrieved successfully');
  } catch (error) {
    next(error);
  }
};

const getAttemptById = async (req, res, next) => {
  try {
    const attempt = await quizService.getAttemptById(req.user.id, req.params.attemptId || req.params.id);
    sendSuccess(res, 200, { attempt }, 'Quiz attempt retrieved successfully');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getById,
  getNextQuestion,
  createAttempt,
  getAttempts,
  getAttemptById,
};
