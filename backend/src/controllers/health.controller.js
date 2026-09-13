const { getSystemHealth } = require('../services/health.service');

const getHealthStatus = (req, res) => {
  const healthData = getSystemHealth();
  res.status(200).json({
    success: true,
    message: 'Preply API service is operational',
    data: healthData,
  });
};

module.exports = { getHealthStatus };
