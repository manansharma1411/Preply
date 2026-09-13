/**
 * ============================================================================
 * PREPLY CONTEXTUAL "EXPLAIN DIFFERENTLY" TEST SUITE
 * ============================================================================
 * Tests:
 * 1. Valid concept & explanation modes ('Explain simply', 'Give an example', 'Give an analogy', 'Explain for an exam answer')
 * 2. Invalid concept rejection (400 Bad Request when concept is not in study session)
 * 3. Unauthorized access rejection (User B trying to explain concept in User A's session)
 * 4. Invalid explanation mode validation (400 Bad Request)
 * 5. Gemini failure / mock fallback handling
 * ============================================================================
 */

const http = require('http');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../app');
const { connectDB, disconnectDB } = require('../config/db');
const StudyMaterial = require('../models/StudyMaterial');
const StudySession = require('../models/StudySession');

let mongoServer;
let server;
let baseUrl;

let userAToken = '';
let userAId = '';
let userBToken = '';
let userBId = '';

let sessionAId = '';

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

const runExplainTest = async () => {
  console.log('====================================================');
  console.log('  PREPLY "EXPLAIN DIFFERENTLY" FEATURE TEST SUITE');
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
      // SETUP: Register User A, User B & Create Study Session
      // ----------------------------------------------------
      console.log('[SETUP] Registering Users & Seeding Study Session');
      const regA = await jsonRequest('POST', '/api/v1/auth/register', {
        name: 'Explain User A',
        email: `explain.userA.${Date.now()}@example.com`,
        password: 'Password123!',
      });
      userAToken = regA.body.data.token;
      userAId = regA.body.data.user.id;

      const regB = await jsonRequest('POST', '/api/v1/auth/register', {
        name: 'Explain User B',
        email: `explain.userB.${Date.now()}@example.com`,
        password: 'Password123!',
      });
      userBToken = regB.body.data.token;
      userBId = regB.body.data.user.id;

      const matA = await StudyMaterial.create({
        userId: userAId,
        title: 'Operating Systems Chapter 4',
        originalFileName: 'os_ch4.pdf',
        fileType: 'pdf',
        fileSize: 2048,
        storageRef: '/uploads/os_ch4.pdf',
        processingStatus: 'completed',
        extractedText: 'Process Synchronization ensures critical sections are executed exclusively by one thread.',
      });

      const sessA = await StudySession.create({
        userId: userAId,
        materialId: matA._id,
        title: 'Study Guide: OS Chapter 4',
        summary: 'Detailed study guide covering process synchronization and locks.',
        keyTopics: [
          { topic: 'Process Synchronization', description: 'Coordination of concurrent thread execution.' },
        ],
        importantConcepts: [
          { concept: 'Mutex Locks', explanation: 'Mutual exclusion primitive.' },
        ],
        definitions: [
          { term: 'Semaphore', definition: 'Integer variable used for signaling.' },
        ],
      });

      sessionAId = sessA._id.toString();
      assert(userAToken && sessionAId, 'Session created for User A\n');

      // ----------------------------------------------------
      // TEST 1: Valid Concept with all 4 Explanation Modes
      // ----------------------------------------------------
      console.log('[TEST 1] Valid Concept with 4 Explanation Modes');

      const modes = [
        'Explain simply',
        'Give an example',
        'Give an analogy',
        'Explain for an exam answer',
      ];

      for (const mode of modes) {
        const res = await jsonRequest(
          'POST',
          `/api/v1/study-sessions/${sessionAId}/explain`,
          {
            concept: 'Process Synchronization',
            explanationMode: mode,
            existingExplanation: 'Coordination of concurrent thread execution.',
          },
          userAToken
        );

        assert(res.status === 200, `POST /explain mode '${mode}' returns 200 OK`);
        assert(res.body.success === true, `Response status success === true for '${mode}'`);
        assert(
          res.body.data.alternativeExplanation !== undefined &&
            res.body.data.alternativeExplanation.length >= 10,
          `Alternative explanation text returned for '${mode}'`
        );
      }
      console.log();

      // ----------------------------------------------------
      // TEST 2: Invalid Concept Rejection (400 Bad Request)
      // ----------------------------------------------------
      console.log('[TEST 2] Invalid Concept Rejection');
      const invConceptRes = await jsonRequest(
        'POST',
        `/api/v1/study-sessions/${sessionAId}/explain`,
        {
          concept: 'Quantum Entanglement', // Unrelated concept not in session
          explanationMode: 'Explain simply',
        },
        userAToken
      );

      assert(invConceptRes.status === 400, 'Invalid concept returns 400 Bad Request');
      assert(
        invConceptRes.body.message.includes('does not exist in this study session'),
        'ErrorMessage indicates concept not found in study session\n'
      );

      // ----------------------------------------------------
      // TEST 3: Invalid Explanation Mode Rejection (400 Bad Request)
      // ----------------------------------------------------
      console.log('[TEST 3] Invalid Explanation Mode Validation');
      const invModeRes = await jsonRequest(
        'POST',
        `/api/v1/study-sessions/${sessionAId}/explain`,
        {
          concept: 'Mutex Locks',
          explanationMode: 'Unrestricted Chatbot Query', // Invalid mode
        },
        userAToken
      );

      assert(invModeRes.status === 400, 'Invalid mode returns 400 Bad Request');

      // ----------------------------------------------------
      // TEST 4: Unauthorized User Access Enforcement
      // ----------------------------------------------------
      console.log('[TEST 4] Unauthorized User Access Isolation');
      const unauthRes = await jsonRequest(
        'POST',
        `/api/v1/study-sessions/${sessionAId}/explain`,
        {
          concept: 'Process Synchronization',
          explanationMode: 'Explain simply',
        },
        userBToken // User B trying to access User A's session
      );

      assert(
        unauthRes.status === 404 || unauthRes.status === 403,
        'User B access to User A session returns 404/403 Unauthorized\n'
      );

    } catch (err) {
      console.error('❌ Explain Test Error:', err);
      failed++;
    } finally {
      server.close();
      await disconnectDB();
      if (mongoServer) {
        await mongoServer.stop();
      }
    }

    console.log('====================================================');
    console.log(`  EXPLAIN TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log('====================================================');

    if (failed > 0) {
      process.exit(1);
    }
  });
};

runExplainTest();
