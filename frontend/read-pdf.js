import fs from 'fs';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';

// Set simple relative path
pdfjs.GlobalWorkerOptions.workerSrc = './pdf.worker.mjs';

async function run() {
  const data = new Uint8Array(fs.readFileSync('./diretorio.pdf'));
  const loadingTask = pdfjs.getDocument({ data });
  const pdf = await loadingTask.promise;
  console.log('Pages:', pdf.numPages);
  
  const allLines = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const strings = content.items.map(item => item.str);
    allLines.push(...strings);
  }
  
  // Write the lines to a text file for us to analyze
  fs.writeFileSync('./diretorio_extracted.txt', allLines.join('\n'));
  console.log('Extracted all lines to diretorio_extracted.txt');
}
run().catch(console.error);
