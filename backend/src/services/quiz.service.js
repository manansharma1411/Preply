const mongoose = require('mongoose');
const ApiError = require('../utils/ApiError');
const Quiz = require('../models/Quiz');
const QuizAttempt = require('../models/QuizAttempt');
const {
  analyzePerformance,
  computeNextAdaptiveState,
  generateRevisionRecommendations,
} = require('../utils/adaptiveEngine');

const getQuizById = async (userId, quizId) => {
  let quiz = null;

  if (quizId && quizId !== 'latest') {
    if (!mongoose.Types.ObjectId.isValid(quizId)) {
      throw ApiError.badRequest('Invalid quiz ID format');
    }
    quiz = await Quiz.findOne({
      $or: [{ _id: quizId }, { studySessionId: quizId }, { materialId: quizId }],
      userId,
    })
      .populate('materialId', 'title originalFileName')
      .populate('studySessionId', 'title summary');
  } else {
    quiz = await Quiz.findOne({ userId })
      .sort({ createdAt: -1 })
      .populate('materialId', 'title originalFileName')
      .populate('studySessionId', 'title summary');
  }

  if (!quiz) {
    throw ApiError.notFound('Quiz not found or unauthorized');
  }

  return quiz.toJSON();
};

const getNextAdaptiveQuestion = async (userId, quizId, currentAnswers = []) => {
  let quiz = null;

  if (quizId && quizId !== 'latest') {
    if (!mongoose.Types.ObjectId.isValid(quizId)) {
      throw ApiError.badRequest('Invalid quiz ID format');
    }
    quiz = await Quiz.findOne({
      $or: [{ _id: quizId }, { studySessionId: quizId }, { materialId: quizId }],
      userId,
    });
  } else {
    quiz = await Quiz.findOne({ userId }).sort({ createdAt: -1 });
  }

  if (!quiz) {
    throw ApiError.notFound('Quiz not found or unauthorized');
  }

  return computeNextAdaptiveState(quiz.questions, currentAnswers);
};

const submitQuizAttempt = async (userId, quizId, { answers, timeTakenSeconds: _timeTakenSeconds = 0 }) => {
  let quiz = null;

  if (quizId && quizId !== 'latest') {
    if (!mongoose.Types.ObjectId.isValid(quizId)) {
      throw ApiError.badRequest('Invalid quiz ID format');
    }
    quiz = await Quiz.findOne({
      $or: [{ _id: quizId }, { studySessionId: quizId }, { materialId: quizId }],
      userId,
    });
  } else {
    quiz = await Quiz.findOne({ userId }).sort({ createdAt: -1 });
  }

  if (!quiz) {
    throw ApiError.notFound('Quiz not found or unauthorized');
  }

  const {
    evaluatedAnswers,
    topicWisePerformance,
    difficultyWisePerformance,
    weakTopics,
    strongTopics,
  } = analyzePerformance(quiz.questions, answers);

  const correctCount = evaluatedAnswers.filter((a) => a.isCorrect).length;
  const totalQuestions = quiz.questions.length;
  const scorePercentage = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;

  const recommendedRevisionAreas = generateRevisionRecommendations(
    weakTopics,
    topicWisePerformance,
    difficultyWisePerformance
  );

  const processedAnswers = evaluatedAnswers.map((a) => ({
    questionId: a.questionId,
    selectedOptionIndex: a.selectedOptionIndex,
    isCorrect: a.isCorrect,
    timeSpentSeconds: a.timeSpentSeconds || 0,
  }));

  const attempt = await QuizAttempt.create({
    userId,
    quizId: quiz._id,
    materialId: quiz.materialId,
    answers: processedAnswers,
    score: correctCount,
    percentage: scorePercentage,
    topicWisePerformance,
    difficultyWisePerformance,
    weakTopics,
    strongTopics,
    recommendedRevisionAreas,
    completedAt: new Date(),
  });

  return attempt.toJSON();
};

const getQuizAttempts = async (userId, quizId) => {
  let query = { userId };

  if (quizId && mongoose.Types.ObjectId.isValid(quizId)) {
    query.$or = [{ quizId }, { materialId: quizId }];
  }

  const attempts = await QuizAttempt.find(query).sort({ completedAt: -1 });

  return attempts.map((a) => a.toJSON());
};

const getAttemptById = async (userId, attemptId) => {
  let attempt = null;

  if (attemptId && mongoose.Types.ObjectId.isValid(attemptId)) {
    attempt = await QuizAttempt.findOne({ _id: attemptId, userId })
      .populate('quizId', 'title questions difficulty')
      .populate('materialId', 'title');
  }

  if (!attempt) {
    attempt = await QuizAttempt.findOne({ userId })
      .sort({ completedAt: -1 })
      .populate('quizId', 'title questions difficulty')
      .populate('materialId', 'title');
  }

  if (!attempt) {
    throw ApiError.notFound('Quiz attempt not found');
  }

  return attempt.toJSON();
};

module.exports = {
  getQuizById,
  getNextAdaptiveQuestion,
  submitQuizAttempt,
  getQuizAttempts,
  getAttemptById,
};
