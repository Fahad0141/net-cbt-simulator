/**
 * Page-level print rules for the paper page. They are injected into <head> only
 * while the page is mounted, so they never leak into other pages after navigation
 * (lazily loaded CSS-module chunks stay in the document once loaded).
 */

/** Quotes text for a CSS string literal. */
export function cssString(text: string): string {
  return `"${text.replace(/[\\"]/g, '\\$&').replace(/[\r\n<>]+/g, ' ')}"`;
}

/** Rules every browser understands: A4 pages, a white page, and no app chrome. */
export function basePrintCss(): string {
  return `
@page { size: A4; margin: 14mm 14mm 16mm; }
@media print {
  html, body { background: #fff !important; color: #000 !important; color-scheme: light; }
  #root > * > :not(#main), #main ~ * { display: none !important; }
  #main { max-width: none !important; margin: 0 !important; padding: 0 !important; }
}`;
}

/**
 * Running footer in the page margins (CSS page-margin boxes: Chrome/Edge 131+).
 * Browsers without support ignore it and print their own header/footer instead.
 */
export function runningFooterRules(footer: string): string[] {
  const font = "font: 7.5pt/1.3 Arial, 'Helvetica Neue', Helvetica, sans-serif; color: #444;";
  return [
    `@page { @bottom-left { content: ${cssString(footer)}; ${font} } @bottom-right { content: "Page " counter(page) " of " counter(pages); ${font} } }`,
  ];
}

/**
 * Installs the print rules; returns a function that removes them. Rules that the
 * engine cannot parse (margin boxes in older browsers or jsdom) are skipped quietly.
 */
export function installPrintStyles(footer: string): () => void {
  if (typeof document === 'undefined') return () => {};
  const style = document.createElement('style');
  style.setAttribute('data-paper-print', '');
  style.textContent = basePrintCss();
  document.head.appendChild(style);
  const sheet = style.sheet;
  if (sheet) {
    for (const rule of runningFooterRules(footer)) {
      try {
        sheet.insertRule(rule, sheet.cssRules.length);
      } catch {
        // Unsupported at-rule: the footer printed inside the document still applies.
      }
    }
  }
  return () => style.remove();
}
