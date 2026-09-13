const Joi = require('joi');

const submitAttemptSchema = Joi.object({
  answers: Joi.array().items(
    Joi.object({
      questionId: Joi.string().required(),
      selectedOptionIndex: Joi.number().integer().min(0).required(),
      timeSpentSeconds: Joi.number().min(0).default(0),
    })
  ).min(1).required(),
  timeTakenSeconds: Joi.number().min(0).default(0),
});

const nextQuestionSchema = Joi.object({
  currentAnswers: Joi.array().items(
    Joi.object({
      questionId: Joi.string().required(),
      selectedOptionIndex: Joi.number().integer().min(0).required(),
      timeSpentSeconds: Joi.number().min(0).default(0),
    })
  ).default([]),
});

module.exports = {
  submitAttemptSchema,
  nextQuestionSchema,
};
