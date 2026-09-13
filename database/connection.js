const { connectDB, disconnectDB, getDatabaseHealth, mongoose } = require('../backend/src/config/db');

module.exports = {
  connectDB,
  disconnectDB,
  getDatabaseHealth,
  mongoose,
};
