/**
 * ============================================================================
 * PREPLY ADAPTIVE QUIZ ENGINE TEST SUITE
 * ============================================================================
 * Tests adaptive progression logic, topic prioritization/deprioritization,
 * duplicate question prevention, attempt completion, and API endpoint validations.
 * ============================================================================
 */

const http = require('http');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../app');
const { connectDB, disconnectDB } = require('../config/db');
const StudyMaterial = require('../models/StudyMaterial');
const StudySession = require('../models/StudySession');
const Quiz = require('../models/Quiz');
const {
  getNextDifficulty,
  computeNextAdaptiveState,
  analyzePerformance,
} = require('../utils/adaptiveEngine');

let mongoServer;
let server;
let baseUrl;
let authToken = '';
let testUserId = '';
let testQuizId = '';

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

const runAdaptiveQuizTests = async () => {
  console.log('====================================================');
  console.log('  PREPLY ADAPTIVE QUIZ ENGINE TEST SUITE');
  console.log('====================================================\n');

  // Database setup
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
      // UNIT TESTS: Adaptive Engine Functions
      // ----------------------------------------------------
      console.log('[UNIT TEST 1] Difficulty Progression Stepping (Correct vs Incorrect)');
      assert(getNextDifficulty('Easy', true) === 'Medium', 'Correct on Easy -> Medium');
      assert(getNextDifficulty('Medium', true) === 'Hard', 'Correct on Medium -> Hard');
      assert(getNextDifficulty('Hard', true) === 'Hard', 'Correct on Hard -> Hard (ceiling)');
      assert(getNextDifficulty('Hard', false) === 'Medium', 'Incorrect on Hard -> Medium');
      assert(getNextDifficulty('Medium', false) === 'Easy', 'Incorrect on Medium -> Easy');
      assert(getNextDifficulty('Easy', false) === 'Easy', 'Incorrect on Easy -> Easy (floor)');
      console.log();

      console.log('[UNIT TEST 2] Weak & Strong Topic Analysis');
      const dummyQuestions = [
        { questionId: 'q1', difficulty: 'Easy', topicTag: 'Mutex', correctOptionIndex: 0 },
        { questionId: 'q2', difficulty: 'Medium', topicTag: 'Mutex', correctOptionIndex: 1 },
        { questionId: 'q3', difficulty: 'Hard', topicTag: 'Semaphores', correctOptionIndex: 2 },
      ];
      const dummyAnswers = [
        { questionId: 'q1', selectedOptionIndex: 0, isCorrect: true },  // Mutex correct
        { questionId: 'q3', selectedOptionIndex: 0, isCorrect: false }, // Semaphores incorrect
      ];

      const perf = analyzePerformance(dummyQuestions, dummyAnswers);
      assert(perf.weakTopics.includes('Semaphores'), 'Semaphores identified as weak topic (0% accuracy)');
      assert(perf.strongTopics.includes('Mutex'), 'Mutex identified as strong topic (100% accuracy)');
      console.log();

      console.log('[UNIT TEST 3] Duplicate Question Prevention & Candidate Selection');
      const state = computeNextAdaptiveState(dummyQuestions, dummyAnswers);
      assert(state.isComplete === false, 'State is incomplete when unasked questions remain');
      assert(state.nextQuestion.questionId === 'q2', 'Unasked question q2 selected (q1 and q3 filtered out)');
      console.log();

      console.log('[UNIT TEST 4] Attempt Completion State');
      const allAnswers = [
        { questionId: 'q1', selectedOptionIndex: 0, isCorrect: true },
        { questionId: 'q2', selectedOptionIndex: 1, isCorrect: true },
        { questionId: 'q3', selectedOptionIndex: 2, isCorrect: true },
      ];
      const completedState = computeNextAdaptiveState(dummyQuestions, allAnswers);
      assert(completedState.isComplete === true, 'Returns isComplete: true when all questions answered');
      assert(completedState.nextQuestion === null, 'Returns nextQuestion: null on completion');
      console.log();

      // ----------------------------------------------------
      // INTEGRATION TESTS: HTTP REST API Endpoints
      // ----------------------------------------------------
      console.log('[INTEGRATION TEST 1] Setup Test User and Quiz in Database');
      const regRes = await jsonRequest('POST', '/api/v1/auth/register', {
        name: 'Adaptive Test Student',
        email: `adaptive.${Date.now()}@example.com`,
        password: 'Password123!',
      });

      assert(regRes.status === 201, 'User registered successfully');
      authToken = regRes.body.data.token;
      testUserId = regRes.body.data.user.id;

      const testMaterial = await StudyMaterial.create({
        userId: testUserId,
        title: 'Adaptive OS Systems',
        originalFileName: 'os_systems.pdf',
        fileSize: 1024,
        storageRef: '/uploads/os_systems.pdf',
        extractedText: 'Operating system process scheduling, mutex, semaphores, deadlocks.',
        processingStatus: 'completed',
      });

      const testSession = await StudySession.create({
        materialId: testMaterial._id,
        userId: testUserId,
        title: 'OS Process Synchronization',
        summary: 'Detailed summary of process locks and semaphores with critical sections.',
        keyTopics: [
          { topic: 'Mutex Locks', description: 'Mutual exclusion locks', importance: 'High' },
          { topic: 'Semaphores', description: 'Counting and binary semaphores', importance: 'High' },
        ],
      });

      const testQuiz = await Quiz.create({
        materialId: testMaterial._id,
        studySessionId: testSession._id,
        userId: testUserId,
        title: 'OS Adaptive Assessment Quiz',
        questions: [
          {
            questionId: 'q_easy_mutex',
            text: 'What is a binary semaphore equivalent to?',
            options: ['Mutex lock', 'Spinlock', 'Barrier', 'Condition variable'],
            correctOptionIndex: 0,
            explanation: 'Binary semaphores function like Mutex locks.',
            topicTag: 'Mutex Locks',
            difficulty: 'Easy',
          },
          {
            questionId: 'q_med_mutex',
            text: 'Which property ensures no two processes enter critical section simultaneously?',
            options: ['Progress', 'Mutual Exclusion', 'Bounded Waiting', 'Starvation'],
            correctOptionIndex: 1,
            explanation: 'Mutual exclusion prevents simultaneous access.',
            topicTag: 'Mutex Locks',
            difficulty: 'Medium',
          },
          {
            questionId: 'q_hard_mutex',
            text: 'Analyze Petersons solution for multi-process mutual exclusion limitations.',
            options: ['Requires hardware atomic operations', 'Restricted to two processes', 'Causes priority inversion', 'Non-blocking only'],
            correctOptionIndex: 1,
            explanation: 'Petersons solution works only for two processes.',
            topicTag: 'Mutex Locks',
            difficulty: 'Hard',
          },
          {
            questionId: 'q_easy_sema',
            text: 'What primitive operation decreases a semaphore integer counter?',
            options: ['wait() / P()', 'signal() / V()', 'post()', 'notify()'],
            correctOptionIndex: 0,
            explanation: 'wait() decrements the semaphore counter.',
            topicTag: 'Semaphores',
            difficulty: 'Easy',
          },
          {
            questionId: 'q_med_sema',
            text: 'How does a counting semaphore handle multiple resources?',
            options: ['Locks all threads', 'Initializes to N resource units', 'Prevents deadlocks automatically', 'Schedules round robin'],
            correctOptionIndex: 1,
            explanation: 'Counting semaphores are initialized to N.',
            topicTag: 'Semaphores',
            difficulty: 'Medium',
          },
        ],
        difficulty: 'adaptive',
      });

      testQuizId = testQuiz._id.toString();
      console.log(`  ✓ Quiz created with ID: ${testQuizId}\n`);

      console.log('[INTEGRATION TEST 2] POST /api/v1/quizzes/:id/next-question Initial Request');
      const initAdaptiveRes = await jsonRequest('POST', `/api/v1/quizzes/${testQuizId}/next-question`, {
        currentAnswers: [],
      }, authToken);

      assert(initAdaptiveRes.status === 200, 'Returns 200 OK');
      assert(initAdaptiveRes.body.data.isComplete === false, 'isComplete is false');
      assert(initAdaptiveRes.body.data.nextQuestion !== null, 'Initial nextQuestion returned');
      assert(initAdaptiveRes.body.data.currentDifficulty === 'Medium' || initAdaptiveRes.body.data.currentDifficulty === 'Easy', 'Initial difficulty calculated');
      console.log();

      console.log('[INTEGRATION TEST 3] Progression on Correct Answer (Easy -> Medium -> Hard)');
      const correctAnsRes = await jsonRequest('POST', `/api/v1/quizzes/${testQuizId}/next-question`, {
        currentAnswers: [
          { questionId: 'q_easy_mutex', selectedOptionIndex: 0 }, // Correct answer on Easy question
        ],
      }, authToken);

      assert(correctAnsRes.status === 200, 'Returns 200 OK');
      assert(correctAnsRes.body.data.currentDifficulty === 'Medium', 'Target difficulty escalated from Easy to Medium');
      assert(correctAnsRes.body.data.strongTopics.includes('Mutex Locks'), 'Mutex Locks recorded as strong topic');
      console.log();

      console.log('[INTEGRATION TEST 4] Progression on Incorrect Answer & Weak Topic Prioritization');
      const incorrectAnsRes = await jsonRequest('POST', `/api/v1/quizzes/${testQuizId}/next-question`, {
        currentAnswers: [
          { questionId: 'q_easy_mutex', selectedOptionIndex: 0 },  // Correct Mutex (Easy)
          { questionId: 'q_med_sema', selectedOptionIndex: 0 },    // Incorrect Semaphore (Medium)
        ],
      }, authToken);

      assert(incorrectAnsRes.status === 200, 'Returns 200 OK');
      assert(incorrectAnsRes.body.data.currentDifficulty === 'Easy', 'Target difficulty reduced to Easy after incorrect answer');
      assert(incorrectAnsRes.body.data.weakTopics.includes('Semaphores'), 'Semaphores added to weak topics list');
      assert(incorrectAnsRes.body.data.nextQuestion.topicTag === 'Semaphores', 'Next question prioritizes weak topic (Semaphores)');
      console.log();

      console.log('[INTEGRATION TEST 5] Submit Quiz Attempt Evaluation & Recommendation Generation');
      const submitRes = await jsonRequest('POST', `/api/v1/quizzes/${testQuizId}/attempts`, {
        answers: [
          { questionId: 'q_easy_mutex', selectedOptionIndex: 0 }, // Correct
          { questionId: 'q_med_mutex', selectedOptionIndex: 1 },  // Correct
          { questionId: 'q_hard_mutex', selectedOptionIndex: 1 }, // Correct
          { questionId: 'q_easy_sema', selectedOptionIndex: 3 },  // Incorrect
          { questionId: 'q_med_sema', selectedOptionIndex: 3 },   // Incorrect
        ],
        timeTakenSeconds: 90,
      }, authToken);

      assert(submitRes.status === 201, 'POST /api/v1/quizzes/:id/attempts returns 201 Created');
      assert(submitRes.body.data.attempt.score === 3, 'Score count is 3 correct answers out of 5');
      assert(submitRes.body.data.attempt.percentage === 60, 'Percentage is 60%');
      assert(Array.isArray(submitRes.body.data.attempt.difficultyWisePerformance), 'difficultyWisePerformance returned');
      assert(submitRes.body.data.attempt.strongTopics.includes('Mutex Locks'), 'Mutex Locks in strongTopics');
      assert(submitRes.body.data.attempt.weakTopics.includes('Semaphores'), 'Semaphores in weakTopics');
      assert(submitRes.body.data.attempt.recommendedRevisionAreas.length >= 1, 'recommendedRevisionAreas populated');
      console.log();

      console.log('[INTEGRATION TEST 6] Validation 400 Bad Request Errors');
      const invalidIdRes = await jsonRequest('POST', '/api/v1/quizzes/invalid-object-id/next-question', {
        currentAnswers: [],
      }, authToken);
      assert(invalidIdRes.status === 400, '400 Bad Request returned on invalid quiz ID format');

      const invalidSchemaRes = await jsonRequest('POST', `/api/v1/quizzes/${testQuizId}/next-question`, {
        currentAnswers: 'invalid_answers_string',
      }, authToken);
      assert(invalidSchemaRes.status === 400, '400 Bad Request returned on invalid currentAnswers schema');
      console.log();

    } catch (err) {
      console.error('❌ Adaptive Quiz Test Error:', err);
      failed++;
    } finally {
      server.close();
      await disconnectDB();
      if (mongoServer) {
        await mongoServer.stop();
      }
    }

    console.log('====================================================');
    console.log(`  ADAPTIVE QUIZ TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log('====================================================');

    if (failed > 0) {
      process.exit(1);
    }
  });
};

runAdaptiveQuizTests();
