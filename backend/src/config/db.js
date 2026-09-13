const mongoose = require('mongoose');
const config = require('./env');

const dbStateNames = {
  0: 'disconnected',
  1: 'connected',
  2: 'connecting',
  3: 'disconnecting',
};

let mongoMemoryInstance = null;

// Mongoose Connection Configuration & Lifecycle Manager
const connectDB = async () => {
  try {
    // Avoid re-connecting if already connected
    if (mongoose.connection.readyState === 1) {
      return mongoose.connection;
    }

    mongoose.connection.on('connected', () => {
      console.log(`[Database] Mongoose event: connected to ${mongoose.connection.host}/${mongoose.connection.name}`);
    });

    mongoose.connection.on('error', (err) => {
      console.error(`[Database Error] Mongoose connection error: ${err.message}`);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn(`[Database Warning] Mongoose disconnected.`);
    });

    try {
      const conn = await mongoose.connect(config.mongoUri, {
        serverSelectionTimeoutMS: 2000,
        maxPoolSize: 10,
        minPoolSize: 2,
        socketTimeoutMS: 45000,
        autoIndex: config.env === 'development',
      });
      return conn;
    } catch (localErr) {
      console.warn(`[Database Warning] Local MongoDB unavailable at ${config.mongoUri}. Initializing MongoMemoryServer in-memory fallback...`);
      const { MongoMemoryServer } = require('mongodb-memory-server');
      mongoMemoryInstance = await MongoMemoryServer.create();
      const memoryUri = mongoMemoryInstance.getUri();
      const conn = await mongoose.connect(memoryUri);
      console.log(`[Database] Connected to in-memory MongoMemoryServer database at ${memoryUri}`);
      return conn;
    }
  } catch (error) {
    console.error(`[Database Error] Critical database connection error: ${error.message}`);
    return null;
  }
};

const disconnectDB = async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close();
    console.log('[Database] Mongoose connection closed.');
  }
};

// Database Diagnostic & Health Inspection Helper
const getDatabaseHealth = () => {
  const stateCode = mongoose.connection.readyState;
  const isConnected = stateCode === 1;

  return {
    status: dbStateNames[stateCode] || 'unknown',
    connected: isConnected,
    host: mongoose.connection.host || null,
    port: mongoose.connection.port || null,
    name: mongoose.connection.name || null,
    modelsCount: Object.keys(mongoose.models).length,
  };
};

module.exports = {
  connectDB,
  disconnectDB,
  getDatabaseHealth,
  mongoose,
};
