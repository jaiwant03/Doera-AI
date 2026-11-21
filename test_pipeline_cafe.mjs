import fs from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { PDFParse } = require('./backend/node_modules/pdf-parse');
const { createWorker } = require('./backend/node_modules/tesseract.js');

async function testFullPipeline() {
  console.log('Testing full PDF extraction pipeline on Cafe Careers...');
  const filePath = 'D:/Dev/Projects/Doera AI/backend/uploads/6af9f47dfd7fce5d5a7e9847/6b017b8b55834819db6d6a4f/1795261886705-Cafe_Careers_Project-1.pdf';
  const buffer = fs.readFileSync(filePath);

  const parser = new PDFParse({ data: buffer });
  await parser.load();

  const textData = await parser.getText();
  const imgData = await parser.getImage();
  const tableData = await parser.getTable().catch(() => ({ pages: [] }));

  console.log(`Total Pages: ${textData.total}`);

  const worker = await createWorker('eng');

  const pageResults = [];
  for (let i = 0; i < textData.pages.length; i++) {
    const pageNum = i + 1;
    const pageNative = textData.pages[i]?.text?.trim() || '';
    const pageImages = imgData.pages[i]?.images || [];
    let pageOcr = '';

    // If native text is sparse or embedded diagram exists (images > 100KB)
    const largeImages = pageImages.filter(img => (img.data?.length || 0) > 80000);
    if (largeImages.length > 0) {
      for (const img of largeImages) {
        try {
          const ocrRet = await worker.recognize(Buffer.from(img.data));
          if (ocrRet.data.text?.trim()) {
            pageOcr += `\n[Page ${pageNum}: Diagram/Visual OCR (${img.width}x${img.height})]\n${ocrRet.data.text.trim()}\n`;
          }
        } catch (e) {
          console.warn(`OCR error on page ${pageNum}:`, e.message);
        }
      }
    } else if (pageNative.length < 50 && pageImages.length > 0) {
      // Scanned page with image
      for (const img of pageImages) {
        try {
          const ocrRet = await worker.recognize(Buffer.from(img.data));
          if (ocrRet.data.text?.trim()) {
            pageOcr += `\n[Page ${pageNum}: Scanned Visual OCR]\n${ocrRet.data.text.trim()}\n`;
          }
        } catch (e) {}
      }
    }

    pageResults.push({
      pageNumber: pageNum,
      nativeLength: pageNative.length,
      ocrLength: pageOcr.length,
      imageCount: pageImages.length,
      summary: pageNative.slice(0, 80).replace(/\n/g, ' '),
    });
  }

  await worker.terminate();
  await parser.destroy().catch(() => {});

  console.log('\n--- Page Extraction Summary ---');
  pageResults.forEach(p => {
    console.log(`Page ${p.pageNumber}: Native: ${p.nativeLength} chars | OCR: ${p.ocrLength} chars | Images: ${p.imageCount} | Text: "${p.summary}..."`);
  });
}

testFullPipeline().catch(console.error);
