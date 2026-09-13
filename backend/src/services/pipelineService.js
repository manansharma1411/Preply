const path = require('path');
const ApiError = require('../utils/ApiError');
const { safeUnlink } = require('../utils/fileUtils');
const ExtractorFactory = require('../extractors/ExtractorFactory');
const { chunkDocumentText } = require('../utils/textChunker');
const geminiService = require('./geminiService');
const StudyMaterial = require('../models/StudyMaterial');
const StudySession = require('../models/StudySession');
const Quiz = require('../models/Quiz');

/**
 * Executes the complete document processing pipeline with personalization.
 * Upload ➔ Validate ➔ Store Temp ➔ Extract ➔ Save StudyMaterial ➔ Personalize AI Session & Quiz ➔ Save DB ➔ Cleanup
 */
const processDocumentPipeline = async (userId, file, customTitle = '', rawPreferences = {}) => {
  if (!file || !file.path) {
    throw ApiError.badRequest('No file uploaded or file payload missing.');
  }

  const tempFilePath = file.path;

  try {
    const ext = path.extname(file.originalname).toLowerCase().replace('.', '') || 'pdf';
    const title = customTitle.trim() || path.basename(file.originalname, path.extname(file.originalname));

    // Normalize student preferences with sensible defaults
    const preferences = {
      subject: (rawPreferences.subject && rawPreferences.subject.trim()) || 'General',
      studyGoal: ['Quick Revision', 'Internal Exam', 'Semester Exam', 'Deep Understanding'].includes(rawPreferences.studyGoal)
        ? rawPreferences.studyGoal
        : 'Semester Exam',
      studyTime: ['15 minutes', '30 minutes', '1 hour', '2+ hours'].includes(rawPreferences.studyTime)
        ? rawPreferences.studyTime
        : '30 minutes',
      targetDifficulty: ['Beginner', 'Intermediate', 'Advanced'].includes(rawPreferences.targetDifficulty)
        ? rawPreferences.targetDifficulty
        : 'Intermediate',
    };

    // Step 1: Select Extractor & Parse Text & Per-page structure
    const extractor = ExtractorFactory.getExtractor(ext);
    const { extractedText, pages = [], metadata } = await extractor.extract(tempFilePath);

    // Step 2: Create StudyMaterial Record (processing state)
    const material = await StudyMaterial.create({
      userId,
      title,
      originalFileName: file.originalname,
      fileType: ext,
      fileSize: file.size,
      storageRef: `/uploads/materials/${file.filename || path.basename(tempFilePath)}`,
      processingStatus: 'processing',
      extractedText,
      pages,
      subject: preferences.subject,
      preferences,
      metadata,
    });

    // Step 3: Chunk text if necessary
    const textChunks = chunkDocumentText(extractedText);
    const mainAnalysisText = textChunks[0];

    const synthesisOptions = {
      documentName: file.originalname,
      pageCount: metadata.pageCount || 1,
      preferences,
    };

    // Step 4: AI Synthesis - Generate Grounded & Personalized Study Session
    const aiSessionData = await geminiService.generateStudySession(mainAnalysisText, title, synthesisOptions);

    const studySession = await StudySession.create({
      userId,
      materialId: material._id,
      title: aiSessionData.title || title,
      summary: aiSessionData.overview || 'Extracted summary overview.',
      keyTopics: aiSessionData.keyTopics || [],
      importantConcepts: aiSessionData.importantConcepts || [],
      definitions: aiSessionData.definitions || [],
      examTips: aiSessionData.examTips || [],
      recommendedRevisionAreas: aiSessionData.revisionPriority || [],
      preferences,
    });

    // Step 5: AI Synthesis - Generate Grounded & Personalized Quiz
    const keyTopicNames = (aiSessionData.keyTopics || []).map((t) => t.topic);
    const aiQuizData = await geminiService.generateQuiz(mainAnalysisText, keyTopicNames, synthesisOptions);

    const formattedQuestions = (aiQuizData.questions || []).map((q, idx) => ({
      questionId: `q${idx + 1}`,
      text: q.question,
      options: q.options,
      correctOptionIndex: q.correctAnswer,
      explanation: q.explanation,
      topicTag: q.topic || 'General',
      difficulty: q.difficulty || (preferences.targetDifficulty === 'Beginner' ? 'Easy' : preferences.targetDifficulty === 'Advanced' ? 'Hard' : 'Medium'),
      source: q.source || null,
    }));

    const quizDifficultyEnum = preferences.targetDifficulty === 'Beginner' ? 'easy' : preferences.targetDifficulty === 'Advanced' ? 'hard' : 'medium';

    const quiz = await Quiz.create({
      userId,
      materialId: material._id,
      studySessionId: studySession._id,
      title: aiQuizData.title || `Quiz: ${title}`,
      difficulty: quizDifficultyEnum,
      questions: formattedQuestions,
    });

    // Step 6: Update StudyMaterial status to completed
    material.processingStatus = 'completed';
    await material.save();

    return {
      material: material.toJSON(),
      studySession: studySession.toJSON(),
      quiz: quiz.toJSON(),
    };
  } catch (error) {
    console.error(`[Pipeline Error] Document processing failed: ${error.message}`);
    throw error;
  } finally {
    // Step 7: Guarantee temp file cleanup
    await safeUnlink(tempFilePath);
  }
};

module.exports = {
  processDocumentPipeline,
};
