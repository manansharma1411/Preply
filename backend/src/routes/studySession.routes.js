const express = require('express');
const validate = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');
const { explainRateLimiter } = require('../middleware/rateLimiter');
const { createStudySessionSchema, explainConceptSchema } = require('../validators/studySession.validator');
const studySessionController = require('../controllers/studySession.controller');

const router = express.Router();

router.use(authenticate);

router.post('/', validate(createStudySessionSchema), studySessionController.create);
router.get('/', studySessionController.getAll);
router.get('/:id', studySessionController.getById);

router.post(
  '/:id/explain',
  explainRateLimiter,
  validate(explainConceptSchema),
  studySessionController.explainConcept
);

module.exports = router;
