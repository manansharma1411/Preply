/**
 * ============================================================================
 * PREPLY END-TO-END WORKFLOW INTEGRATION TEST
 * ============================================================================
 * Tests full single-product student workflow end-to-end:
 * 1. User Register & Authentication
 * 2. Upload PDF Document & Execute AI Analysis Pipeline
 * 3. Fetch Generated Study Session Kit & Grounded Content
 * 4. Fetch Generated Quiz & Question Set
 * 5. Submit Quiz Attempt & Evaluate Performance / Weak Topics
 * 6. Fetch Attempt Details & Quiz History
 * 7. Retrieve Dashboard Workspace Overview Metrics & Session History
 * ============================================================================
 */

const http = require('http');
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../app');
const { connectDB, disconnectDB } = require('../config/db');

let mongoServer;
let server;
let baseUrl;
let authToken = '';
let userId = '';
let materialId = '';
let studySessionId = '';
let quizId = '';
let attemptId = '';

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

    // Build Multipart Body
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

const runWorkflowTest = async () => {
  console.log('====================================================');
  console.log('  PREPLY END-TO-END WORKFLOW INTEGRATION TEST');
  console.log('====================================================\n');

  // Database setup
  let conn = await connectDB();
  if (!conn || mongoose.connection.readyState !== 1) {
    console.log('[Workflow Test] Local MongoDB offline. Starting MongoMemoryServer...');
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);
    console.log('[Workflow Test] Connected to MongoMemoryServer.\n');
  }

  // Start HTTP Test Server
  server = app.listen(0, async () => {
    const port = server.address().port;
    baseUrl = `http://localhost:${port}`;
    console.log(`[Workflow Test Server] Running at ${baseUrl}\n`);

    try {
      // ----------------------------------------------------
      // STEP 1: User Registration
      // ----------------------------------------------------
      console.log('[STEP 1] Student Account Registration');
      const email = `workflow.student.${Date.now()}@example.com`;
      const regRes = await jsonRequest('POST', '/api/v1/auth/register', {
        name: 'E2E Workflow Student',
        email,
        password: 'Password123!',
      });

      assert(regRes.status === 201, 'POST /api/v1/auth/register returns 201 Created');
      assert(regRes.body.success === true, 'Response status success === true');
      assert(regRes.body.data.token !== undefined, 'Auth JWT token returned');

      authToken = regRes.body.data.token;
      userId = regRes.body.data.user.id;
      console.log(`  ✓ Registered student user ID: ${userId}\n`);

      // ----------------------------------------------------
      // STEP 2: PDF Upload & Document Processing Pipeline
      // ----------------------------------------------------
      console.log('[STEP 2] PDF Upload & AI Analysis Pipeline Execution');
      
      const scratchDir = path.join(__dirname, '../../../scratch');
      if (!fs.existsSync(scratchDir)) {
        fs.mkdirSync(scratchDir, { recursive: true });
      }
      const testPdfPath = path.join(scratchDir, 'os_chapter4.pdf');

      // Valid PDF document stream
      const pdfHeader = `%PDF-1.4
1 0 obj <</Type /Catalog /Pages 2 0 R>> endobj
2 0 obj <</Type /Pages /Count 1 /Kids [3 0 R]>> endobj
3 0 obj <</Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources <</Font <</F1 5 0 R>>>> >> endobj
4 0 obj <</Length 120>>
stream
BT
/F1 12 Tf
72 712 Td
(Operating Systems Process Synchronization Mutex Locks Semaphores Deadlocks) Tj
ET
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
0000000414 00000 n 
trailer <</Size 6 /Root 1 0 R>>
startxref
490
%%EOF`;

      fs.writeFileSync(testPdfPath, pdfHeader);

      const uploadRes = await uploadMultipartRequest(
        '/api/v1/materials/upload',
        { title: 'Operating Systems Chapter 4' },
        'file',
        testPdfPath,
        authToken
      );

      assert(uploadRes.status === 201, 'POST /api/v1/materials/upload returns 201 Created');
      assert(uploadRes.body.success === true, 'Upload pipeline response success === true');
      assert(uploadRes.body.data.material !== undefined, 'StudyMaterial metadata returned');
      assert(uploadRes.body.data.studySession !== undefined, 'StudySession generated');
      assert(uploadRes.body.data.quiz !== undefined, 'Practice Quiz generated');

      materialId = uploadRes.body.data.material.id;
      studySessionId = uploadRes.body.data.studySession.id;
      quizId = uploadRes.body.data.quiz.id;

      assert(uploadRes.body.data.material.processingStatus === 'completed', 'Material status is completed');
      console.log(`  ✓ Material ID: ${materialId}`);
      console.log(`  ✓ Study Session ID: ${studySessionId}`);
      console.log(`  ✓ Quiz ID: ${quizId}\n`);

      // Clean up scratch temp pdf file
      if (fs.existsSync(testPdfPath)) {
        fs.unlinkSync(testPdfPath);
      }

      // ----------------------------------------------------
      // STEP 3: Fetch Study Session Content
      // ----------------------------------------------------
      console.log('[STEP 3] Fetch Generated Study Session Content');
      const sessRes = await jsonRequest('GET', `/api/v1/study-sessions/${studySessionId}`, null, authToken);

      assert(sessRes.status === 200, 'GET /api/v1/study-sessions/:id returns 200 OK');
      assert(sessRes.body.data.session.title.includes('Operating Systems'), 'Study session title contains subject title');
      assert(sessRes.body.data.session.summary.length >= 20, 'Summary is detailed');
      assert(Array.isArray(sessRes.body.data.session.keyTopics), 'Key topics array returned');
      assert(Array.isArray(sessRes.body.data.session.importantConcepts), 'Concepts array returned');
      assert(Array.isArray(sessRes.body.data.session.definitions), 'Definitions glossary returned');
      console.log();

      // ----------------------------------------------------
      // STEP 4: Fetch Quiz Questions
      // ----------------------------------------------------
      console.log('[STEP 4] Fetch Practice Quiz Questions');
      const quizRes = await jsonRequest('GET', `/api/v1/quizzes/${quizId}`, null, authToken);

      assert(quizRes.status === 200, 'GET /api/v1/quizzes/:id returns 200 OK');
      assert(quizRes.body.data.quiz.questions.length >= 1, 'Quiz contains questions');
      const questions = quizRes.body.data.quiz.questions;
      console.log(`  ✓ Quiz contains ${questions.length} generated questions\n`);

      // ----------------------------------------------------
      // STEP 5: Submit Quiz Attempt & Evaluate Weak Topics
      // ----------------------------------------------------
      console.log('[STEP 5] Submit Quiz Attempt & Evaluate Performance');
      
      // Select 1st option for first question (correct) and incorrect options for others to test weak topic calculation
      const submittedAnswers = questions.map((q, idx) => ({
        questionId: q.questionId,
        selectedOptionIndex: idx === 0 ? q.correctOptionIndex : (q.correctOptionIndex + 1) % q.options.length,
        timeSpentSeconds: 15,
      }));

      const submitRes = await jsonRequest('POST', `/api/v1/quizzes/${quizId}/attempts`, {
        answers: submittedAnswers,
        timeTakenSeconds: 45,
      }, authToken);

      assert(submitRes.status === 201, 'POST /api/v1/quizzes/:id/attempts returns 201 Created');
      assert(submitRes.body.data.attempt.score === 1, 'Score count equals 1 correct answer');
      assert(submitRes.body.data.attempt.percentage === Math.round((1 / questions.length) * 100), 'Score percentage calculated accurately');
      assert(Array.isArray(submitRes.body.data.attempt.topicWisePerformance), 'Topic performance breakdown returned');
      
      attemptId = submitRes.body.data.attempt.id;
      console.log(`  ✓ Attempt ID: ${attemptId}`);
      console.log(`  ✓ Weak Topics identified: ${submitRes.body.data.attempt.weakTopics.join(', ')}\n`);

      // ----------------------------------------------------
      // STEP 6: Retrieve Quiz Attempt Details & History
      // ----------------------------------------------------
      console.log('[STEP 6] Quiz History & Attempt Verification');
      const historyRes = await jsonRequest('GET', `/api/v1/quizzes/${quizId}/attempts`, null, authToken);
      assert(historyRes.status === 200, 'GET /api/v1/quizzes/:id/attempts returns 200 OK');
      assert(historyRes.body.data.attempts.length === 1, 'Attempt history recorded in database');

      const attemptDetailRes = await jsonRequest('GET', `/api/v1/quizzes/attempt/${attemptId}`, null, authToken);
      assert(attemptDetailRes.status === 200, 'GET /api/v1/quizzes/attempt/:attemptId returns 200 OK');
      assert(attemptDetailRes.body.data.attempt.id === attemptId, 'Attempt details retrieved successfully');
      console.log();

      // ----------------------------------------------------
      // STEP 7: Student Workspace Dashboard Overview
      // ----------------------------------------------------
      console.log('[STEP 7] Dashboard Metric Aggregation & Recent History');
      const dashRes = await jsonRequest('GET', '/api/v1/dashboard', null, authToken);

      assert(dashRes.status === 200, 'GET /api/v1/dashboard returns 200 OK');
      assert(dashRes.body.data.metrics.materialsCount === 1, 'Materials count = 1');
      assert(dashRes.body.data.metrics.sessionsCount === 1, 'Sessions count = 1');
      assert(dashRes.body.data.metrics.quizzesCount === 1, 'Quizzes count = 1');
      assert(dashRes.body.data.metrics.attemptsCount === 1, 'Attempts count = 1');
      assert(dashRes.body.data.recentMaterials.length === 1, 'Recent materials list populated');
      console.log();

    } catch (err) {
      console.error('❌ E2E Workflow Test Execution Error:', err);
      failedTests++;
    } finally {
      server.close();
      await disconnectDB();
      if (mongoServer) {
        await mongoServer.stop();
      }
    }

    console.log('====================================================');
    console.log(`  E2E WORKFLOW TEST RESULTS: ${passedTests} PASSED, ${failedTests} FAILED`);
    console.log('====================================================');

    if (failedTests > 0) {
      process.exit(1);
    }
  });
};

runWorkflowTest();
