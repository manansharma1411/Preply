/**
 * ============================================================================
 * PREPLY DATABASE AUTOMATED TEST SUITE
 * ============================================================================
 * Tests:
 * 1. Connection & Health Diagnostic
 * 2. Schema Validation Rules & Error Reporting
 * 3. Model CRUD Operations & Virtual Field Transforms
 * 4. Relational Foreign Key Integrity & Mongoose Population
 * ============================================================================
 */

const path = require('path');
const { mongoose, connectDB, disconnectDB, getDatabaseHealth } = require('../backend/src/config/db');
const { MongoMemoryServer } = require('../backend/node_modules/mongodb-memory-server');
const config = require('../backend/src/config/env');
const User = require('../backend/src/models/User');
const StudyMaterial = require('../backend/src/models/StudyMaterial');
const StudySession = require('../backend/src/models/StudySession');
const Quiz = require('../backend/src/models/Quiz');
const QuizAttempt = require('../backend/src/models/QuizAttempt');

let mongoServer;
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

const runDatabaseTestSuite = async () => {
  console.log('====================================================');
  console.log('  PREPLY DATABASE SUITE VERIFICATION');
  console.log('====================================================\n');

  // Test 1: Connection & Health Check
  console.log('[TEST GROUP 1] Database Connection & Diagnostics');
  let conn = await connectDB();

  if (!conn || mongoose.connection.readyState !== 1) {
    console.log('[DB Test] Local MongoDB offline. Initializing in-memory MongoMemoryServer...');
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    conn = await mongoose.connect(uri);
  }

  const health = getDatabaseHealth();
  assert(conn !== null, 'MongoDB connection established successfully');
  assert(health.connected === true, 'Health check reports status: connected');
  assert(health.status === 'connected', 'Health status string equals "connected"');
  console.log();

  try {
    // Test 2: Schema Validation Checks
    console.log('[TEST GROUP 2] Schema Validation & Constraints');
    
    // 2a. Invalid Email Validation
    let invalidEmailFailed = false;
    try {
      const invalidUser = new User({
        name: 'Invalid Email User',
        email: 'invalid-email-format',
        passwordHash: 'hash123',
      });
      await invalidUser.validate();
    } catch (err) {
      invalidEmailFailed = err.errors && err.errors.email !== undefined;
    }
    assert(invalidEmailFailed, 'Schema rejects invalid email format (invalid-email-format)');

    // 2b. Out-of-Range Percentage Validation
    let invalidPercentageFailed = false;
    try {
      const invalidAttempt = new QuizAttempt({
        score: 10,
        percentage: 150, // Max 100
      });
      await invalidAttempt.validate();
    } catch (err) {
      invalidPercentageFailed = err.errors && err.errors.percentage !== undefined;
    }
    assert(invalidPercentageFailed, 'Schema rejects percentage out of bounds (150%)');
    console.log();

    // Test 3: Model CRUD Operations & Relationships
    console.log('[TEST GROUP 3] Model CRUD & Population Verification');

    // 3a. User CRUD
    const testUser = await User.create({
      name: 'Test Student',
      email: `test.student.${Date.now()}@university.edu`,
      passwordHash: '$2b$10$hashedTestPasswordForUnitTestingOnly',
      preferences: { studyPace: 'intensive' },
    });
    assert(testUser.id !== undefined, 'User created and virtual `id` generated');
    assert(testUser.toJSON().passwordHash === undefined, 'User `toJSON` omits `passwordHash` secret');

    // 3b. StudyMaterial CRUD
    const testMaterial = await StudyMaterial.create({
      userId: testUser._id,
      title: 'Database Systems Chapter 5 - Relational Algebra',
      originalFileName: 'db_ch5.pdf',
      fileType: 'pdf',
      fileSize: 1024000,
      storageRef: '/uploads/test/db_ch5.pdf',
      processingStatus: 'completed',
      extractedText: 'Relational algebra is a procedural query language. The six basic operators are select, project, union, set difference, cartesian product, and rename.',
      subject: 'Database Systems',
    });
    assert(testMaterial.id !== undefined, 'StudyMaterial created with reference to User');

    // 3c. StudySession CRUD
    const testSession = await StudySession.create({
      userId: testUser._id,
      materialId: testMaterial._id,
      title: 'Study Guide: Relational Algebra',
      summary: 'Relational algebra forms the mathematical foundation for SQL queries. Basic operators include projection and selection.',
      keyTopics: [{ topic: 'Relational Algebra', description: 'Procedural query language', importance: 'High' }],
    });
    assert(testSession.materialId.toString() === testMaterial._id.toString(), 'StudySession linked to StudyMaterial');

    // 3d. Quiz CRUD
    const testQuiz = await Quiz.create({
      userId: testUser._id,
      materialId: testMaterial._id,
      studySessionId: testSession._id,
      title: 'Relational Algebra Quiz',
      difficulty: 'medium',
      questions: [
        {
          questionId: 'q1',
          text: 'Which operator selects tuples that satisfy a given predicate?',
          options: ['Projection (π)', 'Selection (σ)', 'Join (⋈)', 'Union (∪)'],
          correctOptionIndex: 1,
          explanation: 'Selection operator σ filters rows matching the boolean condition.',
          topicTag: 'Relational Algebra',
        },
      ],
    });
    assert(testQuiz.totalQuestions === 1, 'Quiz virtual `totalQuestions` calculated correctly');

    // 3e. QuizAttempt CRUD
    const testAttempt = await QuizAttempt.create({
      userId: testUser._id,
      quizId: testQuiz._id,
      materialId: testMaterial._id,
      answers: [{ questionId: 'q1', selectedOptionIndex: 1, isCorrect: true, timeSpentSeconds: 12 }],
      score: 1,
      percentage: 100,
      topicWisePerformance: [{ topicTag: 'Relational Algebra', totalQuestions: 1, correctAnswers: 1, accuracyPercentage: 100 }],
      weakTopics: [],
    });
    assert(testAttempt.percentage === 100, 'QuizAttempt recorded 100% score');

    // 3f. Relationship Population Test
    const populatedAttempt = await QuizAttempt.findById(testAttempt._id)
      .populate('userId', 'name email')
      .populate('quizId', 'title difficulty')
      .populate('materialId', 'title originalFileName');

    assert(populatedAttempt.userId.name === 'Test Student', 'Population of User ref returned correct name');
    assert(populatedAttempt.quizId.title === 'Relational Algebra Quiz', 'Population of Quiz ref returned correct title');
    assert(populatedAttempt.materialId.originalFileName === 'db_ch5.pdf', 'Population of Material ref returned correct filename');
    console.log();

    // Clean up test entities
    await QuizAttempt.findByIdAndDelete(testAttempt._id);
    await Quiz.findByIdAndDelete(testQuiz._id);
    await StudySession.findByIdAndDelete(testSession._id);
    await StudyMaterial.findByIdAndDelete(testMaterial._id);
    await User.findByIdAndDelete(testUser._id);
    console.log('[CLEANUP] Cleaned up temporary test documents.\n');

  } catch (err) {
    console.error('❌ Test execution error:', err);
    failedTests++;
  } finally {
    await disconnectDB();
    if (mongoServer) {
      await mongoServer.stop();
    }
  }

  console.log('====================================================');
  console.log(`  TEST RESULTS: ${passedTests} PASSED, ${failedTests} FAILED`);
  console.log('====================================================');

  if (failedTests > 0) {
    process.exit(1);
  }
};

runDatabaseTestSuite();
