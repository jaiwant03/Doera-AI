import { buildDocumentAnalysisResponse } from '../src/services/universalResponseBuilder.js';

function stripPageReferences(text) {
  if (!text || typeof text !== 'string') return '';
  return text
    .replace(/\[\s*(?:Page|Slide|Sheet)\s*[^\]]+\]/gi, '')
    .replace(/\(\s*(?:Page|Slide|Sheet)\s*[^)]+\)/gi, '')
    .replace(/\[(?:Page|Slide|Sheet)\s*\d+[^\]]*\]/gi, '')
    .replace(/\s+([.,;:!?])/g, '$1')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

console.log('Testing stripPageReferences:');
const sample = 'Frontend stack using React [Slide 2] with Vite (Page 3). Evaluated across [Page 1, Page 2, Page 3].';
console.log('Original:', sample);
console.log('Cleaned: ', stripPageReferences(sample));
