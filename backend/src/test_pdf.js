import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { PDFParse } = require('pdf-parse');

console.log('PDFParse type:', typeof PDFParse);
console.log('PDFParse proto:', Object.getOwnPropertyNames(PDFParse.prototype || {}));
console.log('PDFParse static:', Object.getOwnPropertyNames(PDFParse));
