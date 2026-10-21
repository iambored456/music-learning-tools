import { pageImageSource, type PrintDocument } from './print/printDocument.ts';
export { preparePrintDocument, pageImageSource, rasterizePrintPage } from './print/printDocument.ts';
export type { PrintDocument, PrintPage } from './print/printDocument.ts';

let releasePreviousFrame: (() => void) | null = null;

export function disposePrintFrame(): void {
  releasePreviousFrame?.();
  releasePreviousFrame = null;
}

/** Print the prepared pages in a separate document, isolated from all editor CSS. */
export async function printPreparedDocument(prepared: PrintDocument): Promise<void> {
  if (!prepared.pages.length) throw new Error('There are no prepared pages to print.');
  disposePrintFrame();
  const frame = document.createElement('iframe');
  frame.title = 'Student Notation print document';
  frame.setAttribute('aria-hidden', 'true');
  frame.tabIndex = -1;
  frame.style.cssText = 'position:fixed;left:-100000px;top:0;width:1px;height:1px;border:0;';
  const cleanup = (): void => {
    frame.remove();
    if (releasePreviousFrame === cleanup) releasePreviousFrame = null;
  };
  releasePreviousFrame = cleanup;
  try {
    await new Promise<void>((resolve, reject) => {
      const timeout = window.setTimeout(() => reject(new Error('The print document could not be opened. Please try again.')), 15000);
      frame.onload = () => { window.clearTimeout(timeout); resolve(); };
      frame.onerror = () => { window.clearTimeout(timeout); reject(new Error('Unable to load the print document.')); };
      frame.srcdoc = '<!doctype html><html><head><title>Student Notation</title></head><body></body></html>';
      document.body.appendChild(frame);
    });
    const printWindow = frame.contentWindow;
    const printDocument = frame.contentDocument;
    if (!printWindow || !printDocument) throw new Error('The browser could not create a print document.');
    const firstPage = prepared.pages[0]!;
    const style = printDocument.createElement('style');
    style.textContent = `
      @page { size: ${firstPage.width}pt ${firstPage.height}pt; margin: 0; }
      html, body { margin: 0; padding: 0; background: white; }
      * { box-sizing: border-box; }
      .page { margin: 0; padding: 0; break-inside: avoid; break-after: page; overflow: hidden; }
      .page:last-child { break-after: auto; }
      img { display: block; width: 100%; height: 100%; }
    `;
    printDocument.head.appendChild(style);
    const ready: Promise<void>[] = [];
    for (const page of prepared.pages) {
      const sheet = printDocument.createElement('div');
      sheet.className = 'page';
      sheet.style.width = `${page.width}pt`;
      sheet.style.height = `${page.height}pt`;
      const image = printDocument.createElement('img');
      image.alt = 'Prepared notation page';
      image.src = pageImageSource(page);
      sheet.appendChild(image);
      printDocument.body.appendChild(sheet);
      ready.push(image.decode());
    }
    await Promise.all(ready);
    await printDocument.fonts?.ready;
    printWindow.addEventListener('afterprint', cleanup, { once: true });
    printWindow.focus();
    printWindow.print();
    // Keep the frame until afterprint; some browsers return while their dialog is open.
  } catch (error) {
    cleanup();
    throw error;
  }
}

