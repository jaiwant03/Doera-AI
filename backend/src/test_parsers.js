import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');
import mammoth from 'mammoth';
import * as XLSX from 'xlsx';
import AdmZip from 'adm-zip';

console.log('pdfParse:', typeof pdfParse);
console.log('mammoth:', typeof mammoth.extractRawText);
console.log('XLSX:', typeof XLSX.read);
console.log('AdmZip:', typeof AdmZip);
