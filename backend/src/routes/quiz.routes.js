const express = require('express');
const validate = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');
const { submitAttemptSchema, nextQuestionSchema } = require('../validators/quiz.validator');
const quizController = require('../controllers/quiz.controller');

const router = express.Router();

router.use(authenticate);

router.get('/attempt/:attemptId', quizController.getAttemptById);
router.get('/:id', quizController.getById);
router.post('/:id/next-question', validate(nextQuestionSchema), quizController.getNextQuestion);
router.post('/:id/attempts', validate(submitAttemptSchema), quizController.createAttempt);
router.get('/:id/attempts', quizController.getAttempts);

module.exports = router;
