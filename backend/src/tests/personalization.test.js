/**
 * ============================================================================
 * PREPLY LIGHTWEIGHT PERSONALIZATION TEST SUITE
 * ============================================================================
 * Tests student study preference parsing, AI prompt customization, question count
 * mapping, fallback default shielding, and database persistence.
 * ============================================================================
 */

const http = require('http');
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../app');
const { connectDB, disconnectDB } = require('../config/db');
const StudyMaterial = require('../models/StudyMaterial');
const StudySession = require('../models/StudySession');
const Quiz = require('../models/Quiz');
const {
  buildStudySessionPrompt,
  buildQuizPrompt,
  getGoalDirective,
  getDifficultyGuidance,
} = require('../utils/promptBuilder');
const { processDocumentPipeline } = require('../services/pipelineService');

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

const uploadMultipartRequest = (pathStr, fields, fileField, filePath, token = null) => {
  return new Promise((resolve, reject) => {
    const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
    const url = new URL(pathStr, baseUrl);

    const options = {
      method: 'POST',
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
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

    let postData = [];
    for (const [key, val] of Object.entries(fields)) {
      postData.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${key}"\r\n\r\n${val}\r\n`));
    }

    if (fileField && filePath && fs.existsSync(filePath)) {
      const fileName = path.basename(filePath);
      postData.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${fileField}"; filename="${fileName}"\r\nContent-Type: application/pdf\r\n\r\n`));
      postData.push(fs.readFileSync(filePath));
      postData.push(Buffer.from('\r\n'));
    }

    postData.push(Buffer.from(`--${boundary}--\r\n`));

    const bodyBuffer = Buffer.concat(postData);
    req.setHeader('Content-Length', bodyBuffer.length);
    req.write(bodyBuffer);
    req.end();
  });
};

const runPersonalizationTests = async () => {
  console.log('====================================================');
  console.log('  PREPLY LIGHTWEIGHT PERSONALIZATION TEST SUITE');
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
      // UNIT TESTS: Goal & Difficulty Guidance Mapping
      // ----------------------------------------------------
      console.log('[UNIT TEST 1] Goal Directive Mapping');
      assert(getGoalDirective('Quick Revision').includes('Quick Revision'), 'Quick Revision directive formatted');
      assert(getGoalDirective('Internal Exam').includes('Internal Exam'), 'Internal Exam directive formatted');
      assert(getGoalDirective('Semester Exam').includes('Semester Exam'), 'Semester Exam directive formatted');
      assert(getGoalDirective('Deep Understanding').includes('Deep Understanding'), 'Deep Understanding directive formatted');
      console.log();

      console.log('[UNIT TEST 2] Difficulty Guidance Mapping');
      assert(getDifficultyGuidance('Beginner').includes('Easy to Medium'), 'Beginner guidance mapped to Easy to Medium');
      assert(getDifficultyGuidance('Intermediate').includes('Medium'), 'Intermediate guidance mapped to Medium');
      assert(getDifficultyGuidance('Advanced').includes('Medium to Hard'), 'Advanced guidance mapped to Medium to Hard');
      console.log();

      console.log('[UNIT TEST 3] Prompt Builder Customization & Question Count Influence');
      const quickPrompt = buildQuizPrompt('Operating systems overview text', ['Mutex'], {
        preferences: { studyGoal: 'Quick Revision', targetDifficulty: 'Beginner' },
      });
      assert(quickPrompt.includes('Number of Questions: 3'), 'Quick Revision yields 3 questions');
      assert(quickPrompt.includes('Beginner'), 'Beginner difficulty reflected in prompt');

      const deepPrompt = buildQuizPrompt('Operating systems overview text', ['Mutex'], {
        preferences: { studyGoal: 'Deep Understanding', targetDifficulty: 'Advanced' },
      });
      assert(deepPrompt.includes('Number of Questions: 7'), 'Deep Understanding yields 7 questions');
      assert(deepPrompt.includes('Advanced'), 'Advanced difficulty reflected in prompt');
      console.log();

      // ----------------------------------------------------
      // INTEGRATION TESTS: Pipeline & API Persistence
      // ----------------------------------------------------
      console.log('[INTEGRATION TEST 1] User Registration');
      const regRes = await jsonRequest('POST', '/api/v1/auth/register', {
        name: 'Personalization Student',
        email: `prefs.${Date.now()}@example.com`,
        password: 'Password123!',
      });
      assert(regRes.status === 201, 'User registered successfully');
      authToken = regRes.body.data.token;
      testUserId = regRes.body.data.user.id;
      console.log();

      console.log('[INTEGRATION TEST 2] Document Processing with Custom Personalization Preferences');
      const scratchDir = path.join(__dirname, '../../../scratch');
      if (!fs.existsSync(scratchDir)) {
        fs.mkdirSync(scratchDir, { recursive: true });
      }
      const testPdfPath = path.join(scratchDir, 'prefs_test.pdf');
      const pdfBuffer = Buffer.from(`%PDF-1.4
1 0 obj <</Type /Catalog /Pages 2 0 R>> endobj
2 0 obj <</Type /Pages /Count 1 /Kids [3 0 R]>> endobj
3 0 obj <</Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources <</Font <</F1 5 0 R>>>> >> endobj
4 0 obj <</Length 100>>
stream
BT /F1 12 Tf 72 712 Td (Operating System Process Locks Mutex Semaphores Memory Management) Tj ET
endstream
endobj
5 0 obj <</Type /Font /Subtype /Type1 /BaseFont /Helvetica>> endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000244 00000 n 
0000000394 00000 n 
trailer <</Size 6 /Root 1 0 R>>
startxref
470
%%EOF`);
      fs.writeFileSync(testPdfPath, pdfBuffer);

      const uploadRes = await uploadMultipartRequest(
        '/api/v1/materials/upload',
        {
          title: 'Personalized OS Review',
          subject: 'Computer Science CS301',
          studyGoal: 'Quick Revision',
          studyTime: '15 minutes',
          targetDifficulty: 'Beginner',
        },
        'file',
        testPdfPath,
        authToken
      );

      assert(uploadRes.status === 201, 'POST /api/v1/materials/upload returns 201 Created');
      assert(uploadRes.body.data.studySession.preferences !== undefined, 'Preferences object returned in studySession response');
      assert(uploadRes.body.data.studySession.preferences.studyGoal === 'Quick Revision', 'studyGoal === Quick Revision');
      assert(uploadRes.body.data.studySession.preferences.studyTime === '15 minutes', 'studyTime === 15 minutes');
      assert(uploadRes.body.data.studySession.preferences.targetDifficulty === 'Beginner', 'targetDifficulty === Beginner');
      assert(uploadRes.body.data.quiz.questions.length === 3, 'Quiz contains exactly 3 questions for Quick Revision');
      console.log();

      console.log('[INTEGRATION TEST 3] Fallback to Defaults when Preferences are Omitted');
      const defaultUploadRes = await uploadMultipartRequest(
        '/api/v1/materials/upload',
        {
          title: 'Default Preferences Test',
        },
        'file',
        testPdfPath,
        authToken
      );

      assert(defaultUploadRes.status === 201, 'POST /api/v1/materials/upload returns 201 Created');
      assert(defaultUploadRes.body.data.studySession.preferences.studyGoal === 'Semester Exam', 'Default studyGoal === Semester Exam');
      assert(defaultUploadRes.body.data.studySession.preferences.studyTime === '30 minutes', 'Default studyTime === 30 minutes');
      assert(defaultUploadRes.body.data.studySession.preferences.targetDifficulty === 'Intermediate', 'Default targetDifficulty === Intermediate');
      assert(defaultUploadRes.body.data.quiz.questions.length === 5, 'Default quiz contains 5 questions');
      console.log();

      // Clean up temp pdf file
      if (fs.existsSync(testPdfPath)) {
        fs.unlinkSync(testPdfPath);
      }

    } catch (err) {
      console.error('❌ Personalization Test Error:', err);
      failed++;
    } finally {
      server.close();
      await disconnectDB();
      if (mongoServer) {
        await mongoServer.stop();
      }
    }

    console.log('====================================================');
    console.log(`  PERSONALIZATION TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log('====================================================');

    if (failed > 0) {
      process.exit(1);
    }
  });
};

runPersonalizationTests();
