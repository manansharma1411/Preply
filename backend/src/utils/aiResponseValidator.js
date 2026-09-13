const Joi = require('joi');
const ApiError = require('./ApiError');

/**
 * Strips markdown code block fences and trailing whitespace from raw AI text.
 */
const sanitizeJsonResponse = (rawText) => {
  if (!rawText || typeof rawText !== 'string') {
    throw ApiError.internal('Empty response received from AI model');
  }

  let cleaned = rawText.trim();

  cleaned = cleaned.replace(/^```(?:json)?\s*/i, '');
  cleaned = cleaned.replace(/\s*```$/i, '');
  cleaned = cleaned.trim();

  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');

  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    cleaned = cleaned.substring(firstBrace, lastBrace + 1);
  }

  try {
    return JSON.parse(cleaned);
  } catch (err) {
    console.warn(`[AI Validator Warning] Initial JSON parse failed. Raw snippet: "${cleaned.substring(0, 150)}..."`);
    throw ApiError.internal('AI model returned invalid JSON structure', [err.message]);
  }
};

/**
 * Normalizes and validates source metadata, nullifying fabricated/out-of-bounds page numbers.
 */
const cleanSourceReference = (source, maxPageCount = null) => {
  if (!source || typeof source !== 'object') return null;

  const doc = typeof source.document === 'string' && source.document.trim() ? source.document.trim() : null;
  let page = typeof source.page === 'number' && Number.isInteger(source.page) && source.page >= 1 ? source.page : null;
  const section = typeof source.section === 'string' && source.section.trim() ? source.section.trim() : null;

  if (page !== null && maxPageCount !== null && typeof maxPageCount === 'number' && maxPageCount > 0) {
    if (page > maxPageCount) {
      console.warn(`[AI Validator Warning] Fabricated page number detected (${page} > ${maxPageCount}). Nullifying page reference.`);
      page = null;
    }
  }

  if (!doc && !page && !section) return null;

  return {
    document: doc || 'Uploaded Document',
    page,
    section: section || null,
  };
};

/**
 * Validates and normalizes Concept Map graph output.
 * Ensures valid nodes, valid directed edges (no dangling references, no self-loops),
 * and provides auto-fallback generation if AI graph is missing or empty.
 */
const cleanConceptMap = (rawMap, keyTopics = [], importantConcepts = []) => {
  const validNodes = [];
  const validNodeIds = new Set();

  if (rawMap && typeof rawMap === 'object' && Array.isArray(rawMap.nodes)) {
    rawMap.nodes.forEach((n, idx) => {
      if (!n || typeof n !== 'object') return;
      const id = typeof n.id === 'string' && n.id.trim() ? n.id.trim() : `node-${idx + 1}`;
      const label = typeof n.label === 'string' && n.label.trim() ? n.label.trim() : null;
      if (!label) return;

      const type = ['topic', 'subtopic', 'concept'].includes(n.type) ? n.type : 'concept';
      const description = typeof n.description === 'string' ? n.description.trim() : '';

      if (!validNodeIds.has(id)) {
        validNodes.push({ id, label, type, description });
        validNodeIds.add(id);
      }
    });
  }

  const validEdges = [];

  if (rawMap && typeof rawMap === 'object' && Array.isArray(rawMap.edges)) {
    rawMap.edges.forEach((e) => {
      if (!e || typeof e !== 'object') return;
      const source = typeof e.source === 'string' ? e.source.trim() : null;
      const target = typeof e.target === 'string' ? e.target.trim() : null;

      if (!source || !target) return;
      // Edge validation: source & target must exist in validNodeIds AND source !== target
      if (!validNodeIds.has(source) || !validNodeIds.has(target) || source === target) {
        return;
      }

      const relationship = typeof e.relationship === 'string' && e.relationship.trim()
        ? e.relationship.trim().toLowerCase()
        : 'relates_to';

      validEdges.push({ source, target, relationship });
    });
  }

  // Fallback: If 0 valid nodes, auto-construct graph from keyTopics & importantConcepts
  if (validNodes.length === 0) {
    (keyTopics || []).forEach((kt, idx) => {
      const topicId = `topic-${idx + 1}`;
      const label = kt.topic || `Topic ${idx + 1}`;
      validNodes.push({
        id: topicId,
        label,
        type: 'topic',
        description: kt.description || '',
      });
      validNodeIds.add(topicId);
    });

    (importantConcepts || []).forEach((ic, idx) => {
      const conceptId = `concept-${idx + 1}`;
      const label = ic.concept || `Concept ${idx + 1}`;
      validNodes.push({
        id: conceptId,
        label,
        type: 'concept',
        description: ic.explanation || '',
      });
      validNodeIds.add(conceptId);

      if ((keyTopics || []).length > 0) {
        validEdges.push({
          source: 'topic-1',
          target: conceptId,
          relationship: 'contains',
        });
      }
    });
  }

  return {
    nodes: validNodes,
    edges: validEdges,
  };
};

const sourceJoiSchema = Joi.object({
  document: Joi.string().allow(null, '').optional(),
  page: Joi.number().integer().min(1).allow(null).optional(),
  section: Joi.string().allow(null, '').optional(),
}).allow(null).optional();

const conceptMapJoiSchema = Joi.object({
  nodes: Joi.array().items(
    Joi.object({
      id: Joi.string().required(),
      label: Joi.string().required(),
      type: Joi.string().valid('topic', 'subtopic', 'concept').default('concept'),
      description: Joi.string().allow('').optional(),
    })
  ).default([]),
  edges: Joi.array().items(
    Joi.object({
      source: Joi.string().required(),
      target: Joi.string().required(),
      relationship: Joi.string().default('relates_to'),
    })
  ).default([]),
}).default({ nodes: [], edges: [] });

// Joi Schemas for Output Validation
const studySessionResponseSchema = Joi.object({
  title: Joi.string().required().default('Generated Study Session'),
  overview: Joi.string().required().default('Comprehensive overview of material.'),
  keyTopics: Joi.array().items(
    Joi.object({
      topic: Joi.string().required(),
      description: Joi.string().required(),
      importance: Joi.string().valid('High', 'Medium', 'Low').default('Medium'),
      source: sourceJoiSchema,
    })
  ).default([]),
  importantConcepts: Joi.array().items(
    Joi.object({
      concept: Joi.string().required(),
      explanation: Joi.string().required(),
      examples: Joi.array().items(Joi.string()).default([]),
      source: sourceJoiSchema,
    })
  ).default([]),
  definitions: Joi.array().items(
    Joi.object({
      term: Joi.string().required(),
      definition: Joi.string().required(),
      source: sourceJoiSchema,
    })
  ).default([]),
  conceptMap: conceptMapJoiSchema,
  examTips: Joi.array().items(Joi.string()).default([]),
  revisionPriority: Joi.array().items(Joi.string()).default([]),
});

const quizQuestionResponseSchema = Joi.object({
  question: Joi.string().required(),
  options: Joi.array().items(Joi.string()).min(2).max(6).required(),
  correctAnswer: Joi.number().integer().min(0).max(5).required(),
  explanation: Joi.string().required(),
  topic: Joi.string().required().default('General'),
  difficulty: Joi.string().valid('Easy', 'Medium', 'Hard').default('Medium'),
  source: sourceJoiSchema,
});

const quizResponseSchema = Joi.object({
  title: Joi.string().required().default('Practice Quiz'),
  questions: Joi.array().items(quizQuestionResponseSchema).min(1).required(),
});

const weakTopicAnalysisSchema = Joi.object({
  weakTopics: Joi.array().items(Joi.string()).default([]),
  strongTopics: Joi.array().items(Joi.string()).default([]),
  recommendations: Joi.array().items(
    Joi.object({
      topic: Joi.string().required(),
      priority: Joi.string().valid('High', 'Medium', 'Low').default('Medium'),
      actionPlan: Joi.string().required(),
      suggestedFocus: Joi.string().required(),
    })
  ).default([]),
});

const validateStudySessionResponse = (rawText, maxPageCount = null) => {
  const json = sanitizeJsonResponse(rawText);
  const { error, value } = studySessionResponseSchema.validate(json, { abortEarly: false, stripUnknown: true });

  if (error) {
    console.warn('[AI Validator Warning] Study session schema validation warning:', error.message);
  }

  const result = value || json;

  if (Array.isArray(result.keyTopics)) {
    result.keyTopics = result.keyTopics.map((item) => ({ ...item, source: cleanSourceReference(item.source, maxPageCount) }));
  }
  if (Array.isArray(result.importantConcepts)) {
    result.importantConcepts = result.importantConcepts.map((item) => ({ ...item, source: cleanSourceReference(item.source, maxPageCount) }));
  }
  if (Array.isArray(result.definitions)) {
    result.definitions = result.definitions.map((item) => ({ ...item, source: cleanSourceReference(item.source, maxPageCount) }));
  }

  result.conceptMap = cleanConceptMap(result.conceptMap, result.keyTopics, result.importantConcepts);

  return result;
};

const validateQuizResponse = (rawText, maxPageCount = null) => {
  const json = sanitizeJsonResponse(rawText);

  if (json && Array.isArray(json.questions)) {
    json.questions = json.questions.map((q) => {
      if (typeof q.correctAnswer === 'string') {
        const parsed = parseInt(q.correctAnswer, 10);
        q.correctAnswer = isNaN(parsed) ? 0 : parsed;
      }
      return q;
    });
  }

  const { error, value } = quizResponseSchema.validate(json, { abortEarly: false, stripUnknown: true });

  if (error) {
    console.warn('[AI Validator Warning] Quiz schema validation warning:', error.message);
  }

  const result = value || json;

  if (Array.isArray(result.questions)) {
    result.questions = result.questions.map((q) => ({ ...q, source: cleanSourceReference(q.source, maxPageCount) }));
  }

  return result;
};

const explainResponseSchema = Joi.object({
  concept: Joi.string().required(),
  explanationMode: Joi.string().required(),
  alternativeExplanation: Joi.string().required().min(10),
});

const validateWeakTopicAnalysisResponse = (rawText) => {
  const json = sanitizeJsonResponse(rawText);
  const { error, value } = weakTopicAnalysisSchema.validate(json, { abortEarly: false, stripUnknown: true });

  if (error) {
    console.warn('[AI Validator Warning] Weak topic schema validation warning:', error.message);
  }

  return value || json;
};

const validateExplainResponse = (rawText) => {
  const json = sanitizeJsonResponse(rawText);
  const { error, value } = explainResponseSchema.validate(json, { abortEarly: false, stripUnknown: true });

  if (error) {
    console.warn('[AI Validator Warning] Explain response validation warning:', error.message);
  }

  return value || json;
};

module.exports = {
  sanitizeJsonResponse,
  cleanSourceReference,
  cleanConceptMap,
  validateStudySessionResponse,
  validateQuizResponse,
  validateWeakTopicAnalysisResponse,
  validateExplainResponse,
};
