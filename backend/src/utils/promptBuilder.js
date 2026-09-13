/**
 * Preply Gemini Prompt Builder Utility
 * Constructs structured, ground-truth prompts for Gemini AI with strict source grounding directives
 * and lightweight student personalization.
 */

const GROUNDING_DIRECTIVE = `SYSTEM DIRECTIVE (CRITICAL):
You are an expert academic tutor and exam preparation assistant.
Your analysis MUST be grounded strictly in the provided study material.
Do NOT invent facts, outside theories, or unsupported details not mentioned or implied by the material.

SOURCE GROUNDING DIRECTIVES:
- Associate key topics, concepts, definitions, and quiz questions with a "source" reference object when information can be reliably grounded in the text.
- Format of source reference:
  "source": { "document": "<Document Name>", "page": <Integer Page Number>, "section": "<Optional Section/Heading>" }
- If exact page reference CANNOT be reliably determined, set "page": null or set "source": null.
- CRITICAL SAFETY RULE: DO NOT invent or fabricate page numbers. Fabricating page numbers violates rounding policy. If page number is unknown, omit it or set it to null.
- Output must be strictly valid JSON matching the specified JSON schema.`;

/**
 * Maps study goal to explicit AI generation guidelines.
 */
const getGoalDirective = (studyGoal) => {
  switch (studyGoal) {
    case 'Quick Revision':
      return 'PERSONALIZATION DIRECTIVE (Quick Revision): Focus strictly on the most critical, high-impact concepts and definitions. Provide concise, punchy explanations optimized for rapid review. Prioritize high-value revision points.';
    case 'Internal Exam':
      return 'PERSONALIZATION DIRECTIVE (Internal Exam): Provide balanced coverage of core topics, key definitions, and essential concepts relevant for internal mid-term evaluations.';
    case 'Deep Understanding':
      return 'PERSONALIZATION DIRECTIVE (Deep Understanding): Provide thorough, detailed conceptual explanations emphasizing underlying mechanisms, theoretical relationships, and foundational principles mentioned in the text.';
    case 'Semester Exam':
    default:
      return 'PERSONALIZATION DIRECTIVE (Semester Exam): Synthesize comprehensive topic coverage including core definitions, key concepts, detailed exam-focused points, and high-priority revision areas for comprehensive exam preparation.';
  }
};

/**
 * Maps target difficulty to quiz difficulty description.
 */
const getDifficultyGuidance = (difficulty) => {
  switch (difficulty) {
    case 'Beginner':
      return 'Target foundational comprehension. Include straightforward questions testing direct definitions and basic concepts (Easy to Medium difficulty).';
    case 'Advanced':
      return 'Target advanced problem solving. Include complex multi-step analysis questions testing deep understanding of concepts and edge cases (Medium to Hard difficulty).';
    case 'Intermediate':
    default:
      return 'Target standard academic assessment with a balanced mix of conceptual and application questions (Medium difficulty).';
  }
};

/**
 * Builds prompt for generating structured study sessions with source grounding and personalization.
 */
const buildStudySessionPrompt = (materialText, title = 'Study Session', options = {}) => {
  const docName = options.documentName || 'Uploaded Document.pdf';
  const prefs = options.preferences || {};
  const subject = prefs.subject || options.subject || 'General';
  const studyGoal = prefs.studyGoal || options.studyGoal || 'Semester Exam';
  const studyTime = prefs.studyTime || options.studyTime || '30 minutes';
  const targetDifficulty = prefs.targetDifficulty || options.targetDifficulty || 'Intermediate';

  const goalDirective = getGoalDirective(studyGoal);

  const schema = {
    title: "string (concise study kit title reflecting preferences)",
    overview: "string (executive summary grounded in material tailored to study goal)",
    keyTopics: [
      {
        topic: "string (topic name)",
        description: "string (explanation grounded in text)",
        importance: "High | Medium | Low",
        source: {
          document: docName,
          page: 1,
          section: "string or null"
        }
      }
    ],
    importantConcepts: [
      {
        concept: "string (concept name)",
        explanation: "string (explanation)",
        examples: ["string (examples mentioned in text)"],
        source: {
          document: docName,
          page: 1,
          section: "string or null"
        }
      }
    ],
    definitions: [
      {
        term: "string (key term)",
        definition: "string (precise definition)",
        source: {
          document: docName,
          page: 1,
          section: "string or null"
        }
      }
    ],
    conceptMap: {
      nodes: [
        {
          id: "string (unique node ID e.g. node-1)",
          label: "string (name of topic, subtopic, or concept)",
          type: "topic | subtopic | concept",
          description: "string (brief explanation)"
        }
      ],
      edges: [
        {
          source: "string (valid source node ID)",
          target: "string (valid target node ID)",
          relationship: "contains | depends_on | relates_to | implements | requires"
        }
      ]
    },
    examTips: ["string (actionable exam advice grounded in text)"],
    revisionPriority: ["string (topics requiring highest study priority)"]
  };

  return `${GROUNDING_DIRECTIVE}

====================================================
1. STUDY MATERIAL CONTENT:
====================================================
Source Document Name: ${docName}
Total Pages: ${options.pageCount || 'Unknown'}

${materialText}

====================================================
2. STUDENT PERSONALIZATION PREFERENCES:
====================================================
- Subject / Course: ${subject}
- Study Goal: ${studyGoal}
- Available Study Time: ${studyTime}
- Preferred Difficulty: ${targetDifficulty}
- Preferred Title: ${title}

====================================================
3. REQUESTED OUTPUT INSTRUCTIONS:
====================================================
${goalDirective}

Extract the core academic themes, synthesize a grounded study guide tailored to the student's study goal and available study time (${studyTime}), identify key concepts with examples, define important terminology, and highlight high-priority exam revision areas.
Ground each item to its exact source page if indicated by [Page X] markers. Set "source": null if page/section cannot be determined.

====================================================
4. REQUIRED JSON OUTPUT SCHEMA:
====================================================
Respond ONLY with a valid JSON object matching the following structure:
${JSON.stringify(schema, null, 2)}`;
};

/**
 * Builds prompt for generating multiple-choice quizzes with source grounding and personalization.
 */
const buildQuizPrompt = (materialText, keyTopics = [], options = {}) => {
  const prefs = options.preferences || {};
  const studyGoal = prefs.studyGoal || options.studyGoal || 'Semester Exam';
  const targetDifficulty = prefs.targetDifficulty || options.targetDifficulty || 'Intermediate';
  const docName = options.documentName || 'Uploaded Document.pdf';

  // Determine question count from studyGoal if not explicitly specified
  let count = options.questionCount;
  if (!count) {
    if (studyGoal === 'Quick Revision') count = 3;
    else if (studyGoal === 'Internal Exam') count = 4;
    else if (studyGoal === 'Deep Understanding') count = 7;
    else count = 5; // Semester Exam default
  }

  const diffGuidance = getDifficultyGuidance(targetDifficulty);

  const schema = {
    title: "string (quiz title)",
    questions: [
      {
        question: "string (clear question text)",
        options: ["string (option 0)", "string (option 1)", "string (option 2)", "string (option 3)"],
        correctAnswer: "number (0-indexed index of correct option, e.g. 0, 1, 2, or 3)",
        explanation: "string (detailed justification citing provided text)",
        topic: "string (associated topic name)",
        difficulty: "Easy | Medium | Hard",
        source: {
          document: docName,
          page: 1,
          section: "string or null"
        }
      }
    ]
  };

  const topicsList = keyTopics.length > 0 ? keyTopics.join(', ') : 'All key concepts in text';

  return `${GROUNDING_DIRECTIVE}

====================================================
1. STUDY MATERIAL CONTENT:
====================================================
Source Document Name: ${docName}
Total Pages: ${options.pageCount || 'Unknown'}

${materialText}

====================================================
2. STUDENT PERSONALIZATION PREFERENCES:
====================================================
- Number of Questions: ${count}
- Target Goal: ${studyGoal}
- Preferred Difficulty Level: ${targetDifficulty}
- Focused Topics: ${topicsList}

====================================================
3. REQUESTED OUTPUT INSTRUCTIONS:
====================================================
Create a ${count}-question multiple-choice quiz testing comprehension of the material.
${diffGuidance}
- Each question MUST have exactly 4 plausible options.
- The 'correctAnswer' field MUST be the 0-indexed integer (0, 1, 2, or 3) indicating the correct option.
- Include a clear 'explanation' explaining why the correct answer is right based strictly on the provided text.
- Ground each question's explanation in its exact source document page if indicated by [Page X] markers.

====================================================
4. REQUIRED JSON OUTPUT SCHEMA:
====================================================
Respond ONLY with a valid JSON object matching the following structure:
${JSON.stringify(schema, null, 2)}`;
};

/**
 * Builds prompt for analyzing weak topics and generating revision recommendations.
 */
const buildWeakTopicAnalysisPrompt = (attemptData, materialText) => {
  const schema = {
    weakTopics: ["string (topics where accuracy is below 70%)"],
    strongTopics: ["string (topics where student demonstrated mastery)"],
    recommendations: [
      {
        topic: "string (topic name)",
        priority: "High | Medium | Low",
        actionPlan: "string (concrete revision action grounded in study material)",
        suggestedFocus: "string (key formula, rule, or concept to memorize)"
      }
    ]
  };

  return `${GROUNDING_DIRECTIVE}

====================================================
1. STUDY MATERIAL CONTEXT:
====================================================
${materialText}

====================================================
2. QUIZ ATTEMPT PERFORMANCE DATA:
====================================================
- Overall Score: ${attemptData.score} / ${attemptData.totalQuestions} (${attemptData.percentage}%)
- Topic Accuracy Breakdown:
${JSON.stringify(attemptData.topicWisePerformance || [], null, 2)}
- Identified Weak Topics (<70% accuracy):
${JSON.stringify(attemptData.weakTopics || [], null, 2)}

====================================================
3. REQUESTED OUTPUT INSTRUCTIONS:
====================================================
Analyze the student's quiz performance against the study material.
Identify their strong vs weak topics, and construct targeted, actionable revision recommendations for each weak topic using the provided study material.

====================================================
4. REQUIRED JSON OUTPUT SCHEMA:
====================================================
Respond ONLY with a valid JSON object matching the following structure:
${JSON.stringify(schema, null, 2)}`;
};

/**
 * Builds prompt for re-explaining a specific concept in a chosen explanation style.
 * Modes: 'Explain simply', 'Give an example', 'Give an analogy', 'Explain for an exam answer'
 */
const buildExplainConceptPrompt = (materialText, concept, existingExplanation, explanationMode) => {
  let modeInstruction = '';
  switch (explanationMode) {
    case 'Explain simply':
      modeInstruction = 'Explain this concept using simple, clear, everyday language suitable for a beginner without losing academic precision.';
      break;
    case 'Give an example':
      modeInstruction = 'Provide a realistic, step-by-step practical example illustrating how this concept works based strictly on the study material.';
      break;
    case 'Give an analogy':
      modeInstruction = 'Provide an intuitive, memorable real-world analogy explaining this concept while keeping it grounded in the core material.';
      break;
    case 'Explain for an exam answer':
      modeInstruction = 'Provide a high-scoring, structured, bullet-pointed exam response format (Key Definition, Core Principles, Key Takeaway) optimized for university exams.';
      break;
    default:
      modeInstruction = 'Re-explain this concept with alternative clarity and structure.';
  }

  const schema = {
    concept: concept,
    explanationMode: explanationMode,
    alternativeExplanation: "string (the generated alternative explanation)"
  };

  return `${GROUNDING_DIRECTIVE}

====================================================
1. ORIGINAL STUDY MATERIAL CONTEXT:
====================================================
${materialText}

====================================================
2. SELECTED CONCEPT & EXISTING EXPLANATION:
====================================================
- Concept / Topic Name: ${concept}
- Existing Explanation: ${existingExplanation || 'N/A'}
- Requested Style: ${explanationMode}

====================================================
3. REQUESTED OUTPUT INSTRUCTIONS:
====================================================
${modeInstruction}
CRITICAL SAFETY RULE: You are re-explaining the SAME concept. Do NOT introduce unrelated topics or ungrounded outside theories.

====================================================
4. REQUIRED JSON OUTPUT SCHEMA:
====================================================
Respond ONLY with a valid JSON object matching this structure:
${JSON.stringify(schema, null, 2)}`;
};

module.exports = {
  buildStudySessionPrompt,
  buildQuizPrompt,
  buildWeakTopicAnalysisPrompt,
  buildExplainConceptPrompt,
  getGoalDirective,
  getDifficultyGuidance,
};
