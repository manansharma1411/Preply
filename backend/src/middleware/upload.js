const multer = require('multer');
const path = require('path');
const config = require('../config/env');
const ApiError = require('../utils/ApiError');
const { ensureTempDirExists, generateSafeFileName } = require('../utils/fileUtils');

const tempDir = ensureTempDirExists();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, tempDir);
  },
  filename: (req, file, cb) => {
    const safeName = generateSafeFileName(file.originalname);
    cb(null, safeName);
  },
});

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const allowedMimes = ['application/pdf', 'application/x-pdf', 'application/acrobat', 'applications/vnd.pdf', 'text/pdf', 'text/x-pdf'];
  const isPdfMime = allowedMimes.includes(file.mimetype) || file.mimetype === 'application/octet-stream';
  const isPdfExt = ext === '.pdf';

  if (isPdfExt && isPdfMime) {
    return cb(null, true);
  }

  cb(ApiError.badRequest(`Invalid file format '${ext}'. Only PDF files are supported.`));
};

const maxSizeBytes = (config.maxFileSizeMb || 10) * 1024 * 1024;

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: maxSizeBytes,
  },
});

module.exports = upload;
