/**
 * ============================================================================
 * PREPLY STUDENT PROGRESS & ANALYTICS TEST SUITE
 * ============================================================================
 * Tests:
 * 1. Empty user (zero materials, zero attempts, empty state metrics)
 * 2. One quiz attempt metrics & score calculation
 * 3. Multiple quiz attempts & score math aggregation
 * 4. Topic aggregation (best performing topics vs weak topics)
 * 5. Revision recommendations with "Review Topic" action
 * 6. Strict user data isolation (User A cannot access User B analytics)
 * ============================================================================
 */

const http = require('http');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../app');
const { connectDB, disconnectDB } = require('../config/db');
const User = require('../models/User');
const StudyMaterial = require('../models/StudyMaterial');
const StudySession = require('../models/StudySession');
const Quiz = require('../models/Quiz');
const QuizAttempt = require('../models/QuizAttempt');

let mongoServer;
let server;
let baseUrl;

let userAToken = '';
let userAId = '';
let userBToken = '';
let userBId = '';

let passed = 0;
let failed = 0;

const assert = (condition, message) => {
  if (condition) {
    console.log(`  ✓ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failed++;
  }
};

const jsonRequest = (method, pathStr, body = null, token = null) => {
  return new Promise((resolve, reject) => {
    const url = new URL(pathStr, baseUrl);
    const options = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ status: res.statusCode, body: json });
        } catch (e) {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });

    req.on('error', reject);

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
};

const runAnalyticsTest = async () => {
  console.log('====================================================');
  console.log('  PREPLY STUDENT ANALYTICS & PROGRESS TEST SUITE');
  console.log('====================================================\n');

  let conn = await connectDB();
  if (!conn || mongoose.connection.readyState !== 1) {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);
  }

  server = app.listen(0, async () => {
    const port = server.address().port;
    baseUrl = `http://localhost:${port}`;

    try {
      // ----------------------------------------------------
      // SETUP: Register User A & User B
      // ----------------------------------------------------
      console.log('[SETUP] Registering User A & User B');
      const regA = await jsonRequest('POST', '/api/v1/auth/register', {
        name: 'Analytics User A',
        email: `analytics.userA.${Date.now()}@example.com`,
        password: 'Password123!',
      });
      userAToken = regA.body.data.token;
      userAId = regA.body.data.user.id;

      const regB = await jsonRequest('POST', '/api/v1/auth/register', {
        name: 'Analytics User B',
        email: `analytics.userB.${Date.now()}@example.com`,
        password: 'Password123!',
      });
      userBToken = regB.body.data.token;
      userBId = regB.body.data.user.id;

      assert(userAToken && userBToken, 'Users A and B registered successfully\n');

      // ----------------------------------------------------
      // TEST 1: Empty User State (Zero activity)
      // ----------------------------------------------------
      console.log('[TEST 1] Analytics for Empty User State');
      const emptyRes = await jsonRequest('GET', '/api/v1/dashboard', null, userAToken);

      assert(emptyRes.status === 200, 'GET /api/v1/dashboard returns 200 OK');
      const emptyData = emptyRes.body.data;
      assert(emptyData.metrics.materialsCount === 0, 'materialsCount is 0');
      assert(emptyData.metrics.sessionsCount === 0, 'sessionsCount is 0');
      assert(emptyData.metrics.quizzesCount === 0, 'quizzesCount is 0');
      assert(emptyData.metrics.attemptsCount === 0, 'attemptsCount is 0');
      assert(emptyData.metrics.totalQuestionsAnswered === 0, 'totalQuestionsAnswered is 0');
      assert(emptyData.metrics.averageScorePercentage === 0, 'averageScorePercentage is 0');
      assert(Array.isArray(emptyData.bestPerformingTopics) && emptyData.bestPerformingTopics.length === 0, 'bestPerformingTopics is empty array');
      assert(Array.isArray(emptyData.weakestTopics) && emptyData.weakestTopics.length === 0, 'weakestTopics is empty array');
      assert(Array.isArray(emptyData.recommendedRevision) && emptyData.recommendedRevision.length === 0, 'recommendedRevision is empty array\n');

      // ----------------------------------------------------
      // TEST 2: Single Quiz Attempt Metrics & Topic Aggregation
      // ----------------------------------------------------
      console.log('[TEST 2] Single Quiz Attempt Analytics');

      const matA = await StudyMaterial.create({
        userId: userAId,
        title: 'Operating Systems Basics',
        originalFileName: 'os_basics.pdf',
        fileType: 'pdf',
        fileSize: 1024,
        storageRef: '/uploads/os_basics.pdf',
        processingStatus: 'completed',
        extractedText: 'Process synchronization content...',
      });

      const sessA = await StudySession.create({
        userId: userAId,
        materialId: matA._id,
        title: 'Study Guide: OS Basics',
        summary: 'Overview of OS concepts.',
      });

      const quizA = await Quiz.create({
        userId: userAId,
        materialId: matA._id,
        studySessionId: sessA._id,
        title: 'OS Quiz 1',
        questions: [
          { questionId: 'q1', text: 'Q1', options: ['A', 'B'], correctOptionIndex: 0, explanation: 'Exp 1', topicTag: 'Process Synchronization', difficulty: 'Medium' },
          { questionId: 'q2', text: 'Q2', options: ['A', 'B'], correctOptionIndex: 0, explanation: 'Exp 2', topicTag: 'Process Synchronization', difficulty: 'Medium' },
          { questionId: 'q3', text: 'Q3', options: ['A', 'B'], correctOptionIndex: 0, explanation: 'Exp 3', topicTag: 'Deadlocks', difficulty: 'Hard' },
        ],
      });

      // Attempt 1: 2/3 correct (67% score), Process Sync: 2/2 (100%), Deadlocks: 0/1 (0%)
      await QuizAttempt.create({
        userId: userAId,
        materialId: matA._id,
        quizId: quizA._id,
        answers: [
          { questionId: 'q1', selectedOptionIndex: 0, isCorrect: true },
          { questionId: 'q2', selectedOptionIndex: 0, isCorrect: true },
          { questionId: 'q3', selectedOptionIndex: 1, isCorrect: false },
        ],
        score: 2,
        percentage: 67,
        topicWisePerformance: [
          { topicTag: 'Process Synchronization', totalQuestions: 2, correctAnswers: 2, accuracyPercentage: 100 },
          { topicTag: 'Deadlocks', totalQuestions: 1, correctAnswers: 0, accuracyPercentage: 0 },
        ],
        weakTopics: ['Deadlocks'],
        strongTopics: ['Process Synchronization'],
        recommendedRevisionAreas: ['Deadlocks'],
      });

      const singleRes = await jsonRequest('GET', '/api/v1/dashboard', null, userAToken);
      const singleData = singleRes.body.data;

      assert(singleData.metrics.materialsCount === 1, 'materialsCount is 1');
      assert(singleData.metrics.sessionsCount === 1, 'sessionsCount is 1');
      assert(singleData.metrics.quizzesCount === 1, 'quizzesCount is 1');
      assert(singleData.metrics.attemptsCount === 1, 'attemptsCount is 1');
      assert(singleData.metrics.totalQuestionsAnswered === 3, 'totalQuestionsAnswered is 3');
      assert(singleData.metrics.averageScorePercentage === 67, 'averageScorePercentage is 67');

      assert(singleData.bestPerformingTopics.length === 1 && singleData.bestPerformingTopics[0].topicTag === 'Process Synchronization', 'Best topic identified as Process Synchronization');
      assert(singleData.weakestTopics.length === 1 && singleData.weakestTopics[0].topicTag === 'Deadlocks', 'Weak topic identified as Deadlocks');
      assert(singleData.recommendedRevision.length === 1, '1 Recommended revision item returned');
      assert(singleData.recommendedRevision[0].action === 'Review Topic', 'Recommended revision action is "Review Topic"');
      assert(singleData.recommendedRevision[0].materialId === matA._id.toString(), 'Recommended revision links to materialId\n');

      // ----------------------------------------------------
      // TEST 3: Multiple Quiz Attempts & Score Math Aggregation
      // ----------------------------------------------------
      console.log('[TEST 3] Multiple Quiz Attempts & Score Calculation Math');

      // Attempt 2 for User A: 3/3 correct (100% score)
      await QuizAttempt.create({
        userId: userAId,
        materialId: matA._id,
        quizId: quizA._id,
        answers: [
          { questionId: 'q1', selectedOptionIndex: 0, isCorrect: true },
          { questionId: 'q2', selectedOptionIndex: 0, isCorrect: true },
          { questionId: 'q3', selectedOptionIndex: 0, isCorrect: true },
        ],
        score: 3,
        percentage: 100,
        topicWisePerformance: [
          { topicTag: 'Process Synchronization', totalQuestions: 2, correctAnswers: 2, accuracyPercentage: 100 },
          { topicTag: 'Deadlocks', totalQuestions: 1, correctAnswers: 1, accuracyPercentage: 100 },
        ],
        weakTopics: [],
        strongTopics: ['Process Synchronization', 'Deadlocks'],
        recommendedRevisionAreas: [],
      });

      const multiRes = await jsonRequest('GET', '/api/v1/dashboard', null, userAToken);
      const multiData = multiRes.body.data;

      assert(multiData.metrics.attemptsCount === 2, 'attemptsCount is 2');
      assert(multiData.metrics.totalQuestionsAnswered === 6, 'totalQuestionsAnswered is 6 (3 + 3)');
      // Average score: (67 + 100) / 2 = 83.5 => 84% rounded
      assert(multiData.metrics.averageScorePercentage === 84, 'averageScorePercentage is 84% (rounded average of 67% & 100%)\n');

      // ----------------------------------------------------
      // TEST 4: User Data Isolation Check
      // ----------------------------------------------------
      console.log('[TEST 4] Strict User Isolation Enforcement');
      const isoRes = await jsonRequest('GET', '/api/v1/dashboard', null, userBToken);
      const isoData = isoRes.body.data;

      assert(isoRes.status === 200, 'GET /api/v1/dashboard for User B returns 200 OK');
      assert(isoData.metrics.materialsCount === 0, 'User B materialsCount is 0 (isolated from User A)');
      assert(isoData.metrics.attemptsCount === 0, 'User B attemptsCount is 0 (isolated from User A)');
      assert(isoData.metrics.totalQuestionsAnswered === 0, 'User B totalQuestionsAnswered is 0');
      assert(isoData.recentMaterials.length === 0, 'User B recentMaterials is empty');
      assert(isoData.recentAttempts.length === 0, 'User B recentAttempts is empty\n');

    } catch (err) {
      console.error('❌ Analytics Test Error:', err);
      failed++;
    } finally {
      server.close();
      await disconnectDB();
      if (mongoServer) {
        await mongoServer.stop();
      }
    }

    console.log('====================================================');
    console.log(`  ANALYTICS TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log('====================================================');

    if (failed > 0) {
      process.exit(1);
    }
  });
};

runAnalyticsTest();
