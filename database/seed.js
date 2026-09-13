/**
 * ============================================================================
 * PREPLY DEVELOPMENT SEED SCRIPT
 * ============================================================================
 * IMPORTANT WARNING:
 * This script is intended strictly for local development and testing.
 * It contains mock demonstration data and MUST NEVER be executed in production.
 * ============================================================================
 */

const path = require('path');
const config = require('../backend/src/config/env');

const { connectDB, disconnectDB } = require('./connection');
const User = require('../backend/src/models/User');
const StudyMaterial = require('../backend/src/models/StudyMaterial');
const StudySession = require('../backend/src/models/StudySession');
const Quiz = require('../backend/src/models/Quiz');
const QuizAttempt = require('../backend/src/models/QuizAttempt');

const seedDevelopmentDatabase = async () => {
  console.log('----------------------------------------------------');
  console.log('[DEV SEED] Starting local development database seed...');
  console.log('----------------------------------------------------');

  const conn = await connectDB();
  if (!conn) {
    console.error('[DEV SEED ERROR] MongoDB connection failed. Aborting seed.');
    process.exit(1);
  }

  try {
    // Clear existing development collections
    await User.deleteMany({ email: 'demo.student@university.edu' });
    console.log('[DEV SEED] Cleared existing demo data.');

    // 1. Create Demo User
    const demoUser = await User.create({
      name: 'Demo Student',
      email: 'demo.student@university.edu',
      passwordHash: '$2b$10$demoHashedPasswordForDevOnlyDoNotUseInProd',
      role: 'student',
      preferences: {
        targetExamDate: new Date('2026-10-15'),
        studyPace: 'balanced',
        preferredDifficulty: 'medium',
      },
    });
    console.log(`[DEV SEED] Created Demo User: ${demoUser.email} (ID: ${demoUser.id})`);

    // 2. Create Demo StudyMaterial
    const demoMaterial = await StudyMaterial.create({
      userId: demoUser._id,
      title: 'Operating Systems - Process Synchronization & Mutexes',
      originalFileName: 'os_chapter4_notes.pdf',
      fileType: 'pdf',
      fileSize: 2457600,
      storageRef: '/uploads/demo/os_chapter4_notes.pdf',
      processingStatus: 'completed',
      extractedText: 'Process synchronization is a mechanism to coordinate execution of concurrent processes sharing data. Mutex locks and semaphores provide mutual exclusion to prevent race conditions in critical sections. Deadlocks occur when 4 necessary conditions are met: Mutual Exclusion, Hold & Wait, No Preemption, Circular Wait.',
      subject: 'Computer Science',
      metadata: {
        pageCount: 12,
        wordCount: 3400,
        characterCount: 18500,
        mimeType: 'application/pdf',
        checksum: 'sha256_demo_hash_12345',
      },
    });
    console.log(`[DEV SEED] Created Demo Study Material: ${demoMaterial.title}`);

    // 3. Create Demo StudySession
    const demoSession = await StudySession.create({
      userId: demoUser._id,
      materialId: demoMaterial._id,
      title: 'Study Kit: Operating Systems Synchronization',
      summary: 'Process synchronization ensures concurrent processes execute safely without race conditions. Critical section protection requires Mutual Exclusion, Progress, and Bounded Waiting.',
      keyTopics: [
        { topic: 'Process Synchronization', description: 'Coordination of concurrent execution', importance: 'High' },
        { topic: 'Mutex Locks', description: 'Mutual exclusion lock primitives', importance: 'High' },
        { topic: 'Deadlock Handling', description: 'Prevention and avoidance of system deadlocks', importance: 'Medium' },
      ],
      importantConcepts: [
        { concept: 'Critical Section', explanation: 'Code segment accessing shared variables', examples: ['Updating shared bank balance'] },
        { concept: 'Semaphores', explanation: 'Integer variable accessed via wait() and signal()', examples: ['Counting semaphore for resource pools'] },
      ],
      definitions: [
        { term: 'Race Condition', definition: 'Outcome dependent on exact order of execution' },
        { term: 'Mutex', definition: 'Mutual exclusion object for single-thread locking' },
      ],
      examTips: [
        'Remember that breaking any 1 of the 4 deadlock conditions prevents deadlock entirely.',
        'Spinlocks are suitable for short wait times on multi-processor systems.',
      ],
      recommendedRevisionAreas: ['Deadlock 4 Conditions', 'Peterson Solution logic'],
    });
    console.log(`[DEV SEED] Created Demo Study Session: ${demoSession.title}`);

    // 4. Create Demo Quiz
    const demoQuiz = await Quiz.create({
      userId: demoUser._id,
      materialId: demoMaterial._id,
      studySessionId: demoSession._id,
      title: 'Practice Exam: Process Synchronization',
      difficulty: 'medium',
      generationMetadata: {
        modelName: 'gemini-2.0-flash',
        promptTokens: 1200,
        completionTokens: 450,
        temperature: 0.2,
      },
      questions: [
        {
          questionId: 'q1',
          text: 'Which mechanism guarantees mutual exclusion for shared resources?',
          options: ['Spinlocks', 'Mutex Locks', 'Semaphores', 'All of the above'],
          correctOptionIndex: 3,
          explanation: 'Spinlocks, Mutexes, and Semaphores all provide mutual exclusion mechanisms depending on hardware and software context.',
          topicTag: 'Process Synchronization',
          difficulty: 'Medium',
        },
        {
          questionId: 'q2',
          text: 'How many necessary conditions must hold simultaneously for a deadlock to occur?',
          options: ['2', '3', '4', '5'],
          correctOptionIndex: 2,
          explanation: 'Deadlocks require all 4 conditions: Mutual Exclusion, Hold & Wait, No Preemption, and Circular Wait.',
          topicTag: 'Deadlock Handling',
          difficulty: 'Easy',
        },
      ],
    });
    console.log(`[DEV SEED] Created Demo Quiz: ${demoQuiz.title} (${demoQuiz.questions.length} questions)`);

    // 5. Create Demo QuizAttempt
    const demoAttempt = await QuizAttempt.create({
      userId: demoUser._id,
      quizId: demoQuiz._id,
      materialId: demoMaterial._id,
      answers: [
        { questionId: 'q1', selectedOptionIndex: 3, isCorrect: true, timeSpentSeconds: 15 },
        { questionId: 'q2', selectedOptionIndex: 0, isCorrect: false, timeSpentSeconds: 22 },
      ],
      score: 1,
      percentage: 50,
      topicWisePerformance: [
        { topicTag: 'Process Synchronization', totalQuestions: 1, correctAnswers: 1, accuracyPercentage: 100 },
        { topicTag: 'Deadlock Handling', totalQuestions: 1, correctAnswers: 0, accuracyPercentage: 0 },
      ],
      weakTopics: ['Deadlock Handling'],
      completedAt: new Date(),
    });
    console.log(`[DEV SEED] Created Demo Quiz Attempt: Score ${demoAttempt.percentage}% (Weak Topics: ${demoAttempt.weakTopics.join(', ')})`);

    console.log('----------------------------------------------------');
    console.log('[DEV SEED SUCCESS] All demo seed data populated successfully.');
    console.log('----------------------------------------------------');
  } catch (err) {
    console.error('[DEV SEED ERROR]', err);
  } finally {
    await disconnectDB();
  }
};

// Execute if run directly
if (require.main === module) {
  seedDevelopmentDatabase();
}

module.exports = { seedDevelopmentDatabase };
