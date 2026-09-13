/**
 * Abstract Base Document Extractor
 * Base class for pluggable document format extractors (PDF, DOCX, PPTX).
 */
class BaseExtractor {
  /**
   * Extracts plain text and metadata from a file buffer or file path.
   * @param {Buffer|string} source - File buffer or absolute file path
   * @returns {Promise<{ extractedText: string, metadata: { pageCount: number, wordCount: number, characterCount: number } }>}
   */
  async extract(_source) {
    throw new Error('BaseExtractor.extract() must be implemented by subclass');
  }
}

module.exports = BaseExtractor;
