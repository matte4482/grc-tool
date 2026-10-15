// Rapporternas utseende. Samma CSS används vid utskrift och i Word-filen (B-39).

export const REPORT_CSS = `
.report { -webkit-print-color-adjust: exact; print-color-adjust: exact; font-family: Calibri, 'Segoe UI', Arial, sans-serif; font-size: 10.5pt; color: #1c1b18; line-height: 1.4; }
.report h1 { font-family: Cambria, Georgia, serif; font-size: 20pt; margin: 0 0 4pt; font-weight: normal; }
.report h2 { font-family: Cambria, Georgia, serif; font-size: 14pt; margin: 18pt 0 6pt; font-weight: normal; border-bottom: 0.75pt solid #b8894a; padding-bottom: 2pt; }
.report h3 { font-size: 11pt; margin: 12pt 0 4pt; }
.report p { margin: 0 0 6pt; }
.report table { width: 100%; border-collapse: collapse; margin: 0 0 8pt; }
.report th, .report td { border: 0.5pt solid #b4b0a6; padding: 3pt 5pt; text-align: left; vertical-align: top; }
.report th { background: #eeece5; font-weight: 600; }
.report .num { text-align: right; white-space: nowrap; }
.report .muted { color: #6b675e; }
.report .r-head { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 1.5pt solid #1c1b18; padding-bottom: 6pt; margin-bottom: 12pt; }
.report .r-logo { display: block; width: 90pt; height: 33pt; object-fit: cover; margin-bottom: 8pt; }
.report .r-meta { text-align: right; font-size: 9pt; color: #6b675e; }
.report .kpis { display: flex; gap: 8pt; margin: 0 0 8pt; }
.report .kpi { flex: 1; border: 0.5pt solid #b4b0a6; padding: 6pt; }
.report .kpi b { display: block; font-size: 18pt; font-family: Cambria, Georgia, serif; font-weight: normal; }
.report .bar { display: flex; height: 8pt; background: #eeece5; }
.report .bar span { display: block; height: 100%; }
.report .ok { background: #3b6d11; } .report .partial { background: #ba7517; } .report .no { background: #a32d2d; }
.report .st-fulfilled { color: #3b6d11; } .report .st-partial { color: #ba7517; } .report .st-not_fulfilled { color: #a32d2d; } .report .st-not_assessed { color: #6b675e; }
.report .section { break-inside: avoid; }
.report .page-break { break-before: page; }
.report .two-col { display: flex; gap: 12pt; } .report .two-col > div { flex: 1; }
.report .matrix td { text-align: center; width: 14%; height: 18pt; }
.report .lvl-low { background: #eaf3de; } .report .lvl-medium { background: #faeeda; } .report .lvl-high { background: #f7d9c4; } .report .lvl-very_high { background: #fcebeb; }
.report.single .r-head + h2, .report.single .r-head + div > h2:first-child { display: none; }
`
