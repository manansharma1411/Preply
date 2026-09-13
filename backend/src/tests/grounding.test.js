/**
 * ============================================================================
 * PREPLY SOURCE GROUNDING & DOCUMENT REFERENCES TEST SUITE
 * ============================================================================
 * Tests source grounding validation, page metadata persistence, missing source
 * reference handling, and anti-fabrication page number stripping.
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
  cleanSourceReference,
  validateStudySessionResponse,
  validateQuizResponse,
} = require('../utils/aiResponseValidator');

let mongoServer;
let server;
let baseUrl;
let authToken = '';
let testUserId = '';

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

const runGroundingTests = async () => {
  console.log('====================================================');
  console.log('  PREPLY SOURCE GROUNDING TEST SUITE');
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
      // UNIT TESTS: Source Reference Cleaner & Anti-Fabrication
      // ----------------------------------------------------
      console.log('[UNIT TEST 1] Valid Source Reference Parsing');
      const validRef = cleanSourceReference({ document: 'Operating Systems.pdf', page: 14, section: 'Mutex Locks' }, 50);
      assert(validRef !== null, 'Valid source object returns non-null');
      assert(validRef.document === 'Operating Systems.pdf', 'Document name preserved');
      assert(validRef.page === 14, 'Page number preserved');
      assert(validRef.section === 'Mutex Locks', 'Section title preserved');
      console.log();

      console.log('[UNIT TEST 2] Missing / Null Source Reference Handling');
      assert(cleanSourceReference(null) === null, 'Null source returns null');
      assert(cleanSourceReference(undefined) === null, 'Undefined source returns null');
      assert(cleanSourceReference({}) === null, 'Empty source object returns null');
      console.log();

      console.log('[UNIT TEST 3] Anti-Fabrication Guardrail: Out-of-Bounds Page Stripping');
      const fabricatedRef = cleanSourceReference({ document: 'Short Guide.pdf', page: 99, section: 'Overview' }, 5);
      assert(fabricatedRef !== null, 'Source object maintained');
      assert(fabricatedRef.document === 'Short Guide.pdf', 'Document name maintained');
      assert(fabricatedRef.page === null, 'Fabricated page 99 stripped to null because maxPageCount = 5');
      assert(fabricatedRef.section === 'Overview', 'Section title maintained');
      console.log();

      console.log('[UNIT TEST 4] Study Session AI Output Validator Grounding Normalization');
      const aiSessionRaw = JSON.stringify({
        title: 'Grounded Study Guide',
        overview: 'Comprehensive summary overview text grounded in uploaded material.',
        keyTopics: [
          {
            topic: 'Semaphores',
            description: 'Counting semaphores mechanism',
            importance: 'High',
            source: { document: 'OS.pdf', page: 3 },
          },
          {
            topic: 'Deadlocks',
            description: 'Deadlock detection algorithms',
            importance: 'High',
            source: { document: 'OS.pdf', page: 999 }, // Fabricated page
          },
        ],
      });

      const validatedSession = validateStudySessionResponse(aiSessionRaw, 10);
      assert(validatedSession.keyTopics[0].source.page === 3, 'Valid page 3 preserved');
      assert(validatedSession.keyTopics[1].source.page === null, 'Fabricated page 999 stripped to null');
      console.log();

      console.log('[UNIT TEST 5] Quiz AI Output Validator Grounding Normalization');
      const aiQuizRaw = JSON.stringify({
        title: 'Grounded Quiz',
        questions: [
          {
            question: 'What is a mutex?',
            options: ['Lock', 'Queue', 'Stack', 'Heap'],
            correctAnswer: 0,
            explanation: 'Mutex provides mutual exclusion lock.',
            topic: 'Mutex',
            source: { document: 'OS.pdf', page: 2, section: 'Locks' },
          },
        ],
      });

      const validatedQuiz = validateQuizResponse(aiQuizRaw, 5);
      assert(validatedQuiz.questions[0].source.page === 2, 'Quiz question source page 2 validated');
      assert(validatedQuiz.questions[0].source.document === 'OS.pdf', 'Quiz question source document validated');
      console.log();

      // ----------------------------------------------------
      // INTEGRATION TESTS: Database Persistence
      // ----------------------------------------------------
      console.log('[INTEGRATION TEST 1] Setup Test User and Material with Per-Page Structure');
      const regRes = await jsonRequest('POST', '/api/v1/auth/register', {
        name: 'Grounding Student',
        email: `grounding.${Date.now()}@example.com`,
        password: 'Password123!',
      });
      authToken = regRes.body.data.token;
      testUserId = regRes.body.data.user.id;

      const testMaterial = await StudyMaterial.create({
        userId: testUserId,
        title: 'Operating Systems Grounding Test',
        originalFileName: 'Operating_Systems_Ch4.pdf',
        fileSize: 2048,
        storageRef: '/uploads/materials/os_ch4.pdf',
        extractedText: '[Page 1]\nProcess Synchronization\n[Page 2]\nMutex Locks and Semaphores',
        pages: [
          { pageNumber: 1, text: 'Process Synchronization and Critical Sections' },
          { pageNumber: 2, text: 'Mutex Locks and Counting Semaphores' },
        ],
        processingStatus: 'completed',
        metadata: { pageCount: 2, wordCount: 20, characterCount: 120, mimeType: 'application/pdf' },
      });

      assert(testMaterial.pages.length === 2, 'Per-page text array persisted in database');
      assert(testMaterial.pages[0].pageNumber === 1, 'Page 1 metadata persisted');
      assert(testMaterial.pages[1].pageNumber === 2, 'Page 2 metadata persisted');
      console.log();

      console.log('[INTEGRATION TEST 2] Persist Grounded Study Session & Quiz');
      const testSession = await StudySession.create({
        materialId: testMaterial._id,
        userId: testUserId,
        title: 'Grounded Process Synchronization',
        summary: 'Detailed summary of process synchronization and critical sections.',
        keyTopics: [
          {
            topic: 'Process Synchronization',
            description: 'Coordination of concurrent thread execution.',
            importance: 'High',
            source: { document: 'Operating_Systems_Ch4.pdf', page: 1, section: 'Synchronization' },
          },
        ],
        importantConcepts: [
          {
            concept: 'Mutex Lock',
            explanation: 'Software lock primitive.',
            examples: ['Thread lock'],
            source: { document: 'Operating_Systems_Ch4.pdf', page: 2, section: 'Mutex' },
          },
        ],
        definitions: [
          {
            term: 'Critical Section',
            definition: 'Protected region of code.',
            source: { document: 'Operating_Systems_Ch4.pdf', page: 1, section: 'Critical Section' },
          },
        ],
      });

      const savedSession = await StudySession.findById(testSession._id);
      assert(savedSession.keyTopics[0].source.page === 1, 'Key topic source page 1 retrieved from DB');
      assert(savedSession.importantConcepts[0].source.page === 2, 'Concept source page 2 retrieved from DB');
      assert(savedSession.definitions[0].source.page === 1, 'Definition source page 1 retrieved from DB');
      console.log();

      console.log('[INTEGRATION TEST 3] Retrieve Grounded Session via REST API GET Endpoint');
      const getSessRes = await jsonRequest('GET', `/api/v1/study-sessions/${savedSession._id}`, null, authToken);
      assert(getSessRes.status === 200, 'GET /api/v1/study-sessions/:id returns 200 OK');
      assert(getSessRes.body.data.session.keyTopics[0].source.page === 1, 'REST API returns grounded source page number');
      assert(getSessRes.body.data.session.keyTopics[0].source.document === 'Operating_Systems_Ch4.pdf', 'REST API returns grounded document name');
      console.log();

    } catch (err) {
      console.error('❌ Grounding Test Error:', err);
      failed++;
    } finally {
      server.close();
      await disconnectDB();
      if (mongoServer) {
        await mongoServer.stop();
      }
    }

    console.log('====================================================');
    console.log(`  GROUNDING TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log('====================================================');

    if (failed > 0) {
      process.exit(1);
    }
  });
};

runGroundingTests();
