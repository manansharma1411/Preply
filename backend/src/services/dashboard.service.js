const StudyMaterial = require('../models/StudyMaterial');
const StudySession = require('../models/StudySession');
const Quiz = require('../models/Quiz');
const QuizAttempt = require('../models/QuizAttempt');

/**
 * Calculates student analytics and dashboard metrics strictly from database records.
 * Ensures data isolation per authenticated user.
 */
const getStudentDashboard = async (userId) => {
  const [
    materialsCount,
    sessionsCount,
    quizzesCount,
    allAttempts,
    recentMaterials,
    recentAttemptsList,
  ] = await Promise.all([
    StudyMaterial.countDocuments({ userId }),
    StudySession.countDocuments({ userId }),
    Quiz.countDocuments({ userId }),
    QuizAttempt.find({ userId })
      .populate('materialId', 'title')
      .populate('quizId', 'title difficulty')
      .sort({ completedAt: -1 }),
    StudyMaterial.find({ userId }).sort({ createdAt: -1 }).limit(5),
    QuizAttempt.find({ userId })
      .populate('quizId', 'title difficulty')
      .populate('materialId', 'title')
      .sort({ completedAt: -1 })
      .limit(5),
  ]);

  const attemptsCount = allAttempts.length;
  const totalQuestionsAnswered = allAttempts.reduce(
    (sum, a) => sum + (a.answers ? a.answers.length : 0),
    0
  );
  const averageScorePercentage =
    attemptsCount > 0
      ? Math.round(allAttempts.reduce((acc, a) => acc + (a.percentage || 0), 0) / attemptsCount)
      : 0;

  // Topic Performance Aggregation across all attempts
  const topicMap = {};
  const topicMaterialMap = {};

  allAttempts.forEach((attempt) => {
    const rawMat = attempt.materialId;
    let matId = null;
    let matTitle = null;

    if (rawMat) {
      if (typeof rawMat === 'object') {
        matId = rawMat._id ? rawMat._id.toString() : rawMat.id;
        matTitle = rawMat.title || null;
      } else {
        matId = rawMat.toString();
      }
    }

    if (Array.isArray(attempt.topicWisePerformance)) {
      attempt.topicWisePerformance.forEach((tp) => {
        if (!tp.topicTag) return;
        if (!topicMap[tp.topicTag]) {
          topicMap[tp.topicTag] = { totalQuestions: 0, correctAnswers: 0 };
        }
        topicMap[tp.topicTag].totalQuestions += tp.totalQuestions || 0;
        topicMap[tp.topicTag].correctAnswers += tp.correctAnswers || 0;

        if (matId && !topicMaterialMap[tp.topicTag]) {
          topicMaterialMap[tp.topicTag] = { materialId: matId, materialTitle: matTitle || 'Study Material' };
        }
      });
    }

    if (Array.isArray(attempt.weakTopics)) {
      attempt.weakTopics.forEach((wt) => {
        if (matId && !topicMaterialMap[wt]) {
          topicMaterialMap[wt] = { materialId: matId, materialTitle: matTitle || 'Study Material' };
        }
      });
    }
  });

  const topicWisePerformance = Object.keys(topicMap).map((topicTag) => {
    const { totalQuestions, correctAnswers } = topicMap[topicTag];
    const accuracyPercentage =
      totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0;
    return {
      topicTag,
      totalQuestions,
      correctAnswers,
      accuracyPercentage,
    };
  });

  // Sort topics by accuracy descending
  topicWisePerformance.sort((a, b) => b.accuracyPercentage - a.accuracyPercentage);

  const bestPerformingTopics = topicWisePerformance.filter(
    (t) => t.accuracyPercentage >= 70
  );

  // Collect weak topics: either aggregated accuracy < 60 or explicitly in attempt.weakTopics
  const weakTopicSet = new Set();
  topicWisePerformance.forEach((t) => {
    if (t.accuracyPercentage < 60) {
      weakTopicSet.add(t.topicTag);
    }
  });

  allAttempts.forEach((a) => {
    if (Array.isArray(a.weakTopics)) {
      a.weakTopics.forEach((wt) => weakTopicSet.add(wt));
    }
  });

  const weakestTopics = Array.from(weakTopicSet).map((topicTag) => {
    const perf = topicWisePerformance.find((t) => t.topicTag === topicTag);
    const matInfo = topicMaterialMap[topicTag] || null;
    return {
      topicTag,
      accuracyPercentage: perf ? perf.accuracyPercentage : 0,
      materialId: matInfo ? matInfo.materialId : null,
      materialTitle: matInfo ? matInfo.materialTitle : null,
    };
  });

  // Build recommended revision list with explicit action
  const recommendedRevision = weakestTopics.map((item) => ({
    topic: item.topicTag,
    materialId: item.materialId,
    materialTitle: item.materialTitle,
    accuracyPercentage: item.accuracyPercentage,
    action: 'Review Topic',
  }));

  return {
    metrics: {
      materialsCount,
      sessionsCount,
      quizzesCount,
      attemptsCount,
      totalQuestionsAnswered,
      averageScorePercentage,
    },
    topicWisePerformance,
    bestPerformingTopics,
    weakestTopics,
    weakTopics: Array.from(weakTopicSet),
    recommendedRevision,
    recentMaterials: recentMaterials.map((m) => m.toJSON()),
    recentAttempts: recentAttemptsList.map((a) => a.toJSON()),
  };
};

module.exports = {
  getStudentDashboard,
};
