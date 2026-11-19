import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdfParseModule = require('pdf-parse');

console.log('pdfParseModule keys:', Object.keys(pdfParseModule));
console.log('pdfParseModule type:', typeof pdfParseModule);
console.log('default property:', typeof pdfParseModule.default);
