/* eslint-disable no-control-regex */
const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js');
const BaseExtractor = require('./BaseExtractor');
const ApiError = require('../utils/ApiError');

class PdfExtractor extends BaseExtractor {
  async extract(source) {
    let uint8Array;

    if (Buffer.isBuffer(source)) {
      uint8Array = new Uint8Array(source);
    } else if (typeof source === 'string') {
      const fs = require('fs').promises;
      const buffer = await fs.readFile(source);
      uint8Array = new Uint8Array(buffer);
    } else {
      throw ApiError.badRequest('Invalid document source format provided');
    }

    if (!uint8Array || uint8Array.length === 0) {
      throw ApiError.badRequest('Uploaded PDF file is empty (0 bytes)');
    }

    // Verify PDF Magic Bytes (%PDF-)
    if (
      uint8Array.length < 5 ||
      uint8Array[0] !== 0x25 ||
      uint8Array[1] !== 0x50 ||
      uint8Array[2] !== 0x44 ||
      uint8Array[3] !== 0x46
    ) {
      throw ApiError.badRequest('File is not a valid PDF document (missing PDF magic header).');
    }

    let pdfDocument;
    try {
      const loadingTask = pdfjsLib.getDocument({
        data: uint8Array,
        useSystemFonts: true,
        disableFontFace: true,
      });
      pdfDocument = await loadingTask.promise;
    } catch (err) {
      console.warn('[PdfExtractor Warning] Failed to parse PDF:', err.message);
      throw ApiError.badRequest('Failed to parse PDF file. The file may be corrupted, unreadable, or password-protected.');
    }

    const pageCount = pdfDocument.numPages || 1;
    const pages = [];
    let fullTextParts = [];

    for (let pageNum = 1; pageNum <= pageCount; pageNum++) {
      try {
        const page = await pdfDocument.getPage(pageNum);
        const textContent = await page.getTextContent();
        const rawPageText = textContent.items
          .map((item) => item.str)
          .join(' ')
          .trim();

        const cleanedPageText = rawPageText
          .replace(/[\x00-\x09\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, '')
          .replace(/\r\n/g, '\n')
          .replace(/\n{3,}/g, '\n\n')
          .trim();

        if (cleanedPageText) {
          pages.push({
            pageNumber: pageNum,
            text: cleanedPageText,
          });
          fullTextParts.push(`[Page ${pageNum}]\n${cleanedPageText}`);
        }
      } catch (pageErr) {
        console.warn(`[PdfExtractor Warning] Error extracting page ${pageNum}:`, pageErr.message);
      }
    }

    const rawText = fullTextParts.join('\n\n');

    const cleanedText = rawText
      .replace(/[\x00-\x09\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, '')
      .replace(/\r\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    if (cleanedText.length < 20) {
      throw ApiError.badRequest('PDF does not contain sufficient readable text (minimum 20 characters required). It may contain scanned images without OCR.');
    }

    const wordCount = cleanedText.split(/\s+/).filter(Boolean).length;
    const characterCount = cleanedText.length;

    return {
      extractedText: cleanedText,
      pages,
      metadata: {
        pageCount,
        wordCount,
        characterCount,
        mimeType: 'application/pdf',
      },
    };
  }
}

module.exports = PdfExtractor;
