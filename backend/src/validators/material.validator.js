const Joi = require('joi');

const createMaterialSchema = Joi.object({
  title: Joi.string().trim().max(200).required(),
  originalFileName: Joi.string().trim().max(255).required(),
  fileType: Joi.string().valid('pdf', 'docx', 'pptx', 'txt').default('pdf'),
  fileSize: Joi.number().positive().max(52428800).required(),
  storageRef: Joi.string().trim().required(),
  extractedText: Joi.string().min(10).required(),
  subject: Joi.string().trim().default('General'),
  metadata: Joi.object({
    pageCount: Joi.number().min(0).default(0),
    wordCount: Joi.number().min(0).default(0),
    characterCount: Joi.number().min(0).default(0),
    mimeType: Joi.string().default('application/pdf'),
    checksum: Joi.string().allow('').default(''),
  }).default({}),
});

const queryMaterialsSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  search: Joi.string().trim().allow(''),
  subject: Joi.string().trim().allow(''),
});

module.exports = {
  createMaterialSchema,
  queryMaterialsSchema,
};
