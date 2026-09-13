/**
 * ============================================================================
 * PREPLY ADAPTIVE ASSESSMENT ENGINE
 * ============================================================================
 * Deterministic strategy for adaptive quiz difficulty progression, weak topic
 * prioritization, strong topic deprioritization, and duplicate question prevention.
 * ============================================================================
 */

const DIFFICULTY_LEVELS = ['Easy', 'Medium', 'Hard'];

/**
 * Step difficulty up or down based on correctness.
 * Easy -> Medium -> Hard
 */
const getNextDifficulty = (currentDifficulty, isCorrect) => {
  const normalized = currentDifficulty ? currentDifficulty.charAt(0).toUpperCase() + currentDifficulty.slice(1).toLowerCase() : 'Medium';
  const index = DIFFICULTY_LEVELS.indexOf(normalized);
  const currentIndex = index !== -1 ? index : 1; // Default to Medium (index 1)

  if (isCorrect) {
    return DIFFICULTY_LEVELS[Math.min(currentIndex + 1, DIFFICULTY_LEVELS.length - 1)];
  } else {
    return DIFFICULTY_LEVELS[Math.max(currentIndex - 1, 0)];
  }
};

/**
 * Evaluates current answers against quiz questions and computes performance metrics per topic & difficulty.
 */
const analyzePerformance = (questions, currentAnswers = []) => {
  const questionMap = new Map(questions.map((q) => [q.questionId, q]));
  const topicStats = new Map();
  const difficultyStats = new Map(DIFFICULTY_LEVELS.map((d) => [d, { total: 0, correct: 0 }]));

  const evaluatedAnswers = [];

  for (const ans of currentAnswers) {
    const q = questionMap.get(ans.questionId);
    if (!q) continue;

    const isCorrect = ans.isCorrect !== undefined ? ans.isCorrect : (q.correctOptionIndex === ans.selectedOptionIndex);
    const difficulty = q.difficulty ? (q.difficulty.charAt(0).toUpperCase() + q.difficulty.slice(1).toLowerCase()) : 'Medium';

    evaluatedAnswers.push({
      ...ans,
      isCorrect,
      difficulty,
      topicTag: q.topicTag,
    });

    // Update topic stats
    const topic = q.topicTag;
    if (!topicStats.has(topic)) {
      topicStats.set(topic, { total: 0, correct: 0 });
    }
    const tStat = topicStats.get(topic);
    tStat.total += 1;
    if (isCorrect) tStat.correct += 1;

    // Update difficulty stats
    if (difficultyStats.has(difficulty)) {
      const dStat = difficultyStats.get(difficulty);
      dStat.total += 1;
      if (isCorrect) dStat.correct += 1;
    }
  }

  const weakTopics = [];
  const strongTopics = [];
  const topicWisePerformance = [];

  for (const [topicTag, stats] of topicStats.entries()) {
    const accuracyPercentage = Math.round((stats.correct / stats.total) * 100);
    topicWisePerformance.push({
      topicTag,
      totalQuestions: stats.total,
      correctAnswers: stats.correct,
      accuracyPercentage,
    });

    if (accuracyPercentage < 70 || stats.correct < stats.total) {
      weakTopics.push(topicTag);
    }
    if (accuracyPercentage >= 70 && stats.total >= 1) {
      strongTopics.push(topicTag);
    }
  }

  const difficultyWisePerformance = [];
  for (const [difficulty, stats] of difficultyStats.entries()) {
    const accuracyPercentage = stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0;
    difficultyWisePerformance.push({
      difficulty,
      totalQuestions: stats.total,
      correctAnswers: stats.correct,
      accuracyPercentage,
    });
  }

  return {
    evaluatedAnswers,
    topicWisePerformance,
    difficultyWisePerformance,
    weakTopics,
    strongTopics,
  };
};

/**
 * Computes the next question adaptively from available unasked questions.
 */
const computeNextAdaptiveState = (questions, currentAnswers = []) => {
  if (!questions || questions.length === 0) {
    return {
      isComplete: true,
      nextQuestion: null,
      currentDifficulty: 'Medium',
      weakTopics: [],
      strongTopics: [],
    };
  }

  const { evaluatedAnswers, weakTopics, strongTopics } = analyzePerformance(questions, currentAnswers);

  const answeredIds = new Set(evaluatedAnswers.map((a) => a.questionId));
  const unaskedQuestions = questions.filter((q) => !answeredIds.has(q.questionId));

  if (unaskedQuestions.length === 0) {
    return {
      isComplete: true,
      nextQuestion: null,
      currentDifficulty: 'Medium',
      weakTopics,
      strongTopics,
    };
  }

  // Determine target difficulty
  let targetDifficulty = 'Medium';
  if (evaluatedAnswers.length > 0) {
    const lastAns = evaluatedAnswers[evaluatedAnswers.length - 1];
    targetDifficulty = getNextDifficulty(lastAns.difficulty, lastAns.isCorrect);
  }

  const normalizeDiff = (d) => (d ? d.charAt(0).toUpperCase() + d.slice(1).toLowerCase() : 'Medium');

  // Candidate selection strategy:
  // 1. Unasked matching targetDifficulty AND topic in weakTopics
  let candidates = unaskedQuestions.filter(
    (q) => normalizeDiff(q.difficulty) === targetDifficulty && weakTopics.includes(q.topicTag)
  );

  // 2. If empty, unasked matching targetDifficulty AND topic not in strongTopics (un-attempted or weak)
  if (candidates.length === 0) {
    candidates = unaskedQuestions.filter(
      (q) => normalizeDiff(q.difficulty) === targetDifficulty && !strongTopics.includes(q.topicTag)
    );
  }

  // 3. If empty, unasked matching targetDifficulty in any topic
  if (candidates.length === 0) {
    candidates = unaskedQuestions.filter((q) => normalizeDiff(q.difficulty) === targetDifficulty);
  }

  // 4. Fallback: unasked matching weak topics in adjacent difficulty
  if (candidates.length === 0) {
    candidates = unaskedQuestions.filter((q) => weakTopics.includes(q.topicTag));
  }

  // 5. Fallback: any unasked question
  if (candidates.length === 0) {
    candidates = unaskedQuestions;
  }

  const selectedQuestion = candidates[0];

  return {
    isComplete: false,
    nextQuestion: selectedQuestion ? (selectedQuestion.toJSON ? selectedQuestion.toJSON() : selectedQuestion) : null,
    currentDifficulty: selectedQuestion ? normalizeDiff(selectedQuestion.difficulty) : targetDifficulty,
    weakTopics,
    strongTopics,
  };
};

/**
 * Generates human-readable revision recommendations based on performance.
 */
const generateRevisionRecommendations = (weakTopics, topicWisePerformance, difficultyWisePerformance) => {
  const recommendations = [];

  if (weakTopics && weakTopics.length > 0) {
    for (const topic of weakTopics) {
      const stat = topicWisePerformance.find((t) => t.topicTag === topic);
      const acc = stat ? `${stat.accuracyPercentage}%` : 'low accuracy';
      recommendations.push(`Review core definitions and key concepts in '${topic}' (${acc} accuracy).`);
    }
  }

  // Check low difficulty performance
  const hardStat = difficultyWisePerformance.find((d) => d.difficulty === 'Hard');
  if (hardStat && hardStat.totalQuestions > 0 && hardStat.accuracyPercentage < 50) {
    recommendations.push('Practice complex multi-step analysis questions to improve Hard difficulty problem solving.');
  }

  if (recommendations.length === 0) {
    recommendations.push('Maintain high comprehension through periodic review of summary cheat sheets.');
  }

  return recommendations;
};

module.exports = {
  getNextDifficulty,
  analyzePerformance,
  computeNextAdaptiveState,
  generateRevisionRecommendations,
};
