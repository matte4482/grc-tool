// Rapport som Word-fil: HTML som Word öppnar och kan redigera (B-39).

import { REPORT_CSS } from './style'

/** Ett HTML-dokument som Word kan öppna, med rapportens CSS. */
export function wordDocument(title: string, bodyHtml: string): string {
  return [
    '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">',
    `<head><meta charset="utf-8"><title>${escapeHtml(title)}</title><style>${REPORT_CSS}</style></head>`,
    `<body>${bodyHtml}</body></html>`,
  ].join('\n')
}

function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)
}
