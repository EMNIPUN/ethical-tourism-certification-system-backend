import { createRequire } from 'module';
import mammoth from 'mammoth';
import fs from 'fs/promises';
import https from 'https';
import http from 'http';

// Import CommonJS module
const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');

/**
 * Document Processing Service
 * Extracts text from various document formats
 */
class DocumentProcessingService {
    /**
     * Download file from URL
     */
    async downloadFile(url) {
        return new Promise((resolve, reject) => {
            const protocol = url.startsWith('https') ? https : http;

            protocol.get(url, (response) => {
                if (response.statusCode !== 200) {
                    reject(new Error(`Failed to download: ${response.statusCode}`));
                    return;
                }

                const chunks = [];
                response.on('data', (chunk) => chunks.push(chunk));
                response.on('end', () => resolve(Buffer.concat(chunks)));
                response.on('error', reject);
            });
        });
    }

    /**
     * Extract text from PDF buffer
     */
    async extractFromPDF(buffer) {
        const data = await pdfParse(buffer);
        return data.text;
    }

    /**
     * Extract text from DOCX buffer
     */
    async extractFromDOCX(buffer) {
        const result = await mammoth.extractRawText({ buffer });
        return result.value;
    }

    /**
     * Extract text from TXT buffer
     */
    async extractFromTXT(buffer) {
        return buffer.toString('utf-8');
    }

    /**
     * Process document from buffer (uploaded file)
     */
    async processDocumentBuffer(buffer, filename) {
        try {
            const lowerFilename = filename.toLowerCase();

            if (lowerFilename.endsWith('.pdf')) {
                return await this.extractFromPDF(buffer);
            } else if (lowerFilename.endsWith('.docx')) {
                return await this.extractFromDOCX(buffer);
            } else if (lowerFilename.endsWith('.txt')) {
                return await this.extractFromTXT(buffer);
            } else {
                throw new Error('Unsupported file type. Supported: PDF, DOCX, TXT');
            }
        } catch (error) {
            throw new Error(`Failed to process document: ${error.message}`);
        }
    }

    /**
     * Process document by URL
     */
    async processDocument(url) {
        try {
            const buffer = await this.downloadFile(url);

            const lowerUrl = url.toLowerCase();

            if (lowerUrl.endsWith('.pdf')) {
                return await this.extractFromPDF(buffer);
            } else if (lowerUrl.endsWith('.docx')) {
                return await this.extractFromDOCX(buffer);
            } else if (lowerUrl.endsWith('.txt')) {
                return await this.extractFromTXT(buffer);
            } else {
                throw new Error('Unsupported file type');
            }
        } catch (error) {
            throw new Error(`Failed to process document: ${error.message}`);
        }
    }

    /**
     * Split text into chunks for embedding
     */
    splitIntoChunks(text, chunkSize = 1000, overlap = 200) {
        const chunks = [];
        let start = 0;

        while (start < text.length) {
            const end = Math.min(start + chunkSize, text.length);
            chunks.push(text.slice(start, end));
            start += chunkSize - overlap;
        }

        return chunks;
    }
}

export default new DocumentProcessingService();
