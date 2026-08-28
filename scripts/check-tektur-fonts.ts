import { inspectTekturAssets } from '../lib/tektur-font-inspection.ts';

const report = inspectTekturAssets();

if (!report.ok) {
  console.error('check-tektur-fonts: FAILED');
  for (const failure of report.failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(
  `check-tektur-fonts: OK (${report.assignedStringCount} assigned strings, ${report.assignedCodePointCount} code points, variable WOFF2 + static OG TTF)`,
);
