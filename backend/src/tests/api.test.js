/**
 * ============================================================================
 * PREPLY REST API AUTOMATED TEST SUITE
 * ============================================================================
 * Tests all 14 API Endpoints:
 * - Health Check (GET /api/v1/health)
 * - Auth: Register, Login, Me, Logout
 * - Materials: Create, List, GetById, Delete
 * - Study Sessions: Create, List, GetById
 * - Quizzes: GetById, Submit Attempt, Get Attempt History
 * - Dashboard: Overview metrics & weak topics aggregation
 * ============================================================================
 */

const http = require('http');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../app');
const { connectDB, disconnectDB } = require('../config/db');
const User = require('../models/User');
const StudySession = require('../models/StudySession');
const Quiz = require('../models/Quiz');
const QuizAttempt = require('../models/QuizAttempt');

let mongoServer;
let server;
let baseUrl;
let authToken = '';
let testUserId = '';
let testMaterialId = '';
let testSessionId = '';
let testQuizId = '';

let passedTests = 0;
let failedTests = 0;

const assert = (condition, message) => {
  if (condition) {
    console.log(`  ✓ PASS: ${message}`);
    passedTests++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failedTests++;
  }
};

const request = (method, path, body = null, token = null) => {
  return new Promise((resolve, reject) => {
    const url = new URL(path, baseUrl);
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

const runApiTests = async () => {
  console.log('====================================================');
  console.log('  PREPLY REST API SUITE VERIFICATION');
  console.log('====================================================\n');

  // Attempt DB Connection; fallback to MongoMemoryServer if offline
  let conn = await connectDB();
  if (!conn || mongoose.connection.readyState !== 1) {
    console.log('[API Test] Local MongoDB offline. Initializing in-memory MongoMemoryServer...');
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);
    console.log('[API Test] Connected to MongoMemoryServer.\n');
  }

  // Start HTTP Test Server on random available port
  server = app.listen(0, async () => {
    const port = server.address().port;
    baseUrl = `http://localhost:${port}`;
    console.log(`[API Test Server] Listening on ${baseUrl}\n`);

    try {
      // ----------------------------------------------------
      // 1. HEALTH CHECK ENDPOINT
      // ----------------------------------------------------
      console.log('[TEST GROUP 1] Health Check');
      const healthRes = await request('GET', '/api/v1/health');
      assert(healthRes.status === 200, 'GET /api/v1/health returns 200 OK');
      assert(healthRes.body.success === true, 'Health payload success === true');
      console.log();

      // ----------------------------------------------------
      // 2. AUTHENTICATION ENDPOINTS
      // ----------------------------------------------------
      console.log('[TEST GROUP 2] Authentication Endpoints');
      const email = `api.test.${Date.now()}@university.edu`;

      // 2a. Register
      const regRes = await request('POST', '/api/v1/auth/register', {
        name: 'API Test Student',
        email,
        password: 'TestPassword123!',
      });
      assert(regRes.status === 201, 'POST /api/v1/auth/register returns 201 Created');
      assert(regRes.body.data.token !== undefined, 'Register returns JWT token');
      authToken = regRes.body.data.token;
      testUserId = regRes.body.data.user.id;

      // 2b. Login
      const loginRes = await request('POST', '/api/v1/auth/login', {
        email,
        password: 'TestPassword123!',
      });
      assert(loginRes.status === 200, 'POST /api/v1/auth/login returns 200 OK');
      assert(loginRes.body.data.token !== undefined, 'Login returns JWT token');

      // 2c. Get Me (Authenticated)
      const meRes = await request('GET', '/api/v1/auth/me', null, authToken);
      assert(meRes.status === 200, 'GET /api/v1/auth/me returns 200 OK');
      assert(meRes.body.data.user.email === email, 'GET /api/v1/auth/me returns correct user email');

      // 2d. Unauthorized Check
      const unauthRes = await request('GET', '/api/v1/auth/me');
      assert(unauthRes.status === 401, 'GET /api/v1/auth/me without token returns 401 Unauthorized');

      // 2e. Logout
      const logoutRes = await request('POST', '/api/v1/auth/logout', null, authToken);
      assert(logoutRes.status === 200, 'POST /api/v1/auth/logout returns 200 OK');
      console.log();

      // ----------------------------------------------------
      // 3. STUDY MATERIALS ENDPOINTS
      // ----------------------------------------------------
      console.log('[TEST GROUP 3] Study Materials Endpoints');
      
      // 3a. Create Material
      const createMatRes = await request('POST', '/api/v1/materials', {
        title: 'Operating Systems - Processes & Threads',
        originalFileName: 'os_threads.pdf',
        fileType: 'pdf',
        fileSize: 1048576,
        storageRef: '/uploads/test/os_threads.pdf',
        extractedText: 'Process is an execution context. Threads are lightweight execution units sharing process memory space.',
        subject: 'Computer Science',
      }, authToken);

      assert(createMatRes.status === 201, 'POST /api/v1/materials returns 201 Created');
      testMaterialId = createMatRes.body.data.material.id;

      // 3b. Get All Materials
      const getMatsRes = await request('GET', '/api/v1/materials?page=1&limit=10', null, authToken);
      assert(getMatsRes.status === 200, 'GET /api/v1/materials returns 200 OK');
      assert(getMatsRes.body.data.materials.length >= 1, 'Materials list contains created material');

      // 3c. Get Material By ID
      const getMatRes = await request('GET', `/api/v1/materials/${testMaterialId}`, null, authToken);
      assert(getMatRes.status === 200, 'GET /api/v1/materials/:id returns 200 OK');
      assert(getMatRes.body.data.material.id === testMaterialId, 'Material ID matches');
      console.log();

      // ----------------------------------------------------
      // 4. STUDY SESSIONS ENDPOINTS
      // ----------------------------------------------------
      console.log('[TEST GROUP 4] Study Sessions Endpoints');

      // 4a. Create Study Session
      const createSessRes = await request('POST', '/api/v1/study-sessions', {
        materialId: testMaterialId,
        title: 'Study Kit: Processes & Threads',
        summary: 'Processes provide memory isolation while threads enable lightweight execution within shared memory space.',
        keyTopics: [{ topic: 'Threads', description: 'Lightweight processes', importance: 'High' }],
        importantConcepts: [{ concept: 'Context Switching', explanation: 'Saving and restoring state' }],
        definitions: [{ term: 'PCB', definition: 'Process Control Block' }],
        examTips: ['Understand thread stack vs heap allocation'],
        recommendedRevisionAreas: ['User threads vs Kernel threads'],
      }, authToken);

      assert(createSessRes.status === 201, 'POST /api/v1/study-sessions returns 201 Created');
      testSessionId = createSessRes.body.data.session.id;

      // 4b. Get All Sessions
      const getSessRes = await request('GET', '/api/v1/study-sessions', null, authToken);
      assert(getSessRes.status === 200, 'GET /api/v1/study-sessions returns 200 OK');

      // 4c. Get Session By ID
      const getSessByIdRes = await request('GET', `/api/v1/study-sessions/${testSessionId}`, null, authToken);
      assert(getSessByIdRes.status === 200, 'GET /api/v1/study-sessions/:id returns 200 OK');
      console.log();

      // ----------------------------------------------------
      // 5. QUIZ & ATTEMPT ENDPOINTS
      // ----------------------------------------------------
      console.log('[TEST GROUP 5] Quiz & Attempt Endpoints');

      // Seed a Quiz directly for testing endpoints
      const testQuiz = await Quiz.create({
        userId: testUserId,
        materialId: testMaterialId,
        studySessionId: testSessionId,
        title: 'Processes & Threads Quiz',
        difficulty: 'medium',
        questions: [
          {
            questionId: 'q1',
            text: 'What do threads within the same process share?',
            options: ['Register states', 'Stack memory', 'Heap memory & code space', 'Thread ID'],
            correctOptionIndex: 2,
            explanation: 'Threads share the heap and code space but have individual stacks and registers.',
            topicTag: 'Thread Architecture',
            difficulty: 'Medium',
          },
        ],
      });
      testQuizId = testQuiz._id.toString();

      // 5a. Get Quiz By ID
      const getQuizRes = await request('GET', `/api/v1/quizzes/${testQuizId}`, null, authToken);
      assert(getQuizRes.status === 200, 'GET /api/v1/quizzes/:id returns 200 OK');

      // 5b. Submit Quiz Attempt
      const submitRes = await request('POST', `/api/v1/quizzes/${testQuizId}/attempts`, {
        answers: [{ questionId: 'q1', selectedOptionIndex: 2, timeSpentSeconds: 10 }],
        timeTakenSeconds: 30,
      }, authToken);
      assert(submitRes.status === 201, 'POST /api/v1/quizzes/:id/attempts returns 201 Created');
      assert(submitRes.body.data.attempt.score === 1, 'Attempt calculated correct score = 1');
      assert(submitRes.body.data.attempt.percentage === 100, 'Attempt calculated percentage = 100%');

      // 5c. Get Quiz Attempt History
      const attemptsRes = await request('GET', `/api/v1/quizzes/${testQuizId}/attempts`, null, authToken);
      assert(attemptsRes.status === 200, 'GET /api/v1/quizzes/:id/attempts returns 200 OK');
      assert(attemptsRes.body.data.attempts.length >= 1, 'Attempt history retrieved');
      console.log();

      // ----------------------------------------------------
      // 6. DASHBOARD ENDPOINT
      // ----------------------------------------------------
      console.log('[TEST GROUP 6] Dashboard Overview Endpoint');
      const dashRes = await request('GET', '/api/v1/dashboard', null, authToken);
      assert(dashRes.status === 200, 'GET /api/v1/dashboard returns 200 OK');
      assert(dashRes.body.data.metrics.materialsCount >= 1, 'Dashboard returns materials metrics');
      assert(dashRes.body.data.metrics.averageScorePercentage === 100, 'Dashboard returns correct average score');
      console.log();

      // ----------------------------------------------------
      // 7. CLEANUP & DELETE ENDPOINT
      // ----------------------------------------------------
      console.log('[TEST GROUP 7] Resource Cleanup & Deletion');
      const delMatRes = await request('DELETE', `/api/v1/materials/${testMaterialId}`, null, authToken);
      assert(delMatRes.status === 200, 'DELETE /api/v1/materials/:id returns 200 OK');

      // Clean up test DB entities
      await QuizAttempt.deleteMany({ userId: testUserId });
      await Quiz.deleteMany({ userId: testUserId });
      await StudySession.deleteMany({ userId: testUserId });
      await User.findByIdAndDelete(testUserId);
      console.log('  ✓ Cleaned up test user data\n');

    } catch (err) {
      console.error('❌ API Test Suite Execution Error:', err);
      failedTests++;
    } finally {
      server.close();
      await disconnectDB();
      if (mongoServer) {
        await mongoServer.stop();
      }
    }

    console.log('====================================================');
    console.log(`  API TEST RESULTS: ${passedTests} PASSED, ${failedTests} FAILED`);
    console.log('====================================================');

    if (failedTests > 0) {
      process.exit(1);
    }
  });
};

runApiTests();
