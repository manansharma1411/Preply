const app = require('./app');
const config = require('./config/env');
const { connectDB } = require('./config/db');

let server;

const startServer = async () => {
  // Connect to Database
  await connectDB();

  // Start HTTP Server
  server = app.listen(config.port, () => {
    console.log(`==================================================`);
    console.log(`  Preply Backend API Server Operating`);
    console.log(`  Environment : ${config.env}`);
    console.log(`  Port        : ${config.port}`);
    console.log(`  Health Check: http://localhost:${config.port}/api/v1/health`);
    if (config.geminiApiKey && config.geminiApiKey.trim() !== '') {
      console.log(`  AI Mode     : LIVE GOOGLE GEMINI AI (Key Detected)`);
    } else {
      console.log(`  AI Mode     : OFFLINE MOCK MODE (.env missing GEMINI_API_KEY)`);
    }
    console.log(`==================================================`);
  });
};

// Graceful Shutdown Handlers
const shutdown = (signal) => {
  console.log(`\n[Server] ${signal} signal received. Closing HTTP server gracefully...`);
  if (server) {
    server.close(() => {
      console.log('[Server] HTTP server closed.');
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

startServer();
