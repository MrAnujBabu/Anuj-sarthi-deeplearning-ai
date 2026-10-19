export type PdfReading = { text: string; pages: number; method: 'text' | 'ocr' };

/** Browser-only, lazy OCR. Every page is read, including mixed text/scanned PDFs. */
export async function readVoicePdf(file: File, allowOcr: boolean, progress: (message: string) => void): Promise<PdfReading> {
  const { getDocument, GlobalWorkerOptions } = await import('pdfjs-dist');
  const { default: workerUrl } = await import('pdfjs-dist/build/pdf.worker.min.mjs?url');
  GlobalWorkerOptions.workerSrc = workerUrl;
  const task = getDocument({ data: new Uint8Array(await file.arrayBuffer()) });
  const pdf = await task.promise;
  let worker: Awaited<ReturnType<typeof import('tesseract.js')['createWorker']>> | undefined;
  let usedOcr = false;
  const texts: string[] = [];
  try {
    for (let n = 1; n <= pdf.numPages; n++) {
      progress(`Reading page ${n}/${pdf.numPages}…`);
      const page = await pdf.getPage(n);
      const content = await page.getTextContent();
      let text = content.items.map(item => 'str' in item ? item.str : '').join(' ').trim();
      if (text.length < 50) {
        if (!allowOcr) throw new Error(`Page ${n} needs scanned PDF reading. Enable it and attach again.`);
        usedOcr = true;
        progress(`Scanning page ${n}/${pdf.numPages}…`);
        if (!worker) {
          const { createWorker } = await import('tesseract.js');
          worker = await createWorker('eng+hin');
        }
        const base = page.getViewport({ scale: 1 });
        const viewport = page.getViewport({ scale: Math.min(2, 1800 / Math.max(base.width, base.height)) });
        const canvas = document.createElement('canvas');
        canvas.width = Math.ceil(viewport.width);
        canvas.height = Math.ceil(viewport.height);
        await page.render({ canvas, viewport }).promise;
        text = (await worker.recognize(canvas)).data.text.trim();
        canvas.width = canvas.height = 0;
      }
      if (!text) throw new Error(`Page ${n} has no readable text. Try a clearer scan.`);
      texts.push(`[Page ${n}]${usedOcr ? '\n[OCR: verify numbers, formulas and diagrams against the original.]' : ''}\n${text}`);
      page.cleanup();
    }
    return { text: texts.join('\n\n'), pages: pdf.numPages, method: usedOcr ? 'ocr' : 'text' };
  } finally {
    await worker?.terminate();
    await task.destroy();
  }
}