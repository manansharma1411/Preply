const PdfExtractor = require('./PdfExtractor');
const ApiError = require('../utils/ApiError');

class ExtractorFactory {
  static getExtractor(fileTypeOrMime) {
    const type = (fileTypeOrMime || '').toLowerCase();

    if (type === 'pdf' || type === 'application/pdf') {
      return new PdfExtractor();
    }

    if (type === 'docx' || type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      throw ApiError.badRequest('DOCX support is planned for future updates. Currently supported format: PDF.');
    }

    if (type === 'pptx' || type === 'application/vnd.openxmlformats-officedocument.presentationml.presentation') {
      throw ApiError.badRequest('PPTX support is planned for future updates. Currently supported format: PDF.');
    }

    throw ApiError.badRequest(`Unsupported file format '${type}'. Only PDF files are supported.`);
  }
}

module.exports = ExtractorFactory;
