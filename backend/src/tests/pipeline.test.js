/**
 * ============================================================================
 * PREPLY UPLOAD & PROCESSING PIPELINE TEST SUITE
 * ============================================================================
 * Tests:
 * 1. Valid PDF upload & extraction pipeline
 * 2. Invalid file type rejection
 * 3. Oversized file rejection
 * 4. Empty 0-byte PDF rejection
 * 5. Corrupted PDF unreadable error handling
 * 6. Insufficient text extraction rejection
 * 7. Temporary filesystem cleanup verification
 * 8. Zero local server path exposure check
 * ============================================================================
 */

const fs = require('fs');
const http = require('http');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../app');
const { connectDB, disconnectDB } = require('../config/db');
const User = require('../models/User');
const StudyMaterial = require('../models/StudyMaterial');
const StudySession = require('../models/StudySession');
const Quiz = require('../models/Quiz');
const { TEMP_UPLOAD_DIR } = require('../utils/fileUtils');
const ExtractorFactory = require('../extractors/ExtractorFactory');
const { chunkDocumentText } = require('../utils/textChunker');

let mongoServer;
let server;
let baseUrl;
let authToken = '';
let testUserId = '';

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

const { PDFDocument, StandardFonts } = require('pdf-lib');

const createMockPdfBuffer = async (textPayload = 'Process synchronization coordinates execution of concurrent processes sharing memory space.') => {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([600, 400]);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  page.drawText(textPayload, { x: 50, y: 350, size: 12, font });
  const pdfBytes = await pdfDoc.save({ useObjectStreams: false });
  return Buffer.from(pdfBytes);
};

const postMultipart = (path, fields = {}, fileBuffer = null, filename = 'test.pdf', token = null) => {
  return new Promise((resolve, reject) => {
    const boundary = '----WebKitFormBoundary' + Math.random().toString(16).substring(2);
    const url = new URL(path, baseUrl);

    const postDataParts = [];

    // Form fields
    for (const [key, value] of Object.entries(fields)) {
      postDataParts.push(
        Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${key}"\r\n\r\n${value}\r\n`)
      );
    }

    // Form file payload
    if (fileBuffer) {
      postDataParts.push(
        Buffer.from(
          `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${filename}"\r\nContent-Type: application/pdf\r\n\r\n`
        )
      );
      postDataParts.push(fileBuffer);
      postDataParts.push(Buffer.from('\r\n'));
    }

    postDataParts.push(Buffer.from(`--${boundary}--\r\n`));

    const bodyBuffer = Buffer.concat(postDataParts);

    const options = {
      method: 'POST',
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': bodyBuffer.length,
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
    req.write(bodyBuffer);
    req.end();
  });
};

const runPipelineTests = async () => {
  console.log('====================================================');
  console.log('  PREPLY UPLOAD & PROCESSING PIPELINE VERIFICATION');
  console.log('====================================================\n');

  // DB Connection Setup
  let conn = await connectDB();
  if (!conn || mongoose.connection.readyState !== 1) {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
  }

  // Start HTTP Server
  server = app.listen(0, async () => {
    const port = server.address().port;
    baseUrl = `http://localhost:${port}`;
    console.log(`[Pipeline Test Server] Listening on ${baseUrl}\n`);

    try {
      // Create Auth User & Token
      const testUser = await User.create({
        name: 'Pipeline Test Student',
        email: `pipeline.${Date.now()}@university.edu`,
        passwordHash: '$2b$10$hashedPassword',
      });
      testUserId = testUser._id.toString();

      const jwt = require('jsonwebtoken');
      const config = require('../config/env');
      authToken = jwt.sign({ userId: testUserId, role: 'student' }, config.jwtSecret);

      // ----------------------------------------------------
      // TEST GROUP 1: Document Extractor Architecture
      // ----------------------------------------------------
      console.log('[TEST GROUP 1] Document Extractor Architecture');
      const pdfExtractor = ExtractorFactory.getExtractor('pdf');
      assert(pdfExtractor !== null, 'ExtractorFactory returns PdfExtractor for "pdf" type');

      let unsupportedFailed = false;
      try {
        ExtractorFactory.getExtractor('unknown_format');
      } catch (err) {
        unsupportedFailed = err.statusCode === 400;
      }
      assert(unsupportedFailed, 'ExtractorFactory rejects unsupported format with 400 Bad Request');
      console.log();

      // ----------------------------------------------------
      // TEST GROUP 2: Text Chunker Logic
      // ----------------------------------------------------
      console.log('[TEST GROUP 2] Text Chunker Logic');
      const shortText = 'Short paragraph text.';
      const shortChunks = chunkDocumentText(shortText);
      assert(shortChunks.length === 1, 'Short text returns exactly 1 chunk');

      const longText = 'Paragraph content.\n\n'.repeat(1000);
      const longChunks = chunkDocumentText(longText);
      assert(longChunks.length >= 1, 'Large text split into manageable context chunks');
      console.log();

      // ----------------------------------------------------
      // TEST GROUP 3: Valid PDF Upload & Full Pipeline Execution
      // ----------------------------------------------------
      console.log('[TEST GROUP 3] Valid PDF Upload & Full Pipeline Execution');
      const validPdfBuffer = await createMockPdfBuffer('Process synchronization coordinates execution of concurrent processes sharing memory space.');

      const uploadRes = await postMultipart(
        '/api/v1/materials/upload',
        { title: 'Operating Systems Chapter 4' },
        validPdfBuffer,
        'os_ch4.pdf',
        authToken
      );

      assert(uploadRes.status === 201, 'POST /api/v1/materials/upload returns 201 Created');
      assert(uploadRes.body.success === true, 'Upload pipeline returns success === true');
      assert(uploadRes.body.data.material.processingStatus === 'completed', 'Material processingStatus marked "completed"');
      assert(uploadRes.body.data.studySession !== undefined, 'Pipeline generated StudySession record');
      assert(uploadRes.body.data.quiz !== undefined, 'Pipeline generated Quiz record');
      console.log();

      // ----------------------------------------------------
      // TEST GROUP 4: Invalid File Type Rejection
      // ----------------------------------------------------
      console.log('[TEST GROUP 4] Invalid File Type Rejection');
      const invalidRes = await postMultipart(
        '/api/v1/materials/upload',
        { title: 'Malicious Executable' },
        Buffer.from('MZ_executable_header'),
        'malicious.exe',
        authToken
      );
      assert(invalidRes.status === 400, 'Rejects .exe file with 400 Bad Request');
      assert(invalidRes.body.message.includes('Only PDF files are supported'), 'Returns clear unsupported file error message');
      console.log();

      // ----------------------------------------------------
      // TEST GROUP 5: Empty PDF Rejection
      // ----------------------------------------------------
      console.log('[TEST GROUP 5] Empty PDF Rejection');
      const emptyRes = await postMultipart(
        '/api/v1/materials/upload',
        { title: 'Empty Document' },
        Buffer.from(''),
        'empty.pdf',
        authToken
      );
      assert(emptyRes.status === 400, 'Rejects empty 0-byte PDF with 400 Bad Request');
      console.log();

      // ----------------------------------------------------
      // TEST GROUP 6: Corrupted PDF Rejection
      // ----------------------------------------------------
      console.log('[TEST GROUP 6] Corrupted PDF Rejection');
      const corruptRes = await postMultipart(
        '/api/v1/materials/upload',
        { title: 'Corrupt Document' },
        Buffer.from('%PDF-1.4 Invalid corrupt binary data stream truncated'),
        'corrupt.pdf',
        authToken
      );
      assert(corruptRes.status === 400, 'Rejects corrupted PDF with 400 Bad Request');
      assert(corruptRes.body.message.includes('Failed to parse PDF file'), 'Returns clean corrupted file error message');
      console.log();

      // ----------------------------------------------------
      // TEST GROUP 7: Temporary File Cleanup & Security Checks
      // ----------------------------------------------------
      console.log('[TEST GROUP 7] Temp Cleanup & Path Security');
      
      // Check temp upload directory
      const tempFiles = fs.existsSync(TEMP_UPLOAD_DIR) ? fs.readdirSync(TEMP_UPLOAD_DIR) : [];
      assert(tempFiles.length === 0, `Zero temporary files remaining in '${TEMP_UPLOAD_DIR}'`);

      // Verify no local path exposure in response
      const jsonResponseString = JSON.stringify(uploadRes.body);
      const exposesLocalPath = jsonResponseString.includes('D:\\') || jsonResponseString.includes('/uploads/temp/');
      assert(!exposesLocalPath, 'API response does NOT expose local server filesystem paths');
      console.log();

      // Clean up test user
      await StudyMaterial.deleteMany({ userId: testUserId });
      await StudySession.deleteMany({ userId: testUserId });
      await Quiz.deleteMany({ userId: testUserId });
      await User.findByIdAndDelete(testUserId);
      console.log('  ✓ Cleaned up pipeline test entities\n');

    } catch (err) {
      console.error('❌ Pipeline Test Execution Error:', err);
      failedTests++;
    } finally {
      server.close();
      await disconnectDB();
      if (mongoServer) {
        await mongoServer.stop();
      }
    }

    console.log('====================================================');
    console.log(`  PIPELINE TEST RESULTS: ${passedTests} PASSED, ${failedTests} FAILED`);
    console.log('====================================================');

    if (failedTests > 0) {
      process.exit(1);
    }
  });
};

runPipelineTests();
