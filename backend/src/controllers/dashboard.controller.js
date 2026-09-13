const { sendSuccess } = require('../utils/response');
const dashboardService = require('../services/dashboard.service');

const getDashboard = async (req, res, next) => {
  try {
    const dashboardData = await dashboardService.getStudentDashboard(req.user.id);
    sendSuccess(res, 200, dashboardData, 'Student dashboard overview retrieved successfully');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDashboard,
};
