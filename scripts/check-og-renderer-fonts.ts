import { inspectOgRendererFonts } from '../lib/og-renderer-font-inspection.ts';

const report = inspectOgRendererFonts();

if (!report.ok) {
  console.error('check-og-renderer-fonts: FAILED');
  for (const failure of report.failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(
  `check-og-renderer-fonts: OK (${report.faceCount} registered faces, ${report.cardCount} cards, ${report.textRunCount} text runs, ${report.codePointCount} code points, families ${report.familiesPainted.join(' + ')})`,
);
