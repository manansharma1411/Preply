const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const TEMP_UPLOAD_DIR = path.resolve(process.cwd(), 'uploads', 'temp');

/**
 * Ensures the temporary upload directory exists.
 */
const ensureTempDirExists = () => {
  if (!fs.existsSync(TEMP_UPLOAD_DIR)) {
    fs.mkdirSync(TEMP_UPLOAD_DIR, { recursive: true });
  }
  return TEMP_UPLOAD_DIR;
};

/**
 * Generates a safe, randomized filename.
 */
const generateSafeFileName = (originalName = 'upload.pdf') => {
  const ext = path.extname(originalName).toLowerCase() || '.pdf';
  const randomId = crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex');
  return `${Date.now()}_${randomId}${ext}`;
};

/**
 * Safely deletes a file if it exists without throwing error.
 */
const safeUnlink = async (filePath) => {
  if (!filePath) return;
  try {
    if (fs.existsSync(filePath)) {
      await fs.promises.unlink(filePath);
    }
  } catch (err) {
    console.warn(`[fileUtils Warning] Failed to clean up temp file '${filePath}':`, err.message);
  }
};

module.exports = {
  TEMP_UPLOAD_DIR,
  ensureTempDirExists,
  generateSafeFileName,
  safeUnlink,
};
