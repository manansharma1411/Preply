const Joi = require('joi');

const createStudySessionSchema = Joi.object({
  materialId: Joi.string().hex().length(24).required().messages({
    'string.length': 'Invalid StudyMaterial ID format',
  }),
  title: Joi.string().trim().max(200).required(),
  summary: Joi.string().min(20).required(),
  keyTopics: Joi.array().items(
    Joi.object({
      topic: Joi.string().required(),
      description: Joi.string().required(),
      importance: Joi.string().valid('High', 'Medium', 'Low').default('Medium'),
    })
  ).default([]),
  importantConcepts: Joi.array().items(
    Joi.object({
      concept: Joi.string().required(),
      explanation: Joi.string().required(),
      examples: Joi.array().items(Joi.string()).default([]),
    })
  ).default([]),
  definitions: Joi.array().items(
    Joi.object({
      term: Joi.string().required(),
      definition: Joi.string().required(),
    })
  ).default([]),
  examTips: Joi.array().items(Joi.string()).default([]),
  recommendedRevisionAreas: Joi.array().items(Joi.string()).default([]),
});

const explainConceptSchema = Joi.object({
  concept: Joi.string().trim().required().messages({
    'any.required': 'Selected concept name is required',
  }),
  explanationMode: Joi.string()
    .valid('Explain simply', 'Give an example', 'Give an analogy', 'Explain for an exam answer')
    .required()
    .messages({
      'any.only': 'Invalid explanation mode selected',
    }),
  existingExplanation: Joi.string().allow('', null).optional(),
});

module.exports = {
  createStudySessionSchema,
  explainConceptSchema,
};
