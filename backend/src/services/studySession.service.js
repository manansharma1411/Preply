const ApiError = require('../utils/ApiError');
const StudySession = require('../models/StudySession');
const StudyMaterial = require('../models/StudyMaterial');

const createStudySession = async (userId, sessionData) => {
  const material = await StudyMaterial.findOne({ _id: sessionData.materialId, userId });
  if (!material) {
    throw ApiError.notFound('Referenced StudyMaterial not found or unauthorized');
  }

  const session = await StudySession.create({
    userId,
    ...sessionData,
  });

  return session.toJSON();
};

const getUserStudySessions = async (userId, { page = 1, limit = 10 } = {}) => {
  const skip = (page - 1) * limit;

  const [sessions, total] = await Promise.all([
    StudySession.find({ userId })
      .populate('materialId', 'title originalFileName fileType')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    StudySession.countDocuments({ userId }),
  ]);

  return {
    sessions: sessions.map((s) => s.toJSON()),
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
};

const getStudySessionById = async (userId, sessionId) => {
  const session = await StudySession.findOne({ _id: sessionId, userId })
    .populate('materialId', 'title originalFileName fileSize extractedText');
    
  if (!session) {
    throw ApiError.notFound('Study session not found or unauthorized');
  }
  return session.toJSON();
};

const explainConcept = async (userId, sessionId, { concept, explanationMode, existingExplanation }) => {
  const session = await StudySession.findOne({ _id: sessionId, userId })
    .populate('materialId', 'title extractedText');

  if (!session) {
    throw ApiError.notFound('Study session not found or unauthorized');
  }

  // Validate that concept exists in session (keyTopics, importantConcepts, definitions, conceptMap)
  const conceptTrimmed = concept.trim().toLowerCase();

  const matchTopic = (session.keyTopics || []).some((t) => t.topic.toLowerCase().trim() === conceptTrimmed);
  const matchConcept = (session.importantConcepts || []).some((c) => c.concept.toLowerCase().trim() === conceptTrimmed);
  const matchDefinition = (session.definitions || []).some((d) => d.term.toLowerCase().trim() === conceptTrimmed);
  const matchMapNode = (session.conceptMap?.nodes || []).some((n) => n.label.toLowerCase().trim() === conceptTrimmed);

  if (!matchTopic && !matchConcept && !matchDefinition && !matchMapNode) {
    throw ApiError.badRequest(`Selected concept '${concept}' does not exist in this study session.`);
  }

  const geminiService = require('./geminiService');
  const materialText = session.materialId?.extractedText || session.summary || 'Study material text';

  const aiResult = await geminiService.explainConcept(
    materialText,
    concept,
    existingExplanation,
    explanationMode
  );

  return {
    sessionId,
    concept,
    explanationMode,
    alternativeExplanation: aiResult.alternativeExplanation || aiResult.explanation || 'No explanation generated.',
  };
};

module.exports = {
  createStudySession,
  getUserStudySessions,
  getStudySessionById,
  explainConcept,
};
