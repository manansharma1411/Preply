/**
 * Preply Text Chunker Utility
 * Safely splits large document text into semantic chunks with context overlap.
 */

const MAX_TOTAL_CHARACTERS = 50000;
const MAX_CHUNK_CHARACTERS = 12000;
const OVERLAP_CHARACTERS = 500;

/**
 * Truncates and chunks text safely.
 * @param {string} text - Raw extracted document text
 * @returns {Array<string>} Array of text chunks ready for AI processing
 */
const chunkDocumentText = (text) => {
  if (!text || typeof text !== 'string') return [''];

  // Cap absolute total characters to prevent memory exhaustion
  let processedText = text;
  if (processedText.length > MAX_TOTAL_CHARACTERS) {
    console.warn(`[TextChunker Warning] Document length (${processedText.length} chars) exceeds max limit (${MAX_TOTAL_CHARACTERS} chars). Truncating safely.`);
    processedText = processedText.substring(0, MAX_TOTAL_CHARACTERS);
  }

  // If text fits in single chunk, return immediately
  if (processedText.length <= MAX_CHUNK_CHARACTERS) {
    return [processedText];
  }

  const chunks = [];
  const paragraphs = processedText.split(/\n\n+/);
  let currentChunk = '';

  for (const para of paragraphs) {
    if ((currentChunk + '\n\n' + para).length > MAX_CHUNK_CHARACTERS) {
      if (currentChunk.trim().length > 0) {
        chunks.push(currentChunk.trim());
        // Create overlap from trailing portion of current chunk
        const overlapStart = Math.max(0, currentChunk.length - OVERLAP_CHARACTERS);
        currentChunk = currentChunk.substring(overlapStart) + '\n\n' + para;
      } else {
        // Single paragraph larger than MAX_CHUNK_CHARACTERS
        chunks.push(para.substring(0, MAX_CHUNK_CHARACTERS));
        currentChunk = para.substring(MAX_CHUNK_CHARACTERS - OVERLAP_CHARACTERS);
      }
    } else {
      currentChunk += (currentChunk ? '\n\n' : '') + para;
    }
  }

  if (currentChunk.trim().length > 0) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
};

module.exports = {
  chunkDocumentText,
  MAX_TOTAL_CHARACTERS,
  MAX_CHUNK_CHARACTERS,
  OVERLAP_CHARACTERS,
};
