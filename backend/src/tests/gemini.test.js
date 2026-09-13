/**
 * ============================================================================
 * PREPLY GEMINI AI INTEGRATION AUTOMATED TEST SUITE
 * ============================================================================
 * Tests:
 * 1. Prompt Builder structure & grounding directives
 * 2. Response Sanitizer & Markdown fence removal
 * 3. Response Schema Validation (Study Session, Quiz, Weak Topics)
 * 4. Gemini Service execution & structured output generation
 * ============================================================================
 */

const {
  buildStudySessionPrompt,
  buildQuizPrompt,
  buildWeakTopicAnalysisPrompt,
} = require('../utils/promptBuilder');
const {
  sanitizeJsonResponse,
  validateStudySessionResponse,
  validateQuizResponse,
  validateWeakTopicAnalysisResponse,
} = require('../utils/aiResponseValidator');
const geminiService = require('../services/geminiService');

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

const runGeminiTestSuite = async () => {
  console.log('====================================================');
  console.log('  PREPLY GEMINI AI INTEGRATION VERIFICATION');
  console.log('====================================================\n');

  try {
    // ----------------------------------------------------
    // TEST GROUP 1: Prompt Builder Structure
    // ----------------------------------------------------
    console.log('[TEST GROUP 1] Prompt Builder Structure & Grounding');

    const sampleText = 'Process synchronization ensures concurrent processes share data safely without entering race conditions.';
    const sessionPrompt = buildStudySessionPrompt(sampleText, 'OS Sync');
    assert(sessionPrompt.includes('SYSTEM DIRECTIVE (CRITICAL)'), 'Study Session prompt includes grounding directive');
    assert(sessionPrompt.includes(sampleText), 'Study Session prompt embeds material content');
    assert(sessionPrompt.includes('REQUIRED JSON OUTPUT SCHEMA'), 'Study Session prompt specifies JSON schema');

    const quizPrompt = buildQuizPrompt(sampleText, ['Mutex'], { questionCount: 3 });
    assert(quizPrompt.includes('Number of Questions: 3'), 'Quiz prompt embeds options count');
    assert(quizPrompt.includes('correctAnswer'), 'Quiz prompt defines correctAnswer field');

    const weakPrompt = buildWeakTopicAnalysisPrompt({ score: 1, totalQuestions: 2, percentage: 50, weakTopics: ['Mutex'] }, sampleText);
    assert(weakPrompt.includes('Weak Topics'), 'Weak Topic prompt embeds attempt statistics');
    console.log();

    // ----------------------------------------------------
    // TEST GROUP 2: Response Sanitizer & Markdown Fence Stripping
    // ----------------------------------------------------
    console.log('[TEST GROUP 2] Response Sanitizer & Markdown Fence Removal');

    const markdownFenceText = `\`\`\`json
{
  "title": "Cleaned Title",
  "overview": "Cleaned overview text"
}
\`\`\``;

    const sanitized = sanitizeJsonResponse(markdownFenceText);
    assert(sanitized.title === 'Cleaned Title', 'Sanitizer strips ```json markdown code fences cleanly');

    const surroundedText = `Here is the requested JSON output:
{
  "status": "ok"
}
Hope this helps!`;
    const cleanedSurrounded = sanitizeJsonResponse(surroundedText);
    assert(cleanedSurrounded.status === 'ok', 'Sanitizer extracts inner JSON object from surrounding prose text');
    console.log();

    // ----------------------------------------------------
    // TEST GROUP 3: Schema Validation Utilities
    // ----------------------------------------------------
    console.log('[TEST GROUP 3] Schema Validation & Field Normalization');

    const rawQuizResponse = JSON.stringify({
      title: 'Operating Systems Exam',
      questions: [
        {
          question: 'What is a mutex?',
          options: ['Lock', 'Key', 'File', 'Socket'],
          correctAnswer: "0", // String format needing normalization to integer 0
          explanation: 'Mutex stands for mutual exclusion lock object.',
          topic: 'Synchronization',
          difficulty: 'Medium',
        },
      ],
    });

    const validatedQuiz = validateQuizResponse(rawQuizResponse);
    assert(validatedQuiz.questions[0].correctAnswer === 0, 'Quiz validator normalizes string correctAnswer "0" to integer 0');
    assert(validatedQuiz.questions[0].options.length === 4, 'Quiz validator preserves options array');

    const rawStudySession = JSON.stringify({
      title: 'OS Chapter 4 Guide',
      overview: 'Detailed overview of process synchronization.',
      keyTopics: [{ topic: 'Mutex', description: 'Lock mechanism', importance: 'High' }],
    });
    const validatedSession = validateStudySessionResponse(rawStudySession);
    assert(validatedSession.keyTopics[0].topic === 'Mutex', 'Study session validator parses keyTopics array');

    const rawWeakAnalysis = JSON.stringify({
      weakTopics: ['Deadlocks'],
      recommendations: [{ topic: 'Deadlocks', priority: 'High', actionPlan: 'Review conditions', suggestedFocus: 'Circular Wait' }],
    });
    const validatedWeak = validateWeakTopicAnalysisResponse(rawWeakAnalysis);
    assert(validatedWeak.weakTopics[0] === 'Deadlocks', 'Weak topic validator parses weakTopics array');
    console.log();

    // ----------------------------------------------------
    // TEST GROUP 4: Gemini Service End-to-End Execution
    // ----------------------------------------------------
    console.log('[TEST GROUP 4] Gemini Service End-to-End Generation');

    const controlledMaterial = 'Process synchronization coordinates execution of concurrent processes sharing data. Mutex locks and semaphores provide mutual exclusion to prevent race conditions in critical sections.';

    // 4a. Generate Study Session
    const studySessionResult = await geminiService.generateStudySession(controlledMaterial, 'Process Synchronization');
    assert(studySessionResult.title !== undefined, 'GeminiService returns study session title');
    assert(Array.isArray(studySessionResult.keyTopics), 'GeminiService returns keyTopics array');

    // 4b. Generate Quiz
    const quizResult = await geminiService.generateQuiz(controlledMaterial, ['Process Synchronization'], { questionCount: 2 });
    assert(Array.isArray(quizResult.questions), 'GeminiService returns questions array');
    assert(typeof quizResult.questions[0].correctAnswer === 'number', 'Quiz question correctAnswer is a number');

    // 4c. Weak Topic Analysis
    const weakTopicResult = await geminiService.analyzeWeakTopics(
      { score: 1, totalQuestions: 2, percentage: 50, weakTopics: ['Deadlock Handling'] },
      controlledMaterial
    );
    assert(Array.isArray(weakTopicResult.recommendations), 'GeminiService returns recommendations array');
    console.log();

  } catch (err) {
    console.error('❌ Gemini Test Suite Error:', err);
    failedTests++;
  }

  console.log('====================================================');
  console.log(`  GEMINI TEST RESULTS: ${passedTests} PASSED, ${failedTests} FAILED`);
  console.log('====================================================');

  if (failedTests > 0) {
    process.exit(1);
  }
};

runGeminiTestSuite();
