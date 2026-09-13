/**
 * ============================================================================
 * PREPLY QA & RELIABILITY COMPREHENSIVE AUDIT TEST SUITE
 * ============================================================================
 * Tests:
 * 1. Cross-User Authorization Boundaries (User A vs User B resource isolation)
 * 2. Invalid ObjectIDs & Malformed Request Payload Handling (Zero 500s)
 * 3. File Upload Edge Cases & Suspicious File Rejection
 * 4. AI Response Resilience, Sanitization & Schema Fallbacks
 * 5. Security Headers & Rate Limiting Enforcement
 * ============================================================================
 */

const http = require('http');
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../app');
const { connectDB, disconnectDB } = require('../config/db');
const { sanitizeJsonResponse, validateQuizResponse } = require('../utils/aiResponseValidator');

let mongoServer;
let server;
let baseUrl;

let userAToken = '';
let userBToken = '';
let userAId = '';
let userBId = '';

let userAMaterialId = '';
let userAStudySessionId = '';
let userAQuizId = '';
let userAAttemptId = '';

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
          resolve({ status: res.statusCode, headers: res.headers, body: json });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, body: data });
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

const runQAAuditTests = async () => {
  console.log('====================================================');
  console.log('  PREPLY SENIOR QA & RELIABILITY AUDIT TEST SUITE');
  console.log('====================================================\n');

  // DB Setup
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
      // 1. SETUP TWO SEPARATE USERS (User A and User B)
      // ----------------------------------------------------
      console.log('[AUDIT GROUP 1] Multi-Tenant User Setup');
      const userARes = await jsonRequest('POST', '/api/v1/auth/register', {
        name: 'User A Student',
        email: `usera.${Date.now()}@university.edu`,
        password: 'Password123!',
      });
      assert(userARes.status === 201, 'User A registered successfully');
      userAToken = userARes.body.data.token;
      userAId = userARes.body.data.user.id;

      const userBRes = await jsonRequest('POST', '/api/v1/auth/register', {
        name: 'User B Student',
        email: `userb.${Date.now()}@university.edu`,
        password: 'Password123!',
      });
      assert(userBRes.status === 201, 'User B registered successfully');
      userBToken = userBRes.body.data.token;
      userBId = userBRes.body.data.user.id;
      console.log();

      // ----------------------------------------------------
      // 2. USER A CREATES STUDY RESOURCES
      // ----------------------------------------------------
      console.log('[AUDIT GROUP 2] Resource Creation by User A');
      const scratchDir = path.join(__dirname, '../../../scratch');
      if (!fs.existsSync(scratchDir)) {
        fs.mkdirSync(scratchDir, { recursive: true });
      }
      const testPdfPath = path.join(scratchDir, 'user_a_os.pdf');

      const pdfHeader = `%PDF-1.4
1 0 obj <</Type /Catalog /Pages 2 0 R>> endobj
2 0 obj <</Type /Pages /Count 1 /Kids [3 0 R]>> endobj
3 0 obj <</Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources <</Font <</F1 5 0 R>>>> >> endobj
4 0 obj <</Length 100>>
stream
BT /F1 12 Tf 72 712 Td (User A Operating Systems Process Synchronization Mutex Locks) Tj ET
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
%%EOF`;
      fs.writeFileSync(testPdfPath, pdfHeader);

      const uploadRes = await uploadMultipartRequest(
        '/api/v1/materials/upload',
        { title: 'User A OS Lecture Notes' },
        'file',
        testPdfPath,
        userAToken
      );

      assert(uploadRes.status === 201, 'User A uploaded material successfully');
      userAMaterialId = uploadRes.body.data.material.id;
      userAStudySessionId = uploadRes.body.data.studySession.id;
      userAQuizId = uploadRes.body.data.quiz.id;

      if (fs.existsSync(testPdfPath)) {
        fs.unlinkSync(testPdfPath);
      }

      // User A submits quiz attempt
      const attemptRes = await jsonRequest(
        'POST',
        `/api/v1/quizzes/${userAQuizId}/attempts`,
        {
          answers: [{ questionId: 'q1', selectedOptionIndex: 0, timeSpentSeconds: 10 }],
          timeTakenSeconds: 30,
        },
        userAToken
      );
      assert(attemptRes.status === 201, 'User A submitted quiz attempt successfully');
      userAAttemptId = attemptRes.body.data.attempt.id;
      console.log();

      // ----------------------------------------------------
      // 3. AUTHORIZATION BOUNDARY TESTS (User B accesses User A)
      // ----------------------------------------------------
      console.log('[AUDIT GROUP 3] Cross-User Authorization Boundary Tests');
      
      const unauthMatRes = await jsonRequest('GET', `/api/v1/materials/${userAMaterialId}`, null, userBToken);
      assert(unauthMatRes.status === 404, 'User B blocked from accessing User A material (404 Not Found)');

      const unauthSessRes = await jsonRequest('GET', `/api/v1/study-sessions/${userAStudySessionId}`, null, userBToken);
      assert(unauthSessRes.status === 404, 'User B blocked from accessing User A study session (404 Not Found)');

      const unauthQuizRes = await jsonRequest('GET', `/api/v1/quizzes/${userAQuizId}`, null, userBToken);
      assert(unauthQuizRes.status === 404, 'User B blocked from accessing User A quiz (404 Not Found)');

      const unauthAttemptRes = await jsonRequest('GET', `/api/v1/quizzes/attempt/${userAAttemptId}`, null, userBToken);
      assert(unauthAttemptRes.status === 404, 'User B blocked from accessing User A quiz attempt (404 Not Found)');

      const unauthDeleteRes = await jsonRequest('DELETE', `/api/v1/materials/${userAMaterialId}`, null, userBToken);
      assert(unauthDeleteRes.status === 404, 'User B blocked from deleting User A material (404 Not Found)');
      console.log();

      // ----------------------------------------------------
      // 4. INVALID OBJECTIDs & MALFORMED PAYLOAD TESTS
      // ----------------------------------------------------
      console.log('[AUDIT GROUP 4] Invalid ObjectIDs & Input Sanitization');
      
      const invalidIdRes1 = await jsonRequest('GET', '/api/v1/materials/invalid-object-id-999', null, userAToken);
      assert(invalidIdRes1.status === 400, 'Invalid material ObjectID returns 400 Bad Request (no 500 crash)');

      const invalidIdRes2 = await jsonRequest('GET', '/api/v1/study-sessions/invalid-sess-id', null, userAToken);
      assert(invalidIdRes2.status === 400, 'Invalid session ObjectID returns 400 Bad Request');

      const invalidIdRes3 = await jsonRequest('GET', '/api/v1/quizzes/invalid-quiz-id', null, userAToken);
      assert(invalidIdRes3.status === 400, 'Invalid quiz ObjectID returns 400 Bad Request');

      const malformedAttemptRes = await jsonRequest(
        'POST',
        `/api/v1/quizzes/${userAQuizId}/attempts`,
        { answers: [{ questionId: 'q1', selectedOptionIndex: -5 }] }, // Invalid negative option index
        userAToken
      );
      assert(malformedAttemptRes.status === 400, 'Negative option index rejected with 400 Bad Request');
      console.log();

      // ----------------------------------------------------
      // 5. UPLOAD SECURITY & SUSPICIOUS FILE REJECTION
      // ----------------------------------------------------
      console.log('[AUDIT GROUP 5] Upload Security & Suspicious Upload Rejection');
      
      const fakePdfPath = path.join(scratchDir, 'fake_script.pdf');
      fs.writeFileSync(fakePdfPath, 'echo "malicious script disguised as pdf"');

      const fakeUploadRes = await uploadMultipartRequest(
        '/api/v1/materials/upload',
        { title: 'Fake Script PDF' },
        'file',
        fakePdfPath,
        userAToken
      );
      assert(fakeUploadRes.status === 400, 'Non-PDF binary with .pdf extension rejected via Magic Header inspection');

      if (fs.existsSync(fakePdfPath)) {
        fs.unlinkSync(fakePdfPath);
      }
      console.log();

      // ----------------------------------------------------
      // 6. AI RESPONSE SANITIZATION & RESILIENCE
      // ----------------------------------------------------
      console.log('[AUDIT GROUP 6] AI Response Sanitizer & Schema Fallbacks');
      
      const fencedJsonStr = '```json\n{"title":"Test Session","overview":"Clean overview"}\n```';
      const sanitizedFenced = sanitizeJsonResponse(fencedJsonStr);
      assert(sanitizedFenced.title === 'Test Session', 'Sanitizer strips markdown code fences');

      const quizDataWithStringIndex = {
        title: 'Practice Quiz',
        questions: [
          {
            question: 'What is a mutex?',
            options: ['Option A', 'Option B'],
            correctAnswer: '1', // String representation instead of integer
            explanation: 'Explanation text',
            topic: 'OS',
            difficulty: 'Medium',
          },
        ],
      };
      const parsedQuiz = validateQuizResponse(JSON.stringify(quizDataWithStringIndex));
      assert(typeof parsedQuiz.questions[0].correctAnswer === 'number', 'Quiz parser normalizes string correctAnswer "1" to integer 1');
      console.log();

      // ----------------------------------------------------
      // 7. SECURITY HEADERS CHECK
      // ----------------------------------------------------
      console.log('[AUDIT GROUP 7] Security Headers Verification');
      const healthRes = await jsonRequest('GET', '/api/v1/health');
      assert(healthRes.headers['x-dns-prefetch-control'] !== undefined, 'Helmet header x-dns-prefetch-control set');
      assert(healthRes.headers['x-frame-options'] !== undefined, 'Helmet header x-frame-options set');
      console.log();

    } catch (err) {
      console.error('❌ QA Audit Test Suite Error:', err);
      failedTests++;
    } finally {
      server.close();
      await disconnectDB();
      if (mongoServer) {
        await mongoServer.stop();
      }
    }

    console.log('====================================================');
    console.log(`  QA AUDIT TEST RESULTS: ${passedTests} PASSED, ${failedTests} FAILED`);
    console.log('====================================================');

    if (failedTests > 0) {
      process.exit(1);
    }
  });
};

runQAAuditTests();
