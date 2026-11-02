import { z } from 'zod';
import { CONVERGENCE_EXEMPTIONS } from './brand-v2-global-convergence-evidence.ts';

const text = z.string().min(1);
export const RELEASE_ACCESSIBILITY_PREDICATES = ['text-contrast', 'boundary-contrast', 'state-non-colour-cue', 'device-exposed'] as const;
export const releaseAccessibilitySchema = z.object({
  counts: z.record(z.string(), z.number().int().nonnegative()),
  findings: z.array(z.object({ predicate: z.enum(RELEASE_ACCESSIBILITY_PREDICATES), element:text,detail:text,exemption:z.string().nullable() }).strict()),
  tables: z.array(z.object({id:text,name:z.string(),headers:z.number().int().nonnegative(),cells:z.number().int().nonnegative(),unassociated:z.array(text)}).strict()),
  graphics: z.array(z.object({id:text,name:z.string(),alternative:z.string(),binding:z.string(),interactive:z.boolean(),keyboardControls:z.number().int().nonnegative(),geometry:z.number().int().nonnegative(),visibleGeometry:z.number().int().nonnegative(),hiddenFromAT:z.boolean()}).strict()),
  scrollRegions: z.array(z.object({id:text,name:z.string(),keyboard:z.boolean(),alternative:z.string()}).strict()),
  svgText: z.array(z.object({id:text,foreground:text,background:text,ratio:z.number().nonnegative(),required:z.number().positive()}).strict()),
}).strict();
export type ReleaseAccessibility = z.infer<typeof releaseAccessibilitySchema>;

export function releaseAccessibilityProblems(reading: ReleaseAccessibility, route: string, forcedColors: boolean): string[] {
  const failures:string[]=[];
  if(!(reading.counts.textRuns>0))failures.push('no measured text contrast population');
  for(const finding of reading.findings){
    if(finding.exemption){
      const allowed=CONVERGENCE_EXEMPTIONS.find(({id})=>id===finding.exemption);
      if(!allowed||!allowed.predicates.some((p)=>p===finding.predicate)||allowed.routes&&!allowed.routes.includes(`route:${route}`))failures.push(`unregistered accessibility exemption: ${finding.exemption}`);
    }else failures.push(`${finding.predicate}: ${finding.element}: ${finding.detail}`);
  }
  for(const table of reading.tables){
    if(!table.name.trim()||!table.headers||!table.cells)failures.push(`${table.id}: unnamed table or empty header/cell population`);
    failures.push(...table.unassociated.map((id)=>`${table.id}: data cell has no column/header association ${id}`));
  }
  for(const graphic of reading.graphics){
    if(!graphic.name.trim()&&!graphic.hiddenFromAT)failures.push(`${graphic.id}: meaningful graphic has no accessible name`);
    if(!graphic.alternative.trim()||!graphic.binding.trim())failures.push(`${graphic.id}: meaningful graphic has no bound textual alternative`);
    if(graphic.interactive&&!graphic.keyboardControls)failures.push(`${graphic.id}: interactive graphic has no equivalent keyboard controls`);
    if(forcedColors&&graphic.geometry>0&&graphic.visibleGeometry===0)failures.push(`${graphic.id}: essential drawing is invisible in forced colours`);
  }
  for(const region of reading.scrollRegions)if(!region.name.trim()||!region.keyboard||!region.alternative.trim())failures.push(`${region.id}: scrollable instrument lacks name, keyboard access or text alternative`);
  for(const pair of reading.svgText)if(pair.ratio<pair.required)failures.push(`${pair.id}: SVG text contrast ${pair.ratio.toFixed(2)} < ${pair.required} (${pair.foreground} on ${pair.background})`);
  return failures;
}
