const express = require('express');
const healthRoutes = require('./health.routes');
const authRoutes = require('./auth.routes');
const materialRoutes = require('./material.routes');
const studySessionRoutes = require('./studySession.routes');
const quizRoutes = require('./quiz.routes');
const dashboardRoutes = require('./dashboard.routes');

const router = express.Router();

// Mount Health Check Endpoint
router.use('/', healthRoutes);

// Mount API v1 Sub-routers
router.use('/auth', authRoutes);
router.use('/materials', materialRoutes);
router.use('/study-sessions', studySessionRoutes);
router.use('/quizzes', quizRoutes);
router.use('/dashboard', dashboardRoutes);

module.exports = router;
