import { ROBOT_POINTS, LLM_POINTS } from './data-scaling.ts';
import { COMPANY_POINTS } from './data-scale-company.ts';
import { DATA_SOURCE_ORACLES } from './brand-v2-source-oracles-data.ts';
import { flowEndpointError, loopClosureValues, graspExpected, round, seededUniform, rrtExpected, teacherExpected, pendulumExpected, pendulumNeedlesExpected, pushDistanceExpected, representationExpected } from './brand-v2-source-oracle-models.ts';
import type { SourceOracle, SourceBasis } from './brand-v2-source-oracle-core.ts';

/** Explicit independent paper values and authored equations. Missing entries
 * fail the reader; this is not a source-presence or nonempty-text allowance. */
const MODEL_SOURCE_ORACLES: Readonly<Record<string, SourceOracle>> = {
  'interactive:EgoScaleScaling': {
    basis:[{id:'egoscale-2026',kind:'citation',reference:'Paper Figure5 reports completion0.30,0.45,0.48,0.57,0.71 at1k,2k,4k,10k,20k hours; validation-loss law0.024-0.003ln(hours/1000).'}, {id:'assumption:EgoScaleScaling:qualified-extrapolation',kind:'assumption',reference:'The completion curve is an independently recomputed ordinary least-squares fit against log hours; its extrapolation is uncapped in text and flagged impossible above1. Geometry stops the fit at1. The band compares holding-law and plateau scenarios, not confidence. The90%solved bar is editorial.'}],citationText:{'egoscale-2026':'EgoScale (2026)'},evidencePaths:['lib/egoscale-law.ts'],
    check(c){
      const h=10**(c.input(/^Hours of video \(extrapolation horizon/)/1000),show=c.selected(/^Show the paper/),points=[[1000,.30],[2000,.45],[4000,.48],[10000,.57],[20000,.71]],xs=points.map(p=>Math.log(p[0]/1000)),mx=xs.reduce((a,b)=>a+b,0)/5,my=points.reduce((a,p)=>a+p[1],0)/5,slope=xs.reduce((sum,x,i)=>sum+(x-mx)*(points[i][1]-my),0)/xs.reduce((sum,x)=>sum+(x-mx)**2,0),intercept=my-slope*mx,fit=(hours:number)=>intercept+slope*Math.log(hours/1000),loss=(hours:number)=>.024-.003*Math.log(hours/1000),extrap=h>20020,impossible=fit(h)>1,stop=1000*Math.exp((1-intercept)/slope),shown=h>=1e6?1:Math.round(h/1000),shownMain=h>=999500?1:Math.round(h/1000),reported=extrap?round(fit(h),2):.71;
      c.readoutNumbers(0,[shown]);c.readoutNumbers(1,[shown]);c.readoutNumbers(2,!extrap?[20,71,.71]:impossible?[shownMain,100,reported]:[shownMain,reported,Math.round(fit(h)*100)]);c.readoutNumbers(3,!extrap?[71,.71]:impossible?[100,reported]:[reported,Math.round(fit(h)*100)]);c.readoutNumbers(4,[round(loss(h),4),round(loss(Math.min(h,20000)),4)]);c.readoutNumbers(5,[round(fit(h),2),round(h<=20000?fit(h):.71,2),...(impossible?[100]:[])]);
      for(const hours of [1000,4000,10000,20000])c.row(`${hours/1000}k h`,{'loss (MSE)':loss(hours).toFixed(4),'reported completion':points.find(p=>p[0]===hours)![1].toFixed(2),'completion fit':fit(hours).toFixed(2),region:hours===20000?'measured range ends':'measured'});
      for(const hours of [100000,1000000])c.row(hours===100000?'100k h':'1M h',{'loss (MSE)':`${loss(hours).toFixed(4)} holds / ${loss(20000).toFixed(4)} plateau`,'reported completion':'n/a','completion fit':`${fit(hours).toFixed(2)} holds / 0.71 plateau`,region:hours===100000?'extrapolated, dashed':'extrapolated, dashed, fit past 100 percent, impossible'});
      const x=(hours:number)=>round(44+(Math.log10(hours)-3)/3*258,2),top=round((show?118:0)+12*340/299*(1.03+2*1.25)+12,2),bottom=round((show?118:0)+12*340/299*(1.03+2*1.25)+12+220,2),ys=(score:number)=>round(bottom-score*(bottom-top),2),yl=(value:number)=>round(104-value/.03*74,2),sample=(from:number,to:number,fn:(v:number)=>number,y:(v:number)=>number)=>Array.from({length:41},(_,i)=>{const value=from*(to/from)**(i/40);return [x(value),y(fn(value))];}),path=(values:number[][])=>values.map(([xx,yy],i)=>`${i?'L':'M'}${xx},${yy}`).join(' '),band=(upper:number[][],lower:number[][])=>`${path(upper)} ${path([...lower].reverse()).replace(/^M/,'L')} Z`;
      c.requireSeries(show?['loss-law','completion-fit','measured']:['completion-fit','measured']);c.svgMarkCount('measured','circle',5);points.forEach(([hours,score])=>c.svgMark('measured','circle',{cx:x(hours),cy:ys(score),r:2.5}));
      const measured=sample(1000,20000,fit,ys);c.svgMarkCount('completion-fit','path',1+(extrap?1:0)+(show&&extrap?3:0));c.svgMark('completion-fit','path',{d:path(measured)},.05,{testId:'measured-completion-fit'});
      if(extrap){const projected=sample(20000,Math.min(h,stop),fit,ys);c.svgMark('completion-fit','path',{d:path(projected)},.05,{testId:'extrapolated-completion-fit'});if(show){const upper=sample(20000,h,v=>Math.min(fit(v),1),ys),lower=[[x(20000),ys(.71)],[x(h),ys(.71)]];c.svgMark('completion-fit','path',{d:band(upper,lower)},.05,{ownerTestId:'completion-band'});c.svgMark('completion-fit','path',{d:path(upper)},.05,{ownerTestId:'completion-band'});c.svgMark('completion-fit','path',{d:path(lower)},.05,{ownerTestId:'completion-band'});}}
      if(show){c.svgMarkCount('loss-law','circle',5);points.forEach(([hours])=>c.svgMark('loss-law','circle',{cx:x(hours),cy:yl(loss(hours)),r:1.5}));c.svgMarkCount('loss-law','path',extrap?5:1);c.svgMark('loss-law','path',{d:path(sample(1000,20000,loss,yl))},.05,{testId:'measured-loss-law'});if(extrap){const upper=sample(20000,h,loss,yl),lower=[[x(20000),yl(loss(20000))],[x(h),yl(loss(20000))]];c.svgMark('loss-law','path',{d:path(upper)},.05,{testId:'extrapolated-loss-law'});c.svgMark('loss-law','path',{d:path(upper)},.05,{ownerTestId:'uncertainty-band'});c.svgMark('loss-law','path',{d:band(upper,lower)},.05,{ownerTestId:'uncertainty-band'});c.svgMark('loss-law','path',{d:path(lower)},.05,{ownerTestId:'uncertainty-band'});}}
      c.contains('not a confidence interval');
    },
  },
  'interactive:AdvantageScrubber': {
    basis:[{id:'assumption:AdvantageScrubber:fictional-espresso-trace',kind:'assumption',reference:'The authored40-second trace has knots(0,30),(8,38),(12,31),(16,26),(26,33),(30,27),(32,18),(36,12),(40,10). Segment tags use endpoint differences; all five stages stay in training. This is not Recap’s reward-inclusive n-step estimator or a recorded episode.'}],evidencePaths:['lib/advantage-episode.ts'],seriesIds:['low','value'],
    check(c){
      const time=c.input(/^Episode time in seconds/),view=c.selected(/^At execution$/)?2:c.selected(/^What it learns$/)?1:0,knots=[[0,30],[8,38],[12,31],[16,26],[26,33],[30,27],[32,18],[36,12],[40,10]],segments=[['Reach',0,8],['Grasp',8,16],['Dose and tamp',16,26],['Insert and lock',26,36],['Outcome',36,40]] as const;
      const value=(t:number)=>{if(t>=40)return 10;const end=knots.findIndex(p=>p[0]>t);if(end===0)return 30;const a=knots[end-1],b=knots[end];return a[1]+(b[1]-a[1])*(t-a[0])/(b[0]-a[0]);},current=segments.find(row=>time>=row[1]&&time<row[2])??segments[4],delta=value(current[2])-value(current[1]);
      c.readoutNumbers(0,[time,round(value(time),1)]);c.readoutNumbers(1,[time]);c.readoutNumbers(2,[round(value(time),1)]);c.readoutNumbers(3,[delta]);c.readoutNumbers(4,[delta]);for(let i=0;i<5;i++)c.readoutNumbers(5+i,[i%5+1]);
      if(view===0)for(const t of [...new Set([0,8,16,26,32,40,time])]){const part=segments.find(row=>t>=row[1]&&t<row[2])??segments[4];c.row(String(t),{value:value(t).toFixed(1),segment:part[0],playhead:t===time?'playhead':'off'});}
      else segments.forEach(([name,start,end])=>{const difference=value(end)-value(start),tag=difference>0?'high':'low';c.row(name,view===1?{'delta V':`${difference>0?'+':''}${difference.toFixed(1)}`,tag:`${tag} advantage`}:{tag:`${tag} advantage`,treatment:`${tag}-tag example`});});
      if(view!==0)for(const id of ['low','value'])c.inactiveRetainedSeries(id,`Native ${view===1?'training':'execution'} view is selected; the retained episode is invisible/inert and its numeric values/coordinates are still checked.`);
      const x=(t:number)=>round(8+t/40*324,2),y=(v:number)=>round(236-(v-5)/40*86,2),trace=(until:number)=>[...knots.filter(p=>p[0]<=until),[until,value(until)]].map(([t,v])=>`${x(t)},${y(v)}`).join(' ');
      c.rectCount('low',3);segments.filter(([,start,end])=>value(end)<=value(start)).forEach(([,start,end])=>c.svgMark('low','rect',{x:round(x(start)+1,2),y:150,width:round(x(end)-x(start)-2,2),height:86}));c.svgMarkCount('value','polyline',time>0?2:1);c.svgMark('value','polyline',{points:trace(40)},.05,{expectedCount:time===40?2:1});if(time>0&&time<40)c.svgMark('value','polyline',{points:trace(time)});
    },
  },
  'interactive:SceneRepresentationLadder': {
    basis:[{id:'assumption:SceneRepresentationLadder:metric-room-and-storage',kind:'assumption',reference:'The same authored18m³room/14m²surface uses cell widths30/20/15/10cm. Storage models:16bytes per surface point;1per volume voxel;8per3surface-band voxels;24per2surface triangles;236per Gaussian. The plan view is300×200cm with an exact occlusion trapezoid and16cm transparent-surface depth bias; none is measured sensor accuracy.'}],evidencePaths:['lib/scene-representation.ts','lib/brand-v2-source-oracle-models.ts'],
    check(c){
      const choices=[/^Dots /,/^Grid of boxes /,/^Small boxes: distance to seen surfaces /,/^Surface of triangles /,/^Coloured shapes make camera pictures /].map(label=>c.selected(label));if(choices.filter(Boolean).length!==1)throw new Error('expected one representation');const mode=choices.indexOf(true),index=c.input(/^Detail, currently/),cm=[30,20,15,10][index];if(cm===undefined)throw new Error('invalid resolution index');
      c.contains('Scene representationsOnly storage format changes which questions can be answered');
      c.contains('Storage format → questions it answers directly');
      c.contains('Finer detail → more memory, the same questions');
      c.contains('Smaller spacing shows finer detail for the same kinds of questions.');
      for (const [format, questions] of [
        ['Dots', 'None of these three directly'],
        ['Grid of boxes', 'Can the robot move here?'],
        ['Small boxes: distance to seen surfaces', 'Can the robot move here?Which way does the surface face?'],
        ['Surface of triangles', 'Which way does the surface face?'],
        ['Coloured shapes make camera pictures', 'What does it look like from here?'],
      ]) c.contains(format + questions);
      c.contains('Other answers may need extra processing; the selected format’s details are shown below.');
      c.contains('Distance option: from each small box to a surface the camera sees, along its line of sight. Picture option: coloured shapes in 3D overlap to draw the room from a chosen camera position.');
      c.contains('At a wall or object face: the direction straight out from the surface, for planning contact.');
      const elements=Math.round((mode===1?18/(cm/100)**3:14/(cm/100)**2)*[1,1,3,2,1][mode]),bytes=elements*[16,1,8,24,236][mode],byteText=bytes<1024?`${Math.round(bytes)} B`:bytes<1048576?`${(bytes/1024).toFixed(bytes/1024<10?1:0)} KB`:bytes<1073741824?`${(bytes/1048576).toFixed(bytes/1048576<10?1:0)} MB`:`${(bytes/1073741824).toFixed(1)} GB`,name=['points','voxels','band voxels','triangles','Gaussians'][mode];
      c.readoutNumbers(0,[cm]);c.readoutNumbers(1,[Number.parseFloat(byteText),elements,cm]);c.readoutText(2,byteText);c.readoutText(3,`${elements.toLocaleString('en-US')} ${name}`);
      const g=representationExpected(cm),series=(kind:string)=>kind==='thin'||kind==='transparent'?'uncertain':'surface';c.requireSeries(mode===1?['occupied','unknown','free','room']:mode===4?['surface','uncertain','room']:['surface','uncertain','unobserved','room']);
      c.rectCount('room',4);[[20,14,260,8],[86,88,44,20],[139,191,22,11],[145,185,10,6]].forEach(([x,y,width,height])=>c.svgMark('room','rect',{x,y,width,height}));c.svgMarkCount('room','circle',3);[[240,74,12],[240,74,4],[200,97,1.6]].forEach(([cx,cy,r])=>c.svgMark('room','circle',{cx,cy,r}));
      if(mode===1){for(const id of ['occupied','unknown','free'])c.rectCount(id,g.cells.filter(cell=>cell.state===id).length);g.cells.forEach(cell=>c.svgMark(cell.state,'rect',{x:cell.x,y:cell.y,width:cm,height:cm}));return;}
      if(mode!==4){c.svgMarkCount('unobserved','polygon',1);c.svgMark('unobserved','polygon',{points:g.shadow.map(([x,y])=>`${round(x,2)},${round(y,2)}`).join(' ')});}
      for(const id of ['surface','uncertain']){
        const samples=g.samples.filter(point=>series(point.kind)===id);
        if(mode===4){c.svgMarkCount(id,'ellipse',samples.length+(id==='uncertain'?g.invented.length:0));samples.forEach(point=>c.svgMark(id,'ellipse',{cx:round(point.x,2),cy:round(point.y,2),rx:round(cm*.8,2),ry:round(cm*.45,2)}));}
        else{c.svgMarkCount(id,'circle',samples.length);samples.forEach(point=>c.svgMark(id,'circle',{cx:round(point.x,2),cy:round(point.y,2),r:round((mode===0?1.8:1.2)*(id==='uncertain'?1.7:1),2)}));}
        c.rectCount(id,mode===2?samples.length:0);if(mode===2)samples.forEach(point=>c.svgMark(id,'rect',{x:round(point.x-cm*.6,2),y:round(point.y-cm*.6,2),width:round(cm*1.2,2),height:round(cm*1.2,2)}));
      }
      if(mode===4)g.invented.forEach(point=>c.svgMark('uncertain','ellipse',{cx:round(point.x,2),cy:round(point.y,2),rx:round(cm*.9,2),ry:round(cm*.55,2)}));
      if(mode===3){c.svgMarkCount('surface','polyline',2);c.svgMarkCount('uncertain','polyline',1);for(const kind of ['wall','occluder','transparent'])c.svgMark(series(kind),'polyline',{points:g.samples.filter(point=>point.kind===kind).map(point=>`${round(point.x,2)},${round(point.y,2)}`).join(' ')});}
    },
  },
  'interactive:CrossEmbodimentStrategies': {
    basis:[{id:'assumption:CrossEmbodimentStrategies:explicit-slot-allocation',kind:'assumption',reference:'The32-slot illustration allocates native widths8,16,29 and an unspecified human row. Padding fills the remainder with zeros; Motion Transfer adds3hatched illustrative slots; relative-EEF allocates8shared slots to every body. These widths are toy choices, not source robot DoF or model dimensions.'}],evidencePaths:['lib/cross-embodiment.ts'],seriesIds:['active','blocked','zeroed','latent'],
    check(c){
      const selected=c.selected(/^Fill unused joint slots with zeros$/)?0:c.selected(/^Translate between bodies$/)?1:2;
      const names=['Padded shared vector','Motion transfer','Shared relative EEF space'],verdicts=['human video: no adapter modeled in this toy','human-hand mapping not specified in this illustration','N1.7 README: 20K hours of EgoScale human video'];
      c.readoutText(0,`${names[selected]}: ${verdicts[selected]}`);c.readoutText(1,verdicts[selected]);
      const bodyIds=['arm','bimanual','humanoid','human-hand'],strategies=['padded','motion-transfer','relative-eef'],dims=[8,16,29,0],counts:Record<string,number>={active:0,blocked:0,zeroed:0,latent:0};
      const slots=(mode:number,body:number)=>Array.from({length:32},(_,i)=>mode===2?i<8?'active':'blocked':body===3?'blocked':i<dims[body]?'active':mode===0?'zeroed':i<dims[body]+3?'latent':'blocked');
      bodyIds.forEach((id,body)=>slots(selected,body).forEach((series,i)=>{counts[series]++;c.svgMark(series,'rect',{x:round(2+i*10.56,2),y:2,width:8.56,height:16},0.05,{ownerTestId:`row-${id}`});}));
      for(let mode=0;mode<3;mode++)bodyIds.forEach((id,body)=>{const states=slots(mode,body),runs:Array<{series:string;from:number;to:number}>=[];states.forEach((series,i)=>{const last=runs.at(-1);if(last?.series===series)last.to=i+1;else runs.push({series,from:i,to:i+1});});for(const run of runs){if(run.series==='blocked')continue;counts[run.series]++;const x=round(92+mode*82.67,2)+5;c.svgMark(run.series,'rect',{x:round(x+run.from*72.67/32,2),y:59+body*34,width:round((run.to-run.from)*72.67/32,2),height:8},0.05,{overviewCell:`${strategies[mode]}:${id}`});}});
      Object.entries(counts).forEach(([id,count])=>{c.rectCount(id,count);c.svgMarkCount(id,'rect',count);});
    },
  },
  'interactive:DataScaleChart': {
    basis:[...ROBOT_POINTS,...COMPANY_POINTS,...LLM_POINTS].map(point=>({id:point.cite,kind:'citation' as SourceBasis['kind'],reference:'Frozen source-scoped counts; demonstration hours and text tokens are different units. Company totals remain unreleased lower bounds.'})).concat([{id:'assumption:DataScaleChart:annual-farm',kind:'assumption' as const,reference:'Hypothetical collection rates7or1000productive hours per rig-year and targets10000/1000000hours. Years=target/(rigs*rate); neither the low rate nor10000hour target is a measured DROID/OXE statistic.'}]),
    evidencePaths:['lib/data-scaling.ts','lib/data-scale-company.ts'],seriesIds:['llm-corpus','robot-data','human-video','company-total','farm-projection'],
    check(c){
      const rigs=c.input(/^Robots collecting/),annual=rigs*(c.selected(/^Part-time:/)?7:1000),duration=(years:number)=>years>=100?`${Math.round(years).toLocaleString('en-US')} years`:years>=1?`${years.toFixed(1)} ${years.toFixed(1)==='1.0'?'year':'years'}`:`${Math.max(1,Math.round(years*12))} ${Math.max(1,Math.round(years*12))===1?'month':'months'}`,d=(years:number)=>years>=100?Math.round(years):years>=1?round(years,1):Math.max(1,Math.round(years*12));
      const goal=c.selected(/^1,000,000 hours$/)?1000000:10000,robots=`${rigs.toLocaleString('en-US')} ${c.selected(/^Part-time:/)?'part-time':'full-time'} ${rigs===1?'robot':'robots'}`;
      c.contains(`The data bottleneck${robots} ${rigs===1?'needs':'need'} ${duration(goal/annual)} for ${goal.toLocaleString('en-US')} hours`);
      c.readoutNumbers(0,[rigs]);c.readoutNumbers(1,[rigs,annual,10000,d(10000/annual),1000000,d(1000000/annual)]);c.readoutNumbers(2,[rigs]);c.readoutNumbers(3,[annual]);c.readoutText(4,duration(10000/annual));c.readoutText(5,duration(1000000/annual));
      ROBOT_POINTS.forEach(row=>c.row(row.label,{'demonstration hours':row.value,'pretraining tokens':'n/a'}));c.row('OXE',{'demonstration hours':'No hour estimate plotted','pretraining tokens':'n/a'});LLM_POINTS.forEach(row=>c.row(row.label,{'demonstration hours':'n/a','pretraining tokens':row.value}));c.row(`your hypothetical farm (${rigs} rigs)`,{'demonstration hours':`${annual.toLocaleString('en-US')} h/yr`,'pretraining tokens':'n/a'});
      const textHeight=12*340/299,line=textHeight*1.25,middle=textHeight*.35,tokenTitle=round(textHeight,2),tokenRows=[round(tokenTitle+line+6,2),round(tokenTitle+line*2+10,2)],tokenAxis=round(tokenRows[1]+14,2),hoursTitle=round(tokenAxis+5.5+line+28,2),pitch=round(line+3,2),rows=[...ROBOT_POINTS,...COMPANY_POINTS].sort((a,b)=>a.magnitude-b.magnitude),rowY=(i:number)=>round(hoursTitle+line+8+i*pitch,2),hoursAxis=round(rowY(rows.length-1)+14,2),farmTitle=round(hoursAxis+5.5+line+34,2),noteY=round(farmTitle+line+8,2),goalY=round(noteY+line*2+6,2),farmY=round(goalY+line,2);
      const label=(series:string,text:string,x:number,y:number)=>{const right=x+8.5+text.length*textHeight*.55<=326;c.svgText(series,text,round(x+(right?8.5:-8.5),2),round(y+middle,2));};
      c.svgMarkCount('llm-corpus','circle',2);LLM_POINTS.forEach((row,i)=>{const x=round(14+(Math.log10(row.magnitude)-11)/3*312,2);c.svgMark('llm-corpus','circle',{cx:x,cy:tokenRows[i],r:2.5});label('llm-corpus',`${row.label}: ${i===0?'300 billion':'15 trillion'}`,x,tokenRows[i]);});
      for(const id of ['robot-data','human-video'])c.svgMarkCount(id,'circle',rows.filter(row=>(row.kind==='human-video'?'human-video':row.kind==='company'?'company-total':'robot-data')===id).length);
      c.rectCount('company-total',COMPANY_POINTS.length);c.svgMarkCount('company-total','rect',COMPANY_POINTS.length);
      rows.forEach((row,i)=>{const id=row.kind==='human-video'?'human-video':row.kind==='company'?'company-total':'robot-data',x=round(120+(Math.log10(row.magnitude)-2)/4*206,2),y=rowY(i);if(row.kind==='company')c.rect(id,round(x-2.5,2),round(y-2.5,2),5,5);else c.svgMark(id,'circle',{cx:x,cy:y,r:2.5});c.svgText(id,row.label,14,round(y+middle,2));label(id,`${row.kind==='company'?'over ':row.estimated?'about ':''}${row.magnitude.toLocaleString('en-US')}`,x,y);});
      c.svgMarkCount('farm-projection','circle',1);c.svgMark('farm-projection','circle',{cx:round(14+Math.log10(annual)/6*312,2),cy:farmY,r:3.5});
    },
  },
  'interactive:SampleEfficiencyLedger': {
    basis:[{id:'assumption:SampleEfficiencyLedger:qualified-constant-rates',kind:'assumption',reference:'Simulation uses the Rudin time-boundary rate98304*1500/1200=122880steps/s; single-robot whole-process rate160000/7200; fleet assumes perfect linear scaling. Toy categories are <=1hour,<=720hours,then offline. Source durations retain bounds/aggregate-robot-hour distinctions, not matched benchmark wall times.'}],evidencePaths:['lib/sample-efficiency.ts'],seriesIds:['modelled-lanes','paper-anchors'],
    check(c){
      const exponent=c.input(/^How much practice:/),fleet=c.input(/^Real robots sharing/),budget=10**exponent,rates=[122880,160000/7200,160000/7200*fleet],labels=['massively parallel simulation','a single real robot',`a fleet of ${fleet} real robots`],selected=[c.selected(/^massively parallel simulation$/),c.selected(/^a single real robot$/),c.selected(/^a fleet of real robots$/)];if(selected.filter(Boolean).length!==1)throw new Error('expected one measured native/ARIA collection-source choice');const choice=selected.indexOf(true),seconds=budget/rates[choice],ratio=rates[0]/rates[choice];
      const duration=(s:number)=>s<60?`${s<10?s.toFixed(1):Math.round(s)} s`:s<3600?`${(s/60).toFixed(1)} min`:s<172800?`${(s/3600).toFixed(1)} h`:s<365.25*86400?`${(s/86400).toFixed(1)} d`:`${(s/(365.25*86400)).toFixed(1)} yr`,rate=(v:number)=>v>=1000?`${Math.round(v/1000)}k steps/s`:v>=10?`${Math.round(v)} steps/s`:`${v.toFixed(1)} steps/s`,band=(s:number)=>s<=3600?'toy on-policy band':s<=720*3600?'toy off-policy band':'toy offline band';
      const shortBudget=budget>=1e9?round(budget/1e9,2):budget>=1e6?Math.round(budget/1e6):Math.round(budget/1e3),slow=ratio<10?`${ratio.toFixed(1)}x`:`${Math.round(ratio).toLocaleString('en-US')}x`;
      c.readoutNumbers(0,[budget>=1e9?round(budget/1e9,1):shortBudget]);c.readoutNumbers(1,[fleet]);c.readoutNumbers(2,[shortBudget,Number.parseFloat(duration(seconds)),Number.parseFloat(rate(rates[choice])),ratio<10?round(ratio,1):Math.round(ratio)]);c.readoutText(3,duration(seconds));c.readoutText(4,slow);c.readoutText(5,band(seconds));
      const x=(s:number)=>round(12+Math.min(1,Math.max(0,Math.log10(Math.max(1,s))/9))*312,2);c.rectCount('modelled-lanes',3);rates.forEach((v,i)=>{const time=budget/v;c.row(labels[i],{'model steps/s':rate(v),'model wall clock':duration(time),'toy band':band(time)});c.rect('modelled-lanes',12,72+i*34,round(Math.max(x(time)-12,2),2),2);});
      c.svgMarkCount('paper-anchors','circle',6);[240,1200,3600,7200,800*3600,60*86400].forEach(time=>c.svgMark('paper-anchors','circle',{cx:x(time),cy:184,r:2.5}));
    },
  },
  'interactive:PendulumController': {
    basis: [{ id: 'assumption:PendulumController:input-replayed-pid', kind: 'assumption', reference: 'Authored 1 kg, 1 m pendulum, gravity 9.81, bias torque 0.8 N·m, torque clamp ±40 and integral clamp ±1.5. Start 12° off upright with zero rate/integral. Independently replay input gain runs at dt=1/480 and +2 rad/s push impulses; no output state enters the witness. The two physical gauge needles sweep 18 degrees per Nm, clipped at 10 Nm, and their four-corner faces are independently projected at 68-degree azimuth and 20-degree elevation.' }], evidencePaths: ['lib/pendulum.ts','lib/figure-input-trace.ts','lib/brand-v2-source-oracle-models.ts','components/iso/figures/pendulum-stand.ts'], seriesIds:['pendulum-pole'],
    check(c) {
      if(c.sourceState('data-source-trace-complete')!=='true')throw new Error('incomplete pendulum input witness');
      const state=pendulumExpected(JSON.parse(c.sourceState('data-source-inputs')),Number(c.sourceState('data-source-steps'))),kp=c.input(/^React to the lean/),ki=c.input(/^Fix lingering drift/),kd=c.input(/^Calm the swing/);
      const angle=round(state.angle*180/Math.PI,1),rate=round(state.rate*180/Math.PI,1),integral=round(state.integral,2),torque=round(Math.max(-40,Math.min(40,-(kp*state.angle+kd*state.rate+ki*state.integral))),1);
      c.readoutNumbers(0,[kp]);c.readoutNumbers(1,[ki]);c.readoutNumbers(2,[kd]);c.readoutNumbers(3,[angle,rate,integral,torque]);c.readoutNumbers(4,[angle]);c.readoutNumbers(5,[rate]);c.readoutNumbers(6,[integral]);c.readoutNumbers(7,[torque]);c.readoutNumbers(9,[Math.round(Math.abs(state.angle*180/Math.PI))]);
      c.pendulumPartKeys(pendulumNeedlesExpected(Math.max(-40,Math.min(40,-(kp*state.angle+kd*state.rate+ki*state.integral))),Math.abs(9.81*Math.sin(state.angle)+0.8)));
    },
  },
  'interactive:AppearancePhysicsPush': {
    basis: [{ id:'assumption:AppearancePhysicsPush:observed-force-impulses',kind:'assumption',reference:'Authored 0.3 kg mug, 0.1 s contact time, Coulomb friction 0.5 and gravity 9.81. Each effective push travels (F/3)^2/9.81 metres; accumulated travel stops at 0.5 m. Replay only the recorded applied force inputs, never recorded output positions.' }],evidencePaths:['lib/appearance-physics-push.ts','lib/figure-input-trace.ts','lib/brand-v2-source-oracle-models.ts'],
    check(c) {if(c.sourceState('data-source-trace-complete')!=='true')throw new Error('incomplete force input witness');const distance=pushDistanceExpected(JSON.parse(c.sourceState('data-source-forces'))),force=c.input(/^Push strength/),centimetres=round(distance*100,1);c.readoutNumbers(0,[force]);c.readoutNumbers(1,[centimetres]);c.readoutNumbers(2,[centimetres]);},
  },
  'interactive:TeacherStudent': {
    basis: [{ id: 'assumption:TeacherStudent:constructed-error-fields', kind: 'assumption', reference: '24 authored terrain cells combine two sines, one step and one depression. Fixed LCG noise/dropout fields and a sigma-3 Gaussian blur construct the error; this is not inferred by a trained student. MAE is the mean absolute constructed error; action discrepancy is 2.2 times MAE.' }], evidencePaths: ['lib/sim2real.ts', 'lib/brand-v2-source-oracle-models.ts'],
    check(c) {
      const percent = c.input(/^Proprioceptive degradation/), e = teacherExpected(percent / 100), lost = e.lost.filter(Boolean).length;
      c.readoutNumbers(0, [percent]); c.readoutNumbers(1, [round(e.mae, 2)]); c.readoutNumbers(2, [round(e.mae * 2.2, 2)]); c.readoutNumbers(3, [lost, 24]);
      c.requireSeries(lost === 24 ? ['terrain','readings'] : ['terrain','reconstruction','readings']); if(lost===24)c.zeroSeries('reconstruction','All 24 independently seeded channels are occluded at 100 percent degradation, so the reconstruction has no retained segment.');
      const x=(i:number)=>round(8+(i+0.5)*13.5,2),y=(v:number)=>round(150-(v-e.low)/(e.high-e.low)*46,2);
      c.rectCount('terrain',24);c.rectCount('readings',24-lost);c.svgMarkCount('terrain','polyline',1);c.svgMark('terrain','polyline',{points:e.terrain.map((v,i)=>`${x(i)},${y(v)}`).join(' ')});
      e.terrain.forEach((v,i)=>c.rect('terrain',round(8+i*13.5,2),y(v),13.7,round(158-y(v),2)));
      const runs:number[][]=[];let run:number[]=[];e.lost.forEach((missing,i)=>{if(missing){if(run.length)runs.push(run);run=[];}else run.push(i);});if(run.length)runs.push(run);
      c.svgMarkCount('reconstruction','line',runs.filter(r=>r.length===1).length);c.svgMarkCount('reconstruction','polyline',runs.filter(r=>r.length>1).length);
      runs.forEach(r=>r.length===1?c.svgMark('reconstruction','line',{x1:x(r[0])-4.5,x2:x(r[0])+4.5,y1:y(e.guess[r[0]]),y2:y(e.guess[r[0]])}):c.svgMark('reconstruction','polyline',{points:r.map(i=>`${x(i)},${y(e.guess[i])}`).join(' ')}));
      c.svgMarkCount('readings','line',lost);e.readings.forEach((v,i)=>{const left=round(9+i*13.5,2);if(e.lost[i])c.svgMark('readings','line',{x1:left,x2:left+10.5,y1:199,y2:199});else{const height=Math.max(2,Math.min(18,v*18));c.rect('readings',left,round(200-height,2),10.5,round(height,2));}});
    },
  },
  'interactive:RewardShaping': {
    basis: [{ id: 'assumption:RewardShaping:twelve-weighted-terms', kind: 'assumption', reference: 'Twelve authored per-step magnitudes have signed coefficients [1,0.5,-1,-0.5,-1,-1,-1,0.5,-0.8,0.6,-0.8,-1.5]. Native weights are tenths. Chatter has action-rate weight<=0.2; freeze and prance require weight>=2.5 and >=2*velocity weight. This is a teaching classifier, not trained policy performance.' }], evidencePaths: ['lib/reward-shaping.ts'], previewClock: { key: 'phase-readout', purpose: 'stride-preview', evidencePath: 'evidence/brand-v2/interactive-ledger.json' },
    check(c) {
      const names=['Linear velocity tracking','Yaw rate tracking','Torque penalty','Joint acceleration penalty','Action-rate penalty','Joint limit penalty','Collision penalty','Base height','Orientation penalty','Foot air time','Foot stumble penalty','Termination penalty'], weights=names.map(name=>c.input(new RegExp(`^${name} weight$`))/10), coefficients=[1,0.5,-1,-0.5,-1,-1,-1,0.5,-0.8,0.6,-0.8,-1.5], total=round(weights.reduce((sum,v,i)=>sum+v*coefficients[i],0),2);
      const walk=weights[4]<=0.2?'Legs jitter':weights[2]>=2.5&&weights[2]>=2*weights[0]?'Stands still':weights[9]>=2.5&&weights[9]>=2*weights[0]?'Bounces in place':'Steady trot'; c.readoutText(12,walk);c.readoutText(13,walk);weights.forEach((v,i)=>c.readoutNumbers(i,[v]));c.readoutNumbers(14,[total]);c.readoutNumbers(15,[total]);c.previewClock();
    },
  },
  'interactive:RrtExplorer': {
    basis: [{ id: 'assumption:RrtExplorer:seeded-tree', kind: 'assumption', reference: 'Authored 100×64 world, start (7,32), goal (93,32), fixed obstacles, seed 19981001, step size 2 and goal bias 0.015. Rebuild the tree independently; visible branch count is controlled by the native playhead. The isometric gantry is a schematic of the tree, not a metric physical robot.' }], evidencePaths: ['lib/rrt.ts', 'lib/brand-v2-source-oracle-models.ts'],
    check(c) { const n = c.input(/^How far the search has grown/), expected = rrtExpected(), reached = n >= expected.branches, length = round(expected.length, 1); c.requireSeries(['rrt-tree']); c.svgMarkCount('rrt-tree','line',n); c.svgMarkCount('rrt-tree','circle',n+1); c.readoutNumbers(0, reached ? [n, expected.branches, n + 1, expected.branches, length] : [n, expected.branches, n + 1]); c.readoutNumbers(1, [n, expected.branches]); c.readoutNumbers(2, [n + 1]); c.readoutNumbers(3, reached ? [expected.branches] : []); c.readoutNumbers(4, reached ? [length] : []); c.readoutNumbers(5, n ? [n] : []); },
  },
  'interactive:MpcVsRl': {
    basis: [{ id: 'assumption:MpcVsRl:authored-disturbance-traces', kind: 'assumption', reference: 'Forty-step illustrative base-height traces start at step 4. Push: 6exp(-t/6), 8exp(-t/10)cos(t/2.2). Friction: min(24,1.15t),5.5exp(-t/9)cos(t/3). Payload:3.5(1-exp(-t/5)),0.6+3.9exp(-t/8). Torque:2.2(1-exp(-t/7)),min(20,0.45t(1+0.35sin t)). No measured controller performance is claimed.' }], evidencePaths: ['lib/mpc-vs-rl.ts'], seriesIds: ['mpc', 'rl'],
    nonQuantitative: 'The dog poses convey categorical recovery/fall, without a quantitative pose axis. All authored numerical base-height trace samples and outcome table cells are checked.',
    check(c) {
      const state = c.selected(/^Sideways shove$/) ? 0 : c.selected(/^Slippery patch$/) ? 1 : c.selected(/^Heavy backpack$/) ? 2 : 3;
      const functions = [[(t:number)=>6*Math.exp(-t/6),(t:number)=>8*Math.exp(-t/10)*Math.cos(t/2.2)],[(t:number)=>Math.min(24,1.15*t),(t:number)=>5.5*Math.exp(-t/9)*Math.cos(t/3)],[(t:number)=>3.5*(1-Math.exp(-t/5)),(t:number)=>0.6+3.9*Math.exp(-t/8)],[(t:number)=>2.2*(1-Math.exp(-t/7)),(t:number)=>Math.min(20,0.45*t*(1+0.35*Math.sin(t)))]];
      for (const t of [0,4,10,20,30,39]) c.row(String(t), {'MPC (cm)':(t<4?0:functions[state][0](t-4)).toFixed(2),'RL (cm)':(t<4?0:functions[state][1](t-4)).toFixed(2)});
      [['Sideways shove','stays up','stays up'],['Slippery patch','falls','stays up'],['Heavy backpack','stays up, body sags','stays up'],['Weaker motors (unpractised)','stays up, but slower','falls']].forEach(([row,mpc,rl])=>c.row(row,{'Plans ahead':mpc,'Learned by practice':rl}));
    },
  },
  'interactive:WbcDecomposition': {
    basis: [{ id: 'assumption:WbcDecomposition:canonical-architecture-summary', kind: 'assumption', reference: 'The frozen architecture records summarize the disclosed Figure, NVIDIA and Google systems. Rates that the source does not report remain not disclosed; no inferred numerical rate replaces them. The authored glyph has eight hollow joint-motor rings and a matching key; its drawing dimensions carry no metric claim.' }], evidencePaths: ['lib/wbc-decomposition.ts', 'components/interactive/wbc-decomposition.tsx', 'components/motion/motion-tokens.css', 'app/globals.css'], seriesIds: ['motors'], nonQuantitative: 'The motor drawing and stack spacing are categorical. Representative identity, layer counts and the fastest disclosed rate are checked numerically/textually below.',
    check(c) {
      const nvidia = c.selected(/^NVIDIA$/), google = c.selected(/^Google DeepMind$/), name = google ? 'Gemini Robotics 2' : nvidia ? 'GR00T N1.7 + GEAR-SONIC' : 'Figure Helix 02 S0', layers = google || nvidia ? 2 : 3, fastest = google ? 'not disclosed' : nvidia ? '50 Hz' : '1000 Hz';
      c.readoutText(0, `Representative: ${name}Layers: ${layers}Fastest loop: ${fastest}`); c.readoutText(1, name); c.readoutNumbers(2, [layers]); c.readoutText(3, fastest);
      for (const stat of google ? ['< 200 examples', 'not disclosed'] : nvidia ? ['3B', '132', '20,000 h'] : ['10M', '1000+ h', '200,000+']) c.contains(stat);
      c.legendEncoding({ 'joint motors': ['motors'] }, { 'joint motors': { tag: 'circle', fill: 'rgb(250,250,248)', stroke: { seriesId: 'motors' }, strokeWidth: '1px' } });
      c.svgMarkCount('motors', 'circle', 8);
      for (const [cx, cy] of [[270,44],[302,44],[259,72],[313,72],[278,94],[294,94],[277,130],[295,130]]) c.svgMark('motors', 'circle', { cx, cy, r: 2.75, fill: 'var(--paper, var(--color-paper))', stroke: 'var(--role-action-stage)' }, 0.05, { effectiveOpacity: 1 });
    },
  },
  'interactive:EurekaLoop': {
    basis: [{ id: 'assumption:EurekaLoop:three-scripted-generations', kind: 'assumption', reference: 'The local three-round script has authored fitness scores 0.31, 0.58 and 0.86. It illustrates speed-only failure, survival-only stalling and a balanced reward; none is a recorded Eureka training run.' }], evidencePaths: ['lib/eureka.ts'],
    check(c) { const gen = Number(c.sourceState('data-source-generation')); if (!Number.isInteger(gen) || gen < 0 || gen > 2) throw new Error('invalid generation input'); const score = [0.31, 0.58, 0.86][gen]; c.readoutNumbers(0, [gen + 1, 3]); c.readoutNumbers(1, [gen + 1, 3]); c.readoutNumbers(2, [gen, 2, score]); c.readoutNumbers(3, [gen, 2]); c.readoutNumbers(4, [score]); },
  },
  'interactive:TerrainCurriculum': {
    basis: [{ id: 'rudin-2021', kind: 'citation', reference: 'Promote robots that cross a patch, demote insufficient progress, and recycle successful top-level robots.' }, { id: 'assumption:TerrainCurriculum:seeded-twenty-robots', kind: 'assumption', reference: 'The 20 robots, eight levels and thirty rounds are authored. Seed 20211007 defines skill in [0,0.8), per-round luck in [-0.4,0.4), and recycled levels. Covered distance=skill+0.5*round-0.85*(level-1)+luck.' }], evidencePaths: ['components/interactive/terrain-curriculum.tsx'], seriesIds: ['robots'],
    check(c) {
      const current = Number(c.sourceState('data-source-round')); if (!Number.isInteger(current) || current < 0 || current > 30) throw new Error('invalid curriculum round');
      const random = seededUniform(20211007), skill = Array.from({ length: 20 }, () => random() * 0.8), luck = Array.from({ length: 30 }, () => Array.from({ length: 20 }, () => random() * 0.8 - 0.4)), recycle = Array.from({ length: 30 }, () => Array.from({ length: 20 }, () => 1 + Math.floor(random() * 8)));
      const levels = [Array(20).fill(1) as number[]], moves: string[][] = [Array(20).fill('stay')];
      for (let r = 1; r <= current; r++) { const choices: string[] = []; levels.push(levels[r - 1].map((level, i) => { const covered = skill[i] + 0.5 * r - 0.85 * (level - 1) + luck[r - 1][i]; if (covered >= 1) { choices.push(level === 8 ? 'loop' : 'up'); return level === 8 ? recycle[r - 1][i] : level + 1; } if (covered < 0.5 && level > 1) { choices.push('down'); return level - 1; } choices.push('stay'); return level; })); moves.push(choices); }
      for (const r of [...new Set([1, 2, 3, 4, current])]) { if (!levels[r]) throw new Error('round sequence does not reach required reference rows'); c.row(String(r), { 'moved up': moves[r].filter(m => m === 'up').length, 'moved down': moves[r].filter(m => m === 'down').length, 'sent back': moves[r].filter(m => m === 'loop').length, 'highest level': Math.max(...levels[r]) }); }
      const seen = new Map<number, number>(); c.svgMarkCount('robots', 'circle', 20);
      levels[current].forEach((level, i) => { const within = seen.get(level) ?? 0; seen.set(level, within + 1); c.svgMark('robots', 'circle', { cx: 30 + (level - 1) * 40 + (within % 2 ? 5 : -5), cy: 156 - Math.floor(within / 2) * 9, r: moves[current][i] === 'stay' ? 2.2 : 3.4 }); });
    },
  },
  'interactive:HierarchyTimescales': {
    basis: [{ id: 'assumption:HierarchyTimescales:qualified-cadences', kind: 'assumption', reference: 'The documented lane periods are a mix of source-reported and explicitly schematic rates. All diagrams use a 2000 ms horizon, one initial instruction event, and at most 120 evenly subsampled ticks per lane. No schematic period is promoted to measured throughput.' }], evidencePaths: ['lib/hierarchy-timescales.ts'],
    check(c) {
      const time = c.input(/^Point in the 2 seconds:/), periods = c.selected(/^Helix 02$/) ? [null, 1000, 5, 1] : c.selected(/^Gemini Robotics 1.5$/) ? [null, 2000, 333, 20] : c.selected(/^GO-2$/) ? [null, 2000, 100, 20] : [null, 1000, 1000, 20];
      c.readoutNumbers(0, [time]); c.readoutNumbers(1, [time]); let fired = 0, pending = 0;
      periods.forEach((period, lane) => { const count = period === null ? 1 : Math.floor(2000 / period), stride = Math.ceil(count / 120); for (let i = 0; i < count; i += stride) { const t = period === null ? 0 : (i + 1) * period, active = t <= time, half = active ? 6 : 4, x = round(8 + t / 2000 * 324, 2), cy = 33 + lane * 40; if (active) fired++; else pending++; c.svgMark(active ? 'fired' : 'pending', 'line', { x1: x, x2: x, y1: cy - half, y2: cy + half }); } });
      c.svgMarkCount('fired', 'line', fired); c.svgMarkCount('pending', 'line', pending); c.requireSeries(pending ? ['fired', 'pending'] : ['fired']);
    },
  },
  'interactive:FrictionTransfer': {
    basis: [{ id: 'assumption:FrictionTransfer:gaussian-and-plateau', kind: 'assumption', reference: 'Authored point success=0.97 exp(-(mu-0.8)^2/(2*0.09^2)). DR peak=0.93-0.55*halfwidth, flat within that range and Gaussian decay with sigma 0.1 outside. Curves and their peak penalty are illustrative, not trained policies.' }], evidencePaths: ['lib/sim2real.ts'], seriesIds: ['dr-policy', 'point-policy', 'real-robot'],
    check(c) {
      const mu = c.input(/^Real floor:/) / 100, range = c.input(/^Range of practice floors:/) / 100, point = (v: number) => 0.97 * Math.exp(-((v - 0.8) ** 2) / (2 * 0.09 ** 2)), dr = (v: number) => (0.93 - 0.55 * range) * Math.exp(-(Math.max(0, Math.abs(v - 0.8) - range) ** 2) / 0.02);
      const delta = Math.round((dr(mu) - point(mu)) * 100); c.readoutNumbers(1, [mu]); c.readoutNumbers(2, [Math.round(point(mu) * 100)]); c.readoutNumbers(3, [Math.round(dr(mu) * 100)]); c.readoutText(4, delta >= 0 ? `DR +${delta} pts` : `point +${-delta} pts`);
      for (const value of [...new Set([0.2, 0.5, 0.8, 1.1, 1.5, mu])]) c.row(value.toFixed(2), { 'point policy': `${Math.round(point(value) * 100)}%`, 'DR policy': `${Math.round(dr(value) * 100)}%`, playhead: value === mu ? 'playhead' : 'off' });
      const x = (v: number) => round(72 + (v - 0.2) / 1.3 * 254, 2), y = (v: number) => round(210 - 124 * v, 2), low = x(Math.max(0.2, 0.8 - range)), high = x(Math.min(1.5, 0.8 + range));
      c.rectCount('dr-policy', 1); c.rect('dr-policy', low, 86, round(high - low, 2), 124); c.rectCount('real-robot', 1); c.rect('real-robot', round(x(mu) - 12, 2), 76, 24, 134);
      c.svgMarkCount('real-robot', 'line', 1); c.svgMark('real-robot', 'line', { x1: x(mu), x2: x(mu), y1: 84, y2: 210 });
      for (const [id, fn] of [['point-policy', point], ['dr-policy', dr]] as const) { c.svgMarkCount(id, 'polyline', 1); c.svgMark(id, 'polyline', { points: Array.from({ length: 65 }, (_, i) => { const value = 0.2 + i / 64 * 1.3; return `${x(round(value, 4))},${y(round(fn(value), 4))}`; }).join(' ') }); }
    },
  },
  'interactive:LoopClosure': {
    basis: [{ id: 'assumption:LoopClosure:constrained-chain', kind: 'assumption', reference: 'A 5×3 rectangular circuit of 2 m legs has 14 measured turns, under-reading by drift*(1+0.8cos(pi*j/13)). Close the position and heading constraints while minimizing squared turn corrections. The independent solver uses central finite differences and pivoted elimination.' }], evidencePaths: ['lib/loop-closure.ts', 'lib/brand-v2-source-oracle-models.ts'],
    check(c) { const drift = c.input(/^How far each turn is off$/), values = loopClosureValues(drift); c.readoutNumbers(0, [drift]); c.readoutNumbers(1, c.controlPresent(/^Open the loop$/) ? [14, Math.round(values.totalTurn), round(values.closedWorst, 2)] : [drift, round(values.openGap, 1)]); },
  },
  'interactive:FlowMatchingTrajectory': {
    basis: [{ id: 'assumption:FlowMatchingTrajectory:seeded-bezier-transport', kind: 'assumption', reference: '48 authored noise-to-target pairs, seed 20241031 and 0.22 chord-relative bend. For a quadratic Bezier field, the Euler endpoint error is exactly 2*absolute lateral control-point offset/step count. No trained-policy error measurement is claimed.' }], evidencePaths: ['lib/flow-matching.ts', 'lib/brand-v2-source-oracle-models.ts'],
    check(c) {
      const steps = c.input(/^Refining steps, any number/), error = round(flowEndpointError(steps), 2);
      c.readoutNumbers(0, [steps]); c.readoutNumbers(1, steps === 1 ? [steps, error] : [steps, error, round(flowEndpointError(1), 2)]); c.readoutNumbers(2, [steps]); c.readoutNumbers(3, [error]);
      c.readoutText(1, `Exact target-dot distance: ${steps} ${steps === 1 ? 'step' : 'steps'} average ${error.toFixed(2)}${steps === 1 ? '' : ` · one big jump averages ${flowEndpointError(1).toFixed(2)}`}`);
      c.contains('Inside an outlined area counts as a good move. The small dot is its exact target; the readout measures distance to that dot.');
    },
  },
  'interactive:GraspWrenchLab': {
    basis: [{ id: 'assumption:GraspWrenchLab:unit-square-wrenches', kind: 'assumption', reference: 'Authored unit square, point contacts, unit normal force and friction-cone edges n±mu*t. Torque is px*fy-py*fx. Epsilon is the origin-to-nearest supporting-facet distance of the wrench hull; eight central pulls are checked by positive conical combinations of at most three generators.' }], evidencePaths: ['lib/grasp.ts', 'lib/brand-v2-source-oracle-models.ts'],
    check(c) {
      const positions = c.inputs(/^Contact \d+ position/), mu = c.input(/^How rough the surface is/), { epsilon, slipping } = graspExpected(positions, mu);
      positions.forEach((value, index) => c.readoutNumbers(index + 1, [value]));
      c.readoutNumbers(positions.length + 1, epsilon > 0 || slipping === 0 ? [] : [slipping, 8]);
      c.readoutWhere({ text: /^contacts \d/ }, [positions.length, round(epsilon, 3), mu]);
      c.readoutWhere({ key: /^grasp-contacts-readout$/ }, [positions.length]); c.readoutWhere({ key: /^grasp-epsilon-readout$/ }, [round(epsilon, 3)]);
      c.contains(`force closure ${epsilon > 0 ? 'yes' : 'no'}`);
    },
  },
  'interactive:ImpedanceContactLab': {
    basis: [{ id: 'assumption:ImpedanceContactLab:contact-ode', kind: 'assumption', reference: 'Authored 4 kg mass, 400000 N/m environment and optional 800 N/m series spring. Semi-implicit Euler at 0.0002 s over 0.6 s starts 0.5 mm off contact. Contact force is k*x; acceleration is [K(d-x)-D*v-max(0,k*x)]/4. Steady force is k*K*d/(k+K); 25 N crush and 255 N transient categories.' }], evidencePaths: ['lib/impedance.ts'],
    check(c) {
      const stiffness = c.input(/^Softness:/), depth = c.input(/^How far it presses in:/), damping = c.input(/^Calm the bounce:/), position = c.selected(/^Stiff arm$/), spring = c.selected(/^Arm with a built-in spring$/), contact = spring ? 400000 * 800 / 400800 : 400000;
      let x = -0.0005, velocity = 0, peak = 0;
      for (let step = 0; step < 3000; step++) { const force = Math.max(0, contact * x); peak = Math.max(peak, force); velocity += (stiffness * (depth - x) - damping * velocity - force) / 4 * 0.0002; x += velocity * 0.0002; }
      const steady = contact * stiffness * depth / (contact + stiffness), outcome = position ? 'no force control' : peak > 255 ? 'past the human pain limit' : Math.max(peak, steady) > 25 ? 'object crushed' : 'object intact';
      c.readoutNumbers(0, [depth * 1000]); c.readoutNumbers(1, [damping]); c.readoutNumbers(2, position ? [stiffness] : [stiffness, round(steady, 1), round(peak, 1)]);
      if (position) { c.readoutText(3, 'unbounded'); c.readoutText(4, 'unbounded'); c.readoutText(6, 'No force control: the push runs off the scale'); }
      else { c.readoutNumbers(3, [round(steady, 1)]); c.readoutNumbers(4, [round(peak, 1)]); c.readoutNumbers(6, [round(peak, 1)]); }
      c.readoutText(5, outcome);
      c.contains(`Impedance control${position ? 'The stiff position-following arm crushes the glass' : Math.max(peak, steady) > 25 ? 'This force-control setting still crushes the glass' : 'Force control keeps contact below the glass’s crushing force'}`);
    },
  },
  'interactive:ActionTokenization': {
    basis: [{ id: 'assumption:ActionTokenization:seven-authored-waves', kind: 'assumption', reference: 'Seven authored normalized action coordinates over 16 moments, quantized uniformly on [-1,1] into 256 bins. Input waves are rounded to four decimals before binning; reconstruction uses the bin midpoint. These are illustrative tokens and trajectories, not a recorded VLA vocabulary.' }], evidencePaths: ['lib/action-tokenization.ts'],
    check(c) {
      const labels = ['forward/back', 'left/right', 'up/down', 'twist along arm', 'tilt up/down', 'turn left/right', 'open/close'], dim = labels.findIndex(label => c.selected(new RegExp(`^${label}$`))), step = c.input(/^Moment in the movement$/);
      if (dim < 0) throw new Error('no selected action coordinate');
      const defs = [[1, 0.3, 0.62, 0], [1.5, 2.1, 0.48, 0], [0.75, 4, 0.35, -0.12], [2, 1.2, 0.22, 0], [1.25, 5.1, 0.28, 0], [0.5, 0.8, 0.55, 0]], value = (t: number) => dim === 6 ? t < 11 ? -0.85 : 0.85 : round(defs[dim][2] * Math.sin(2 * Math.PI * defs[dim][0] * t / 15 + defs[dim][1]) + defs[dim][3], 4), bin = (v: number) => Math.min(255, Math.floor((v + 1) * 128));
      const v = value(step), index = bin(v), centre = -1 + (index + 0.5) / 128;
      c.readoutNumbers(0, [step + 1, 16]); c.readoutNumbers(1, [step + 1, 16, round(v, 3), index, 256, index]); c.readoutNumbers(2, [round(v, 3)]); c.readoutNumbers(3, [index, 256]); c.readoutNumbers(4, [index]); c.readoutNumbers(5, [round(centre, 4), round(v - centre, 4)]);
      for (const t of [...new Set([0, 3, 6, 9, 12, 15, step])]) c.row(String(t), { value: value(t).toFixed(3), bin: bin(value(t)), playhead: t === step ? 'playhead' : 'off' });
    },
  },
  'interactive:ExecutionModes': {
    basis: [{ id: 'assumption:ExecutionModes:deterministic-handoff', kind: 'assumption', reference: 'Authored velocity 0.6+0.25sin(tick/5), 20 ms ticks and handoff at tick 8. Delay/200 is the naive velocity offset. Synchronous control ramps over four ticks; chunking freezes ceil(delay/20) ticks then blends over five. The 0.30 delta-v threshold is a proxy, not physical jerk.' }], evidencePaths: ['lib/execution-modes.ts'],
    check(c) {
      const delay = c.input(/^Inference delay, any value/), pause = Math.ceil(delay / 20), old = (t: number) => 0.6 + 0.25 * Math.sin(t / 5);
      const trace = (mode: string) => Array.from({ length: 30 }, (_, t) => {
        if (mode === 'naive') return old(t) + (t >= 8 ? delay / 200 : 0);
        if (mode === 'chunking') return old(t) + delay / 200 * Math.min(1, Math.max(0, (t - 8 - pause + 1) / 5));
        const k = t - 8; if (pause === 0 || k < 0) return old(t); if (k < 4) return old(8) * (1 - (k + 1) / 5); if (k < 4 + pause) return 0; const j = k - 4 - pause; return j < 4 ? old(8) * (j + 1) / 5 : old(t - pause);
      });
      const naive = trace('naive'), chunking = trace('chunking'), sync = trace('synchronous'), peak = (values: number[]) => Math.max(...values.slice(1).map((v, i) => Math.abs(v - values[i]))), n = peak(naive), r = peak(chunking);
      c.readoutNumbers(0, [delay]); c.readoutNumbers(1, n > 0.3 ? [delay, round(n, 2), 0.3, 20] : [delay, 0.3, 20]); c.readoutNumbers(2, [pause * 20]); c.readoutNumbers(3, [...(pause ? [pause * 0.02] : []), round(n, 2), round(r, 2), 0.3]);
      for (const t of [0, 6, 12, 18, 24, 29]) c.row(String(t), { synchronous: sync[t].toFixed(2), naive: naive[t].toFixed(2), chunking: chunking[t].toFixed(2) });
    },
  },
  'interactive:LatentImagination': {
    basis: [{ id: 'assumption:LatentImagination:affine-error-recurrence', kind: 'assumption', reference: 'Authored recurrence d_next=d+epsilon*(1+0.02d), so d(H)=50*((1+0.02epsilon)^H-1). The 3–15 step band and reward error 0.35d are illustrative, not measured model reliability.' }], evidencePaths: ['lib/latent-imagination.ts'], seriesIds: ['typical-range', 'deviation'],
    check(c) {
      const horizon = c.input(/^How far ahead to imagine/), percent = c.input(/^How accurate each step is/), e = percent / 100, deviation = (h: number, error = e) => 50 * ((1 + 0.02 * error) ** h - 1), print = (v: number) => v >= 10 ? v.toFixed(1) : v >= 1 ? v.toFixed(2) : v.toFixed(3), current = Number(print(deviation(horizon)));
      c.readoutWhere({ key: /^\d+$/, text: /^\d+ steps?$/ }, [horizon]); c.readoutWhere({ text: /% off per step$/ }, [percent]); c.readoutWhere({ text: /steps? ahead.*off the route/ }, [horizon, current, ...(c.selected(/^TD-MPC2/) ? [Number(print(deviation(horizon) * 0.35))] : [])]); c.readoutWhere({ key: /^deviation-readout$/ }, [current]);
      if (c.selected(/^TD-MPC2/)) c.readoutWhere({ key: /^reward-error-readout$/ }, [Number(print(deviation(horizon) * 0.35))]);
      for (const h of [...new Set([0, 10, 20, 30, 40, 50, horizon])]) c.row(String(h), { deviation: print(deviation(h)), range: h < 3 ? 'before illustrative band' : h <= 15 ? 'inside illustrative band' : 'past illustrative band', playhead: h === horizon ? 'playhead' : 'off' });
      const x = (h: number) => 40 + h / 50 * 282, y = (d: number) => 116 - d / (deviation(50, 0.06) * 1.05) * 100, path = (start: number, end: number) => Array.from({ length: end - start + 1 }, (_, i) => `${i ? 'L' : 'M'}${x(start + i).toFixed(2)} ${y(deviation(start + i)).toFixed(2)}`).join(' ');
      c.rectCount('typical-range', 1); c.svgMark('typical-range', 'rect', { x: x(3), y: 16, width: x(15) - x(3), height: 100 }); c.svgMarkCount('deviation', 'path', horizon === 50 ? 1 : 2); c.svgMark('deviation', 'path', { d: path(0, horizon) }); if (horizon < 50) c.svgMark('deviation', 'path', { d: path(horizon, 50) });
    },
  },
  'interactive:JepaPlanning': {
    basis: [{ id: 'assumption:JepaPlanning:prescribed-contraction', kind: 'assumption', reference: 'Authored Euclidean latent plane begins at (0.16,0.74), with goal (0.83,0.28) or (0.62,0.82). Each selected action moves 42% toward the goal rotated by ±pi/3*(64-candidates)/60, plus a 5% golden-angle wobble. This is not the paper’s L1 feature energy or CEM solver.' }], evidencePaths: ['lib/jepa-planning.ts'],
    check(c) {
      const candidates = c.input(/^Options tried each step/), steps = Number(c.sourceState('data-source-step')); if (!Number.isInteger(steps) || steps < 0 || steps > 12) throw new Error('invalid planning-step input');
      const goal = c.selected(/^Cup on the shelf$/) ? [0.62, 0.82] : [0.83, 0.28]; let x = 0.16, y = 0.74; const initial = Math.hypot(goal[0] - x, goal[1] - y);
      for (let s = 0; s < steps; s++) { const dx = goal[0] - x, dy = goal[1] - y, distance = Math.hypot(dx, dy), theta = Math.PI / 3 * (64 - candidates) / 60 * (s % 2 ? -1 : 1), wobble = 2.399963229728653 * (s + 1); x += 0.42 * (dx * Math.cos(theta) - dy * Math.sin(theta)) + 0.05 * distance * Math.cos(wobble); y += 0.42 * (dx * Math.sin(theta) + dy * Math.cos(theta)) + 0.05 * distance * Math.sin(wobble); }
      const distance = Math.hypot(goal[0] - x, goal[1] - y); c.readoutNumbers(0, [candidates]); c.readoutNumbers(1, distance <= 0.03 ? [steps] : [steps, Math.round(distance / initial * 100), candidates]); c.readoutNumbers(2, [round(distance, 3)]); c.readoutNumbers(3, [steps]);
    },
  },
  'interactive:ChunkBuffer': {
    basis: [{ id: 'gemini-robotics-2025', kind: 'citation', reference: 'Approximately 250 ms response latency and 50 Hz effective control.' }, { id: 'assumption:ChunkBuffer:replace-latest-buffer', kind: 'assumption', reference: 'The reader chooses the chunk length. At 50 Hz and four answers/second, 13 actions covers every tick; shorter chunks fill four times their length of the 50 ticks.' }], citationText: { 'gemini-robotics-2025': 'Gemini Robotics' }, evidencePaths: ['lib/chunk-buffer.ts'],
    check(c) {
      const k = c.input(/^Actions per chunk$/), enough = Math.ceil(250 * 50 / 1000);
      c.readoutNumbers(0, [k]); c.readoutNumbers(1, k >= enough ? [k, enough] : [k, 50 - 4 * k, 50, enough]);
      c.contains(`Action chunks${enough} actions bridge 250 milliseconds at 50 commands a second`);
      c.contains('Gemini Robotics replies About 250 milliseconds per reply Each reply carries a chunk of actions.');
      c.contains('Robot\'s control clock Needs 50 commands each second.');
      c.contains(`${enough} or more actions per reply cover the wait. Fewer leave the arm idle.`);
      c.contains('Illustrative chunk size');
      c.contains('This card feeder represents the action queue. The robot arm is not drawn: empty belt slots show moments when it waits.');
      c.contains('One action every 20 ms');
      c.contains(`250 ms ÷ 20 ms = 12.5 action intervals Round up → ${enough} actions per reply cover the wait`);
      c.contains("Assumed: one request at a time, the next sent when an answer lands. Gemini Robotics does not publish its chunk length, so the deck size is the reader's; 16 is the chunk GR00T N1 samples.");
    },
  },
  'interactive:RecedingHorizon': {
    basis: [{ id: 'assumption:RecedingHorizon:ten-hertz', kind: 'assumption', reference: 'The Diffusion Policy configuration is 16 predicted and 8 executed actions at 10 commands/second. For any authored horizon, duration is steps/10 and replans/second is 10/executed steps.' }], evidencePaths: ['lib/receding-horizon.ts'],
    check(c) { const tp = c.input(/^Steps planned,/), ta = c.input(/^Steps acted on,/), rate = Number((10 / ta).toFixed(2)); c.readoutNumbers(0, [tp]); c.readoutNumbers(1, [ta]); c.readoutNumbers(2, [tp / 10, ta / 10, rate]); c.readoutNumbers(3, [ta / 10]); c.readoutNumbers(4, [rate]); c.contains(`Receding horizon${tp>ta?`Plan ${(tp/10).toFixed(1)} seconds ahead; act on ${(ta/10).toFixed(1)} seconds, then rethink`:`Follow all ${(tp/10).toFixed(1)} seconds without replanning`}`); c.contains(tp>ta?`Acting on only the first ${(ta/10).toFixed(1)} seconds of each plan lets the robot correct course often while its motion stays smooth.`:`Without replanning, the robot follows all ${(tp/10).toFixed(1)} seconds of each plan blind and cannot react to surprises.`); },
  },
  'interactive:MotInsulation': {
    basis: [{ id: 'knowledge-insulation-paper-2025', kind: 'citation', reference: 'The source reports 7.5 times fewer training steps for the stated table-bussing comparison.' }, { id: 'assumption:MotInsulation:eight-trays', kind: 'assumption', reference: 'Eight trays are an authored abstraction of layers; the language score declines linearly from 92 to 34 only when an uninsulated backward pass crosses them.' }], evidencePaths: ['lib/knowledge-insulation.ts'],
    check(c) { const depth = c.input(/^Pass depth$/); c.readoutNumbers(0, [depth, 8]); c.readoutNumbers(1, [depth, 8]); c.readoutNumbers(4, c.selected(/^backward pass$/) && c.selected(/^Protect language skills:/) ? [depth, 8] : [depth, 8, depth]); c.readoutNumbers(5, [7.5]); },
  },
  'interactive:HandMotionShare': {
    basis: [{ id: 'assumption:HandMotionShare:unequal-two-link-arms', kind: 'assumption', reference: 'Authored human links 30/28 cm and robot links 24/18 cm, starting shoulder 30°, elbow 115°. The check stroke is (0,0)→(7,-7)→(19,4). Exact two-link IK followed by robot FK bounds the copied-joint error; hand-motion replay preserves the stroke.' }], evidencePaths: ['lib/hand-motion-share.ts'],
    check(c) {
      if (c.selected(/^Hand's motion$/)) { c.readoutText(0, "Hand's motion copied · same stroke"); return; }
      const rad = Math.PI / 180, start = (a: number, b: number) => [a * Math.cos(30 * rad) + b * Math.cos(-85 * rad), a * Math.sin(30 * rad) + b * Math.sin(-85 * rad)];
      const human = start(30, 28), robot = start(24, 18), first = Math.hypot(7, 7), total = first + Math.hypot(12, 11); let worst = 0;
      for (let k = 0; k <= 400; k++) {
        const along = total * k / 400, u = along <= first ? along / first : (along - first) / (total - first), dx = along <= first ? 7 * u : 7 + 12 * u, dy = along <= first ? -7 * u : -7 + 11 * u;
        const x = human[0] + dx, y = human[1] + dy, bend = Math.acos(Math.min(1, Math.max(-1, (x * x + y * y - 30 ** 2 - 28 ** 2) / (2 * 30 * 28))));
        const shoulder = Math.atan2(y, x) + Math.atan2(28 * Math.sin(bend), 30 + 28 * Math.cos(bend));
        worst = Math.max(worst, Math.hypot(24 * Math.cos(shoulder) + 18 * Math.cos(shoulder - bend) - robot[0] - dx, 24 * Math.sin(shoulder) + 18 * Math.sin(shoulder - bend) - robot[1] - dy));
      }
      c.readoutNumbers(0, [Math.round(worst * 10) / 10]);
    },
  },
  'interactive:ActuatorGap': {
    basis: [{ id: 'assumption:ActuatorGap:second-order-response', kind: 'assumption', reference: 'Authored motor response: command at 0.1, delay 0.04, natural frequency 30, damping 0.45. The learned proxy delays this response by 0.006. Mean absolute error is over 201 evenly spaced samples on [0,1], reported as percent of command.' }], evidencePaths: ['components/interactive/actuator-gap.tsx'],
    check(c) {
      const response = (t: number) => { const u = t - 0.14, root = Math.sqrt(1 - 0.45 ** 2); return u <= 0 ? 0 : 1 - Math.exp(-13.5 * u) * (Math.cos(30 * root * u) + 0.45 / root * Math.sin(30 * root * u)); };
      const gap = (learned: boolean) => Math.round(Array.from({ length: 201 }, (_, k) => Math.abs((learned ? response(k / 200 - 0.006) : k / 200 >= 0.1 ? 1 : 0) - response(k / 200))).reduce((a, b) => a + b, 0) / 201 * 100);
      c.readoutNumbers(0, [gap(c.selected(/^Learned from real legs$/))]);
      c.row('Ideal, instant', { 'average gap to the real motor (% of the move)': gap(false), 'on the real robot': 'falls at its first step' }); c.row('Learned from real legs', { 'average gap to the real motor (% of the move)': gap(true), 'on the real robot': 'walks' });
    },
  },
  'interactive:OfflineValueOverreach': {
    basis: [{ id: 'assumption:OfflineValueOverreach:penalized-extrapolation', kind: 'assumption', reference: 'Authored reward 0.15+0.7 exp(-((x-0.45)/0.22)^2); outside [0.18,0.57], guess adds 2.4 d^1.1 minus 1.2 caution d. Select the greatest guess on x=0,0.01,...,1, and print scores relative to 1.15.' }], evidencePaths: ['components/interactive/offline-value-overreach.tsx'],
    check(c) {
      const result = (x: number) => 0.15 + 0.7 * Math.exp(-(((x - 0.45) / 0.22) ** 2));
      const guess = (x: number, caution: number) => { const outside = Math.max(0, 0.18 - x, x - 0.57); return result(x) + 2.4 * outside ** 1.1 - 1.2 * caution / 10 * outside; };
      const pick = (caution: number) => { let best = 0; for (let k = 1; k <= 100; k++) if (guess(k / 100, caution) > guess(best, caution)) best = k / 100; return best; };
      const score = (v: number) => Math.round(v / 1.15 * 100), caution = c.input(/^Caution about untried actions/), selected = pick(caution);
      c.readoutNumbers(0, [caution, 10]); c.readoutNumbers(1, [score(guess(selected, caution)), score(result(selected))]);
      for (const level of [0, 4, 5, 10]) { const x = pick(level); c.row(String(level), { 'squeeze picked (% of the way to hard)': Math.round(x * 100), 'expected score (of 100)': score(guess(x, level)), 'real score (of 100)': score(result(x)) }); }
    },
  },
  'interactive:ChunkSizeCurve': {
    basis: [{ id: 'assumption:ChunkSizeCurve:qualified-curve', kind: 'assumption', reference: 'ACT publishes 1% at k=1 and 44% at k=100. The authored curve uses 0.01*44^(log(k)/log(100)) through those anchors and 0.44 exp(-(k-100)/800) afterwards. Decisions are ceil(400/k); only anchors are measured.' }], evidencePaths: ['lib/chunk-size.ts'], seriesIds: ['illustrative-taper', 'measured-rise'],
    check(c) {
      const k = c.input(/^Moves per plan, any value/), value = (v: number) => v <= 100 ? 0.01 * 44 ** (Math.log(v) / Math.log(100)) : 0.44 * Math.exp(-(v - 100) / 800), percent = (v: number) => (100 * value(v)).toFixed(100 * value(v) < 10 && !Number.isInteger(100 * value(v)) ? 1 : 0);
      const x = (v: number) => Number((44 + Math.log(v) / Math.log(400) * 274).toFixed(2)), y = (v: number) => Number((174 - v * 208).toFixed(2)), decisions = (v: number) => Math.ceil(400 / v);
      c.readoutNumbers(0, [k]); c.readoutNumbers(1, [k, Number(percent(k)), decisions(k), 400]); c.readoutNumbers(2, [Number(percent(k))]); c.readoutNumbers(3, [decisions(k)]);
      for (const v of [1, 25, 50, 100, 200, 300, 400]) c.row(String(v), { success: `${percent(v)}%`, decisions: decisions(v), provenance: v === 1 || v === 100 ? 'measured' : v < 100 ? 'interpolated' : 'estimated', playhead: v === k ? 'playhead' : 'off' });
      c.circleCount(3); c.point('measured k=1', x(1), y(0.01), 2.5); c.point('measured k=100', x(100), y(0.44), 2.5); c.point('selected chunk', x(k), y(value(k)), 4.5);
      for (const [id, values] of [['measured-rise', Array.from({ length: 100 }, (_, i) => i + 1)], ['illustrative-taper', Array.from({ length: 61 }, (_, i) => 100 + i * 5)]] as const) { c.svgMarkCount(id, 'path', 1); c.svgMark(id, 'path', { d: values.map((v, i) => `${i ? 'L' : 'M'}${x(v)},${y(value(v))}`).join(' ') }); }
    },
  },
  'interactive:LatencyComparison': {
    basis: [{ id: 'assumption:LatencyComparison:qualified-staleness-model', kind: 'assumption', reference: 'Authored throughput, not measured paper data: action=0.8/(1+(delay/125)^3); score clamps (action-0.55)/0.20 to [0,1]. The 24-tick trace blends to that action over ticks 8–10; RTC stays at 0.8 and score 1.' }], evidencePaths: ['lib/latency-chunking.ts'], seriesIds: ['lc-score-rtc', 'lc-score'],
    check(c) {
      const delay = c.input(/^Thinking delay, any value/), action = (d: number) => 0.8 / (1 + (d / 125) ** 3), score = (d: number) => Math.min(1, Math.max(0, (action(d) - 0.55) / 0.2)), status = (d: number) => score(d) >= 0.95 ? 'nominal' : score(d) > 0 ? 'degraded' : 'failed';
      c.contains('Blue line: the movement the robot executes.');
      c.contains(delay === 0 ? 'With no delay, the robot stays on the old plan. Add a delay to see how combining it with a late replacement can create an unchosen move.' : `The old plan and a late replacement propose different moves. Averaging combines those proposals into a move neither plan chose. ${Math.abs(Math.abs(action(delay)) - 0.8) > 0.25 ? 'That unchosen move hits the obstacle.' : 'At this delay, the combined move still clears the obstacle.'}`);
      c.readoutNumbers(0, delay === 0 ? [] : [delay / 1000]); c.readoutNumbers(1, [Math.round(score(delay) * 100), 100]); c.readoutNumbers(2, [Math.round(score(delay) * 100)]); c.readoutNumbers(4, [100]);
      const summary = { tableHeaders: ['delay (ms)', 'ensembling', 'chunking', 'ensembling status', 'playhead'] }, trace = { tableHeaders: ['tick', 'ensembling', 'chunking', 'ensembling validity'] };
      for (const d of [...new Set([0, 60, 100, 140, 200, 240, delay])]) c.row(String(d), { ensembling: `${Math.round(score(d) * 100)}%`, chunking: '100%', 'ensembling status': status(d), playhead: d === delay ? 'playhead' : 'off' }, summary);
      for (const tick of [0, 4, 8, 12, 18, 23]) { const a = 0.8 + (action(delay) - 0.8) * Math.min(1, Math.max(0, (tick - 7) / 3)); c.row(String(tick), { ensembling: a.toFixed(2), chunking: '0.80', 'ensembling validity': Math.abs(Math.abs(a) - 0.8) <= 0.25 ? 'on a mode' : 'off-mode' }, trace); }
      const x = (d: number) => Number((44 + d / 240 * 282).toFixed(2)), y = (p: number) => Number((106 - 72 * p).toFixed(2));
      for (const [id, fn] of [['lc-score-rtc', () => 1], ['lc-score', score]] as const) { c.svgMarkCount(id, 'circle', 1); c.svgMark(id, 'circle', { cx: x(delay), cy: y(fn(delay)), r: 2.5 }); c.svgMarkCount(id, 'path', 1); c.svgMark(id, 'path', { d: Array.from({ length: 61 }, (_, i) => `${i ? 'L' : 'M'}${x(i * 4)},${y(fn(i * 4))}`).join(' ') }); }
    },
  },
  'interactive:CompoundingError': {
    basis: [{ id: 'assumption:CompoundingError:additive-recurrence', kind: 'assumption', reference: 'At each decision add epsilon*(1+0.01*deviation); chunk decisions occur every 25 moves; the teacher removes 75% of deviation every 20 moves. Sum all deviations. Reference curves epsilon*T*(T+1)/2 and epsilon*T are scalings, not theorem bounds on this recurrence.' }], evidencePaths: ['lib/compounding-error.ts'], seriesIds: ['quadratic-reference', 'linear-reference', 'summed-deviation'],
    check(c) {
      const percent = c.input(/^How big each slip is/), steps = c.input(/^How many moves the task has/), chunk = c.selected(/^25 moves per plan$/), teacher = c.selected(/^A teacher corrects it$/), e = percent / 100;
      let d = 0, sum = 0; const ds = [0], sums = [0];
      for (let t = 1; t <= 240; t++) { if (!chunk || (t - 1) % 25 === 0) d += e * (1 + 0.01 * d); if (teacher && t % 20 === 0) d *= 0.25; ds.push(d); sum += d; sums.push(sum); }
      // The positive integer horizon is split at its nearest whole move.
      const printed = (v: number) => v >= 100 ? String(Math.round(v)) : v >= 1 ? v.toFixed(1) : v.toFixed(3), half = Math.floor((steps + 1) / 2);
      const ratio = Math.round(sums[half] > 0 ? sums[steps] / sums[half] : 1), ratioWords = ratio <= 1 ? 'about as far' : ratio === 2 ? 'about twice as far' : `about ${({ 3: 'three', 4: 'four', 5: 'five', 6: 'six', 7: 'seven', 8: 'eight', 9: 'nine' } as Record<number, string>)[ratio] ?? ratio} times as far`;
      c.contains(`Compounding errorTwice the task: ${ratioWords} off course`);
      c.contains(`Copying an expert for twice as long leaves the robot ${ratioWords} off course as its small slips accumulate.`);
      c.readoutNumbers(0, [percent]); c.readoutNumbers(1, [steps]); c.readoutNumbers(2, [steps, Number(printed(sums[steps])), half, Number(printed(sums[half]))]); c.readoutNumbers(3, [Number(printed(sums[steps]))]); c.readoutNumbers(4, [Number(printed(sums[half]))]); c.readoutNumbers(5, [Number(printed(ds[steps]))]);
      for (const t of [0, 48, 96, 144, 192, 240]) c.row(String(t), { simulated: printed(sums[t]), 'εT(T+1)/2': printed(e * t * (t + 1) / 2), 'εT': printed(e * t) });
      const x = (t: number) => Number((48 + t / 240 * 258).toFixed(1)), y = (v: number) => Number((Math.round((154 - Math.log10(1 + v / 100) / Math.log10(51) * 122) * 100) / 100).toFixed(1));
      for (const [id, stride, fn] of [['quadratic-reference', 2, (t: number) => e * t * (t + 1) / 2], ['linear-reference', 2, (t: number) => e * t], ['summed-deviation', 1, (t: number) => sums[t]]] as const) { c.svgMarkCount(id, 'path', 1); c.svgMark(id, 'path', { d: Array.from({ length: 240 / stride + 1 }, (_, i) => `${i ? 'L' : 'M'}${x(i * stride)},${y(fn(i * stride))}`).join(' ') }); }
      c.svgMarkCount('summed-deviation', 'circle', 1); c.svgMark('summed-deviation', 'circle', { cx: x(steps), cy: y(sums[steps]), r: 4.5 });
    },
  },
  'interactive:DeploymentEconomics': {
    basis: [{ id: 'assumption:DeploymentEconomics:calendar-payback', kind: 'assumption', reference: 'Authored cell model: effective cycle=cycle+(1-success)*jam seconds; available seconds=3600*uptime; value per month=picks/hour*730*cycle*wage/3600. Cell price is robot price times integration multiple; target is 24 months, amortization 60 months.' }], evidencePaths: ['lib/deployment-economics.ts'],
    check(c) {
      const jam = c.input(/^Time to fix each jam/), price = c.input(/^Robot price/), multiple = c.input(/^Whole cell cost/), cycle = c.input(/^Seconds per pick/), uptime = c.input(/^Share of time/), success = c.input(/^Picks that succeed/), wage = c.input(/^Hourly wage/);
      const months = (seconds: number, percent: number) => price * multiple * (cycle + (1 - percent / 100) * seconds) / (uptime / 100 * 730 * cycle * wage), payback = months(jam, success);
      [[jam >= 60 ? Number((jam / 60).toFixed(1)) : jam], [price / 1000], [multiple], [cycle], [uptime], [success], [wage], [24], [Number(payback.toFixed(1))]].forEach((v, index) => c.readoutNumbers(index, v));
      for (const seconds of [5, 15, 60, 120, 180, 240, 300]) c.row(String(seconds), { 'payback at 99.9% success': months(seconds, 99.9).toFixed(1), 'payback at 99% success': months(seconds, 99).toFixed(1) });
      const productive = uptime / 100 * cycle / (cycle + (1 - success / 100) * jam), jams = uptime / 100 - productive;
      c.requireSeries(uptime === 100 ? ['economics-productive', 'economics-jam-clearing'] : ['economics-productive', 'economics-jam-clearing', 'economics-downtime']);
      if (uptime === 100) { c.zeroSeries('economics-downtime', 'Model downtime = 3600 × (1 - uptime/100), exactly zero at 100 percent uptime.'); c.contains('downtime 0 s'); }
      c.rectCount('economics-productive', 1); c.rect('economics-productive', 0, 1.2, productive * 150, 2.6); c.rectCount('economics-jam-clearing', 1); c.rect('economics-jam-clearing', productive * 150, 1.2, jams * 150, 2.6);
      c.svgMarkCount('economics-downtime', 'path', uptime === 100 ? 0 : 1); if (uptime !== 100) c.svgMark('economics-downtime', 'path', { d: `M${uptime * 1.5} 1.2H150V3.8H${uptime * 1.5}Z` });
    },
  },
  'interactive:LinearizationGap': {
    basis: [{ id: 'assumption:LinearizationGap:tangent-error', kind: 'assumption', reference: 'For an authored 50 cm arm and angle a, the tangent point differs by (50(1-cos(a)),50(a-sin(a))); the displayed miss is its Euclidean norm.' }],
    evidencePaths: ['lib/linearization-gap.ts'],
    check(c) { const spread = c.input(/^How uncertain the guess is$/), radians = spread * Math.PI / 180; c.readoutNumbers(0, [spread]); c.readoutNumbers(1, [spread, Number((50 * Math.hypot(1 - Math.cos(radians), radians - Math.sin(radians))).toFixed(1))]); },
  },
  'interactive:DeltaFrame': {
    basis: [{ id: 'assumption:DeltaFrame:five-centimetre-chord', kind: 'assumption', reference: 'The authored local forward delta has length 5 cm. Reading it in the table frame instead of the tool frame makes a chord of length 10 sin(angle/2); a correctly expressed delta has zero gap.' }],
    evidencePaths: ['lib/delta-frame.ts'],
    check(c) { const angle = c.input(/^Tool turned$/), tool = c.selected(/^The tool's frame$/); c.readoutNumbers(0, [angle]); c.readoutNumbers(1, tool || angle === 0 ? [angle] : [angle, Math.round(100 * Math.sin(angle * Math.PI / 360)) / 10]); },
  },
  'interactive:ContactGeometry': {
    basis: [{ id: 'assumption:ContactGeometry:contact-tolerances', kind: 'assumption', reference: 'Authored contact-model error is compared with representative 20 mm walking tolerance and 0.5 mm insertion clearance. The illustrated contacts and patch sizes are not measured solver output.' }],
    evidencePaths: ['lib/contact-geometry.ts'],
    check(c) { const error = c.input(/^Contact-model error epsilon/); c.readoutNumbers(0, [error]); c.readoutText(1, `One ${error.toFixed(1)} mm error · ${error <= 20 ? 'legs reach' : 'legs fall short'} · ${error <= 0.5 ? 'peg goes in' : 'peg jams'}`); c.readoutNumbers(2, [error]); c.readoutNumbers(3, [error]); },
  },
  'interactive:SceneSplit': {
    basis: [{ id: 'assumption:SceneSplit:twenty-episodes', kind: 'assumption', reference: 'Four scenes with five episodes each. The authored seed-7 random draw has five test cards in three scenes, each also represented in training; holding out scene four leaves one test scene with no training overlap.' }],
    evidencePaths: ['components/iso/figures/split-card-rack.ts'],
    check(c) { c.readoutText(0, c.selected(/^Hold out scene 4$/) ? 'Scene 4 held out · test cards from 1 scene · none in training' : 'Random episodes · test cards from 3 scenes · all 3 also in training'); },
  },
  'interactive:BearCaseLock': {
    basis: [{ id: 'assumption:BearCaseLock:four-premises', kind: 'assumption', reference: 'The four article watchlist premises are an AND condition; two start partial and none met. Reader toggles are suppositions, not new research results.' }],
    evidencePaths: ['lib/bear-case.ts', 'components/iso/figures/bear-lock.ts'],
    check(c) { const count = [/^10,000 humanoids doing useful work$/, /^Over 90% task success in new homes$/, /^Cost per job matches a specialist machine$/, /^More data predictably improves task success$/].filter(label => c.selected(label)).length; c.readoutNumbers(0, count === 0 ? [4, 2] : count === 4 ? [4] : [count, 4]); },
  },
  'interactive:HelixClockwork': {
    basis: [{ id: 'helix-02-2026', kind: 'citation', reference: 'Figure reports S0 at 1000 Hz and S1 at 200 Hz, hence five control steps per joint target.' }, { id: 'assumption:HelixClockwork:elapsed-clock', kind: 'assumption', reference: 'The authored demonstration counts completed ticks from zero at the native elapsed-millisecond setting.' }],
    citationText: { 'helix-02-2026': "Rates from Figure's Helix 02 announcement (January 2026)." }, evidencePaths: ['components/iso/figures/helix-clockwork.ts'],
    check(c) {
      const ms = Math.floor(c.input(/^Time on the clock$/) + 1e-9); c.readoutNumbers(0, [ms]); c.readoutNumbers(1, [ms, ms, Math.floor(ms / 5)]);
      c.contains("Helix 02 is the company Figure's system for controlling robots.");
      c.contains('Dark hand: 1,000 whole-body control steps each second; blue hand: 200 joint targets each second.');
      c.contains('5 control steps for each new joint target.');
    },
  },
  'interactive:Ros2Interfaces': {
    basis: [{ id: 'ros2-interfaces-2026', kind: 'citation', reference: 'Topics stream, services request/reply, actions provide feedback and result with cancellation.' }, { id: 'assumption:Ros2Interfaces:example-messages', kind: 'assumption', reference: 'The four pictures, one gripper query and 30/60-percent action updates are illustrative message contents, not throughput measurements.' }],
    evidencePaths: ['components/interactive/ros2-interfaces.tsx'],
    nonQuantitative: 'Message routing has no metric axis. The two authored progress percentages are checked as exact table contents.',
    check(c) {
      c.row('Topic', { 'messages, in order': 'picture; picture; picture; picture', reply: 'none' });
      c.row('Service', { 'messages, in order': 'Is the gripper closed?; Yes', reply: 'one answer' });
      c.row('Action', { 'messages, in order': 'Goal: fetch the cup; Progress: 30%; Progress: 60%; Done: cup fetched', reply: 'progress, then a result' });
    },
  },
  'interactive:Ros2PolicyLayout': {
    basis: [{ id: 'ros2-qos-2026', kind: 'citation', reference: 'The default reliable QoS profile keeps the last 10 messages.' }, { id: 'ros2-realtime-docs-2026', kind: 'citation', reference: 'Real-time guidance bounds allocation and blocking in the controller path.' }, { id: 'assumption:Ros2PolicyLayout:proposed-graph', kind: 'assumption', reference: 'The recommended six-node topology and single command gate are an authored architecture, not a measured timing diagram.' }],
    evidencePaths: ['components/interactive/ros2-policy-layout.tsx'], seriesIds: ['sensing', 'commands'],
    nonQuantitative: 'Arrow locations encode graph connectivity, not numbers or elapsed time; no numerical readout or data table is mounted.',
    check(c) { c.contains('keeps the last 10 messages'); c.contains('the only node that publishes commands'); },
  },
  'interactive:TrajectoryStitching': {
    basis: [{ id: 'offline-rl-vs-bc-2022', kind: 'citation', reference: 'Offline value learning can join useful parts of recorded trajectories.' }, { id: 'cog-2020', kind: 'citation', reference: 'COG chains skills from prior data.' }, { id: 'assumption:TrajectoryStitching:two-runs', kind: 'assumption', reference: 'The two authored tracks share a junction: run one misses the goal; switching to run two reaches it. Run numbers are identities, not performance measures.' }],
    evidencePaths: ['components/interactive/trajectory-stitching.tsx'], nonQuantitative: 'The schematic topology has no distance or success-rate claim; the exact run identities and categorical outcomes are checked.',
    check(c) { c.row('Copy one run', { 'recorded runs used': 'run 1', 'reaches the goal': 'no' }); c.row('Join useful pieces', { 'recorded runs used': 'run 1, then run 2', 'reaches the goal': 'yes' }); },
  },
  'interactive:HindsightRelabel': {
    basis: [{ id: 'her-2017', kind: 'citation', reference: 'HER recomputes goal-dependent reward for an achieved goal.' }, { id: 'assumption:HindsightRelabel:binary-push', kind: 'assumption', reference: 'The authored puck misses its original goal but occupies its achieved goal, so binary rewards are 0 and 1 respectively.' }], evidencePaths: ['components/interactive/hindsight-relabel.tsx'],
    check(c) { c.readoutNumbers(0, [c.selected(/^Where the puck ended$/) ? 1 : 0]); c.row('The given goal', { 'reward (0 or 1)': '0', 'what the robot learns': 'nothing' }); c.row('Where the puck ended', { 'reward (0 or 1)': '1', 'what the robot learns': 'how to push the puck to this spot' }); },
  },
  'interactive:ReplayReuse': {
    basis: [{ id: 'ppo-2017', kind: 'citation', reference: 'PPO updates from the current on-policy batch.' }, { id: 'sutton-barto-2018', kind: 'citation', reference: 'Off-policy learners can reuse behavior-policy experience.' }, { id: 'assumption:ReplayReuse:six-batches', kind: 'assumption', reference: 'Six authored collection rounds produce one current on-policy batch or six retained off-policy batches, without a sample-efficiency claim.' }], evidencePaths: ['components/interactive/replay-reuse.tsx'],
    check(c) { c.row('Use fresh experience', { 'batches usable after 6 rounds': '1', 'older batches': 'thrown away' }); c.row('Reuse saved experience', { 'batches usable after 6 rounds': '6', 'older batches': 'kept in the replay buffer' }); },
  },
  'interactive:DemoOrSim': {
    basis: [{ id: 'reality-gap-survey-2026', kind: 'citation', reference: 'Contact-model fidelity differs between walking and manipulation.' }, { id: 'rudin-2021', kind: 'citation', reference: 'ANYmal flat-ground policy in under four minutes of training.' }, { id: 'act-aloha-2023', kind: 'citation', reference: 'Battery insertion success 80–90% after ten minutes of demonstrations.' }], evidencePaths: ['components/interactive/demo-or-sim.tsx'],
    check(c) {
      c.row('Simulation, trial and error', { 'needs a contact model': 'yes', example: 'ANYmal walked on flat ground after under 4 minutes of training' }); c.row('Real demonstrations', { 'needs a contact model': 'no', example: 'ACT slotted a battery 80 to 90% of the time after 10 minutes of demonstrations' });
      const sim = c.selected(/^Simulation, trial and error$/), demo = c.selected(/^Real demonstrations$/);
      c.compare('exclusive training recipe', true, sim !== demo, sim !== demo);
      c.svgText(null, sim ? 'The simulator’s contact errors carry over' : 'Real demonstrations need no contact model', 2, 16, 0.05, { ownerTestId: 'recipe-stage', requirePaint: true });
    },
  },
  'interactive:NewtonSolvers': {
    basis: [{ id: 'state-of-simulation-2026', kind: 'citation', reference: 'NVIDIA solver inventory and supported material categories.' }, { id: 'newton-manipulation-blog-2026', kind: 'citation', reference: 'Newton release credits Kamino and coupled cable support.' }], evidencePaths: ['components/interactive/newton-solvers.tsx'],
    nonQuantitative: 'The four material examples and solver assignments are categorical; no speed, accuracy or solver benchmark is plotted.',
    check(c) {
      c.row('Robot arms and legs', { solver: 'MuJoCo Warp', 'what the sources say it handles': "jointed robots in generalized coordinates, as Newton's primary backend" });
      c.row('Parts joined in a loop', { solver: 'Kamino', 'what the sources say it handles': 'closed-chain mechanisms, credited to Disney Research' });
      c.row('Cloth and cables', { solver: 'VBD', 'what the sources say it handles': 'rigid bodies, particles, cloth and soft bodies; the cable solver coupled to MuJoCo Warp' });
      c.row('Sand-like materials', { solver: 'implicit MPM', 'what the sources say it handles': 'particle-based continuum materials' });
    },
  },
  'interactive:WmDisambiguator': {
    basis: [{ id: 'assumption:WmDisambiguator:output-taxonomy', kind: 'assumption', reference: 'The original schematic groups model outputs into images, latent summaries and symbolic facts. It does not predict or plot measured model quality.' }], evidencePaths: ['components/interactive/wm-disambiguator.tsx'],
    nonQuantitative: 'These selectable mechanism drawings have no numerical readout, table, quantitative scale or model-performance claim.',
    check(c) { c.contains('Original schematic; the drawings are illustrative.'); },
  },
  'interactive:PlanarFkArm': {
    basis: [{ id: 'assumption:PlanarFkArm:serial-chain', kind: 'assumption', reference: 'Authored planar link lengths 1, 0.75 and 0.55. The tip is the vector sum at cumulative relative joint angles; link units are not a calibrated robot dimension.' }],
    evidencePaths: ['lib/planar-fk.ts'],
    check(c) {
      const a = c.input(/^Turn the shoulder/), b = c.input(/^Bend the elbow/), d = c.input(/^Bend the wrist/), rad = Math.PI / 180;
      const x = Math.cos(a * rad) + 0.75 * Math.cos((a + b) * rad) + 0.55 * Math.cos((a + b + d) * rad);
      const y = Math.sin(a * rad) + 0.75 * Math.sin((a + b) * rad) + 0.55 * Math.sin((a + b + d) * rad);
      c.readoutNumbers(0, [b]); c.readoutNumbers(1, [d]); c.readoutNumbers(2, [a, Number(x.toFixed(2)), Number(y.toFixed(2))]);
      const across = Math.abs(x) < 0.005 ? 'level with the shoulder' : `${Math.abs(x).toFixed(2)} ${x < 0 ? 'left' : 'right'}`;
      const out = Math.abs(y) < 0.005 ? 'level' : `${Math.abs(y).toFixed(2)} ${y < 0 ? 'back' : 'out'}`;
      c.readoutText(3, `Shoulder ${Math.round(a)} degrees · hand ${across}, ${out} from the shoulder, in upper-arm lengths`);
    },
  },
  'interactive:ImpedancePress': {
    basis: [{ id: 'hogan-1985', kind: 'citation', reference: 'One-axis stationary impedance reduces to spring force k × (target - tool).' }, { id: 'assumption:ImpedancePress:unitless-springs', kind: 'assumption', reference: 'Authored spring rates 1, 2 and 4 dial marks per ruler mark, a surface at zero, and no force in newtons claimed.' }],
    citationText: { 'hogan-1985': 'Hogan (1985)' }, evidencePaths: ['lib/impedance-press.ts'],
    check(c) {
      const target = c.input(/^Target$/), soft = c.selected(/^Soft$/), stiff = c.selected(/^Stiff$/), rate = soft ? 1 : stiff ? 4 : 2;
      const name = soft ? 'Soft' : stiff ? 'Stiff' : 'Medium', magnitude = Math.abs(target), words = `${Number.isInteger(magnitude) ? magnitude : magnitude.toFixed(1)} ${magnitude === 1 ? 'mark' : 'marks'}`;
      const targetText = target === 0 ? 'on the surface' : `${words} ${target < 0 ? 'short of surface' : 'past surface'}`;
      c.readoutText(0, targetText);
      // Current DOM collector: native Target first, then four visible dial labels.
      [0, 4, 8, 12].forEach((mark, index) => c.readoutNumbers(index + 1, [mark]));
      const push = rate * Math.max(0, target);
      c.readoutText(5, `${name} · ${targetText} · ${target <= 0 ? 'no push' : `push ${Number.isInteger(push) ? push : push.toFixed(1)} dial marks`}`);
      c.contains(`Impedance action${target > 0 ? 'Stiffness sets how hard the tool pushes on contact' : target < 0 ? 'Before contact, stiffness has nothing to push against' : 'At the surface, the tool touches without pushing'}`);
      c.contains(target > 0 ? `The surface stops the tool. Stiffness ${rate} times a target gap of ${target} ruler marks gives ${Number.isInteger(push) ? push : push.toFixed(1)} dial marks of push.` : target < 0 ? 'Before contact, the tool follows the target and pushes on nothing.' : 'Target and tool meet the surface with no gap, so there is no push.');
      c.contains('Action stiffness');
      c.contains('An action sends target and stiffness; once the surface stops the tool, push equals stiffness times target gap.');
      c.contains(`An action sends target and stiffness; once the surface stops the tool, push equals stiffness times target gap. Action: target ${target > 0 ? '+' : ''}${target} and stiffness ${rate}.Action stiffnessSoftMediumStiffTarget${targetText}Run the press Controller: uses these settings to make the tool act like a spring.`);
      c.contains('Controller: uses these settings to make the tool act like a spring.');
      c.contains(`Surface stops tool Shown target: ${targetText}`);
      c.contains('Target is where to aim. Stiffness sets how strongly the tool behaves like a spring.');
      c.contains(target > 0
        ? `Stopped tool Target level Marked target gap: ${target} ruler ${target === 1 ? 'mark' : 'marks'} from the stopped tool to the target level.`
        : `Tool and target ${target < 0 ? 'Tool follows target.' : 'Tool and target meet at the surface.'} Marked target gap: 0 ruler marks.`);
      // Retained method content is source-bound even while its native fold is
      // closed. Physical paint/geometry is measured only after native opening.
      c.contains(`${target > 0 ? 'The surface stops the tool.' : target < 0 ? 'Before contact, the tool follows its target without pushing.' : 'No target gap means no push.'}${target > 0 ? 'Stopped tool Target level' : 'Tool and target'}`);
      // Bind both the equation and each labelled copy to the same independent
      // values; a correct readout cannot hide a wrong operand description.
      c.contains(`Shown response ${target > 0 ? 'The surface stops the tool.' : target < 0 ? 'Before contact, the tool follows its target without pushing.' : 'Tool and target meet the surface without pushing.'} Surface stops tool Shown target: ${targetText}Schematic push scale from 0 to 12 dial marks, without physical units.04812 ↓ Shown calculation sent stiffness: ${rate} × times target gap: ${Math.max(0, target)} ruler marks = equals push: ${Number(push.toFixed(1))} dial marks ${rate} × ${Math.max(0, target)} = ${Number(push.toFixed(1))}`);
      c.contains('Ruler: target gap. Dial: push.');
      [0, 4, 8, 12].forEach(mark => {
        const angle = (-135 + 270 * mark / 12) * Math.PI / 180;
        c.svgText(null, String(mark), 56 + 46 * Math.sin(angle), 50 - 46 * Math.cos(angle), 0.05, { ownerTestId: 'press-push-dial', dy: null, requirePaint: true });
      });
      c.contains('Spring analogy: target gap');
      c.contains('Schematic ruler and dial marks, with no physical units: springs give 1, 2 or 4 dial marks per ruler mark.');
      c.contains('Once the surface stops the tool, push equals stiffness times how far the target sits past it.');
      c.contains('An impedance action is a target pose plus a stiffness and a damping, and a controller under the policy turns the gap between the target and the tool into a push.');
      c.contains('at rest the push is the stiffness times the gap, and the damping only acts while the tool moves.');
      c.contains('In free space nothing stops the tool, so it rides on the target and the scale reads nothing.');
      c.contains('The same target pushes four times as hard through the stiff spring as through the soft one.');
      c.contains('Illustrative: the three springs push 1, 2 and 4 dial marks per ruler mark of gap, and no force in newtons is claimed.');
      c.contains('Target-and-stiffness control from Hogan (1985): the controller makes the tool behave like a spring.');
    },
  },
  'interactive:ScopeFollow': {
    basis: [{ id: 'scopilot-clearance-2025', kind: 'citation', reference: 'ScoPilot camera-following assistance.' }, { id: 'yang-autonomy-2017', kind: 'citation', reference: 'Level 1 assistance remains subordinate to the surgeon operating the instruments.' }, { id: 'assumption:ScopeFollow:trainer', kind: 'assumption', reference: 'Authored trainer and drill; no tracking accuracy, clearance or physical camera performance is claimed.' }],
    citationText: { 'scopilot-clearance-2025': "Moon Surgical's ScoPilot clearance (2025)", 'yang-autonomy-2017': 'Yang et al., Science Robotics (2017)' },
    evidencePaths: ['components/interactive/scope-follow.tsx'],
    nonQuantitative: 'The illustrated camera behavior is qualitative. The only numeric readout is its source-backed autonomy category, checked against the selected mode.',
    check(c) { c.readoutNumbers(0, [c.selected(/^Follows the tip$/) ? 1 : 0]); c.contains('no number is claimed'); },
  },
  'interactive:KinematicTwin': {
    basis: [{ id: 'gello-2023', kind: 'citation', reference: 'A kinematically matching leader transmits joint readings to its robot counterpart.' }, { id: 'act-aloha-2023', kind: 'citation', reference: 'ALOHA leader/follower teleoperation.' }, { id: 'assumption:KinematicTwin:illustrative-pose', kind: 'assumption', reference: 'Authored leader size and joint stops; numerical readouts repeat the two commanded angles rounded to whole degrees.' }],
    citationText: { 'gello-2023': 'GELLO (2023)', 'act-aloha-2023': 'ALOHA (2023)' }, evidencePaths: ['lib/kinematic-twin.ts'],
    check(c) {
      const shoulder = Math.round(c.input(/^Leader's shoulder$/)), elbow = Math.round(c.input(/^Leader's elbow$/));
      c.readoutNumbers(0, [shoulder]); c.readoutNumbers(1, [elbow]); c.readoutNumbers(2, [shoulder, elbow]);
      c.contains('the copy is exact');
    },
  },
  'interactive:KeypointString': {
    basis: [{ id: 'moka-2024', kind: 'citation', reference: 'Lift the selected image keypoint with calibrated depth.' }, { id: 'robopoint-2024', kind: 'citation', reference: 'Spatial affordance/keypoint grounding with depth.' }, { id: 'assumption:KeypointString:perspective-frame', kind: 'assumption', reference: 'Illustrative ray, image and handle. The image lies 52/122 of the way to the chosen point, rounded to the control floor 0.43; no metric camera distance is claimed.' }],
    citationText: { 'moka-2024': 'MOKA (2024)', 'robopoint-2024': 'RoboPoint (2024)' }, evidencePaths: ['lib/keypoint-lift.ts'],
    nonQuantitative: 'The drawing explains pinhole back-projection without measured intrinsics or distances. Its unitless depth-share control and percentage readouts are checked explicitly.',
    check(c) {
      const share = c.input(/^Depth along the line$/);
      if (share >= 1 - 1e-9) { c.readoutText(0, '100% of the reading'); c.readoutText(1, 'Depth read · target on the handle'); }
      else if (share <= 0.43 + 1e-9) { c.readoutText(0, 'at the image'); c.readoutText(1, 'No depth · just a point in the image'); }
      else { const short = Math.min(99, Math.max(1, Math.round((1 - share) * 100))); c.readoutNumbers(0, [100 - short]); c.readoutNumbers(1, [short]); }
      c.contains('no distance is claimed');
    },
  },
  'interactive:SafetyFilterFence': {
    basis: [{ id: 'ames-cbf-2019', kind: 'citation', reference: 'Control barrier functions preserve an admissible safe set.' }, { id: 'wabersich-safety-filters-2023', kind: 'citation', reference: 'Least-change filtering of proposed controls.' }, { id: 'assumption:SafetyFilterFence:illustrative-stroke', kind: 'assumption', reference: 'The authored playhead is a percentage of an illustrative stroke; no quantitative safety margin or robot-performance value is claimed.' }],
    citationText: { 'ames-cbf-2019': 'Ames and colleagues (2019)', 'wabersich-safety-filters-2023': 'Wabersich and colleagues (2023)' }, evidencePaths: ['components/interactive/safety-filter-fence.tsx'],
    nonQuantitative: 'The fence is a qualitative least-change-rule schematic, with no metric safety margin. Only its authored progress percentage is numerical.',
    check(c) {
      const percent = c.input(/^Along the stroke$/); c.readoutNumbers(0, [percent]); c.readoutNumbers(1, percent >= 100 ? [100] : []); c.contains('no number is claimed');
      c.contains('Safety filterA checked safety filter guards each move the controller proposes');
      c.contains('The simple safety filter is what engineers check.');
      c.contains('Learned controller proposes (trained from data) → Robot executes');
      c.contains('Safe move=The same move, unchanged');
      c.contains('Unsafe move→The smallest correction that stays outside the forbidden area');
    },
  },
  'interactive:NoiseOrEdit': {
    basis: [{ id: 'expo-ft-2026', kind: 'citation', reference: 'Reported EXPO-FT versus DSRL trial counts in the comparison; the cam/peg illustration is not a measured reward landscape.' }, { id: 'assumption:NoiseOrEdit:cam-and-edit', kind: 'assumption', reference: 'One authored action, cam, hole and residual edit demonstrate restricted search support qualitatively.' }],
    citationText: { 'expo-ft-2026': 'EXPO-FT (2026)' }, evidencePaths: ['lib/noise-or-edit.ts'],
    nonQuantitative: 'The displayed search mechanism claims no metric displacement, score or performance estimate; its paper-comparison prose remains separately source-bound.',
    check(c) { c.contains('Schematic: one action'); c.contains('EXPO-FT reached 30 of 30 trials on average, where DSRL averaged 19 of 30'); },
  },
  'interactive:PlannerExploit': {
    basis: [{ id: 'assumption:PlannerExploit:untried-actions', kind: 'assumption', reference: 'The authored one-action curve and a model fitting only tried actions illustrate planner exploitation; no measured score or metric is claimed.' }],
    evidencePaths: ['lib/planner-exploit.ts'],
    nonQuantitative: 'The diagram conveys support/extrapolation qualitatively and states that no number is claimed; there is no numerical readout, table or plotted quantitative binding.',
    check(c) {
      c.contains('Schematic: one action'); c.contains('no number is claimed');
      const inside = c.selected(/^Only inside the data$/);
      c.contains(`Untried actions${inside ? 'Keeping the search inside data avoids this model’s error' : 'The highest predicted score takes planning beyond the data'}`);
      c.contains(inside ? 'The planner still chooses the highest predicted score, now within the range covered by data, where this model agrees with reality.' : 'Choosing the highest predicted score takes the planner past tried actions, where the model guesses beyond its data and gets the score wrong.');
      c.contains(inside ? 'Restricting this planner to the data’s range keeps its highest-scoring choice where this model’s prediction agrees with reality.' : 'The planner maximizes the model’s predicted score, selecting an untried action where a guess beyond the data is wrong.');
    },
  },
  'interactive:ControlLoopBudget': {
    basis: [
      { id: 'vla-perf-2026', kind: 'citation', reference: 'VLA-Perf v1 analytical predictions: 52.57 ms for pi0 on Thor and 162.5 inference Hz on H100; hypothetical pi0-L at 3.9 Hz.' },
      { id: 'pi06-model-card-2025', kind: 'citation', reference: '63 ms per chunk, H100, five denoising steps.' },
      { id: 'real-time-chunking-2025', kind: 'citation', reference: 'Mean total 108.76 ms non-mobile and 138.98 ms mobile under the reported protocol.' },
      { id: 'pi07-2026', kind: 'citation', reference: '12 simulated delay ticks at 50 Hz = 240 ms training-delay setting, not measured latency.' },
      { id: 'assumption:ControlLoopBudget:teaching-curve', kind: 'assumption', reference: 'Toy coordinate 3B uses 52.57 ms; linear below, log-log interpolation to 9.1B at 1000/3.9 ms above. The authored loop budget is 20 ms and the drawn window 160 ms.' },
    ],
    citationText: { 'vla-perf-2026': 'VLA-Perf', 'pi06-model-card-2025': 'π0.6 model card', 'real-time-chunking-2025': 'real-time chunking paper', 'pi07-2026': 'π0.7 paper' },
    evidencePaths: ['lib/control-loop.ts'],
    check(c) {
      const params = c.input(/^Model size on/), server = c.selected(/^Data-center computer$/);
      const curve = (size: number) => size <= 3 ? 52.57 * size / 3 : 52.57 * Math.exp(Math.log(size / 3) * Math.log((1000 / 3.9) / 52.57) / Math.log(9.1 / 3));
      const toy = curve(params), milliseconds = server ? 1000 / 162.5 : toy, hz = Math.round(1000 / milliseconds), missed = Math.max(0, Math.ceil(milliseconds / 20) - 1);
      c.contains(`Control-loop budgetChoosing a move takes ${(milliseconds/20).toFixed(1)} times the available time`);
      c.contains(`Choosing a move takes ${milliseconds.toFixed(1)} milliseconds; the arm has 20 milliseconds between commands. That is ${(milliseconds / 20).toFixed(1)} times the available time.`);
      c.contains('Computer timings are predictions from VLA-Perf, a robot timing study; values for other model sizes are illustrative.');
      c.readoutNumbers(0, [params, Number(toy.toFixed(1))]); c.readoutNumbers(1, [params]); c.readoutNumbers(2, [Number(toy.toFixed(1))]);
      c.readoutNumbers(3, [50, hz, missed]); c.readoutText(4, `${milliseconds <= 20 ? 'closes' : 'does not close'} at 50 Hz`);
      c.readoutNumbers(5, [hz]); c.readoutNumbers(6, [missed]);
      for (const size of [0.5, 1, 2, 3, 6, 9.1]) {
        const time = curve(size);
        c.row(`${size.toFixed(1)}B`, { inference: `${time.toFixed(1)} ms`, 'effective rate': `${Math.round(1000 / time)} Hz`, loop: time <= 20 ? 'closes' : 'does not close' });
      }
      c.requireSeries(milliseconds > 20 ? ['clb-inference', 'clb-overrun'] : ['clb-inference']);
      c.rectCount('clb-inference', 1); c.rect('clb-inference', 14, 24.36, Math.max(2, Math.min(milliseconds, 20) * 308 / 160), 5);
      c.rectCount('clb-overrun', milliseconds > 20 ? 1 : 0);
      if (milliseconds > 20) c.rect('clb-overrun', 52.5, 24.36, (Math.min(milliseconds, 160) - 20) * 308 / 160, 5);
      c.circleCount(10); // Nine control beats plus the annotation's target dot.
      for (let beat = 0; beat < 9; beat += 1) c.point(`control beat ${beat}`, 14 + beat * 38.5, 77.72, 3);
      for (const [label, time] of [['pi0, H100 server', 1000 / 162.5], ['pi0, Jetson Thor', 52.57], ['pi0.6, H100 server', 63], ['RTC mean total, non-mobile robot', 108.76], ['RTC mean total, mobile robot', 138.98], ['pi0.7 training-delay setting', 240]] as const) c.contains(`${label}${Number.isInteger(time) ? time : time.toFixed(2)} ms`);
    },
  },
  'interactive:PerceptionErrorBudget': {
    basis: [{ id: 'realsense-d400-datasheet-2026', kind: 'citation', reference: 'D400 Rev 023 Table 4-15 supplies the 2% cooperative-target reference, not a per-material guarantee.' }, { id: 'assumption:PerceptionErrorBudget:ray-and-rss', kind: 'assumption', reference: 'Authored ray-to-plane miss d tan(theta), depth magnitude at fixed 0.5 m, RSS of three magnitudes, material multipliers 1/3/8, comparison bands 15/30 mm. No statistical error-bound claim.' }],
    evidencePaths: ['lib/perception-error.ts'], seriesIds: ['input', 'total', 'model-band'],
    check(c) {
      const angle = c.input(/^How far the camera is tilted/), distance = c.input(/^Distance to the object/), requested = c.input(/^Depth error/), pose = c.input(/^Object pose/);
      const floor = c.selected(/^transparent bottle/) ? 16 : c.selected(/^specular metal part/) ? 6 : 2;
      const effective = Math.max(requested, floor), hand = distance * 1000 * Math.tan(angle * Math.PI / 180), depth = effective * 5;
      const total = Math.hypot(hand, depth, pose), round = (value: number, digits: number) => Number(value.toFixed(digits));
      const values = [[angle], [distance], [requested], [pose], [round(hand, 1)], [round(depth, 1)], [round(pose, 1)], [round(total, 1)], [round(total, 2), round(depth, 2), effective], [round(total, 2)], [round(depth, 2), effective]];
      values.forEach((numbers, index) => c.readoutNumbers(index, numbers));
      c.readoutText(11, total <= 15 ? 'within model band' : total <= 30 ? 'marginal' : 'above model band');
      c.readoutNumbers(12, hand < 0.05 ? [angle, distance] : [angle, distance, round(hand, 1)]);
      const needed = Math.max(total * 1.15, 36), step = needed <= 40 ? 5 : needed <= 100 ? 10 : 25, ceiling = Math.ceil(needed / step) * step;
      c.rectCount('input', 3); c.rectCount('total', 1);
      [hand, depth, pose].forEach((value, index) => c.rect('input', 76, 38 + index * 30, Math.max(value / ceiling * 212, 1), 14));
      c.rect('total', 76.75, 128.75, Math.max(total / ceiling * 212 - 1.5, 1), 12.5);
    },
  },
  'interactive:QosQueueAge': {
    basis: [{ id: 'ros2-qos-2026', kind: 'citation', reference: 'Default keep-last depth 10; freshest-message depth 1.' }, { id: 'assumption:QosQueueAge:30fps', kind: 'assumption', reference: 'Authored 30-frame/s producer; oldest consumed message is depth/30 seconds old at the chosen full-queue handoff.' }],
    evidencePaths: ['components/interactive/qos-queue-age.tsx'],
    check(c) {
      const newest = c.selected(/^Newest only$/);
      c.readoutNumbers(0, newest ? [0.03] : [10, 0.33]);
      c.cell('Last 10', 'age of the picture used (seconds)', '0.33');
      c.cell('Newest only', 'age of the picture used (seconds)', '0.03');
    },
  },
  'interactive:RetargetingGap': {
    basis: [{ id: 'gmr-retargeting-2025', kind: 'citation', reference: 'Retargeting must resolve body geometry rather than copying joint poses.' }, { id: 'h2o-2024', kind: 'citation', reference: 'Human-to-humanoid body differences motivate retargeting.' }, { id: 'assumption:RetargetingGap:90cm', kind: 'assumption', reference: 'Authored person hip height 90 cm; copying joint pose leaves signed gap 90 × (1 - robot/person leg ratio) cm, rounded to the nearest centimetre.' }],
    evidencePaths: ['components/interactive/retargeting-gap.tsx'],
    check(c) {
      const ratio = c.input(/^Robot.*leg length/), gap = Math.round(90 * (100 - ratio) / 100);
      c.readoutNumbers(0, [ratio]); c.readoutNumbers(1, [gap]);
      for (const value of [...new Set([70, 85, 100, 115, 130, ratio])]) c.cell(String(value), 'lower foot (cm from the floor)', Math.round(90 * (100 - value) / 100));
    },
  },
  'interactive:HandEyePoses': {
    basis: [{ id: 'opencv-hand-eye-docs-2026', kind: 'citation', reference: 'At least two motions with nonparallel axes, hence three poses.' }, { id: 'moveit-hand-eye-tutorial-2026', kind: 'citation', reference: 'Reported calibration plateau around 12–15 poses.' }, { id: 'assumption:HandEyePoses:illustrative-tightening', kind: 'assumption', reference: 'Authored illustrative tightening factor sqrt(poses - 2), not a measured calibration accuracy guarantee.' }],
    evidencePaths: ['components/interactive/hand-eye-poses.tsx'],
    check(c) {
      const poses = c.input(/^Camera poses/), tighter = Number(Math.sqrt(Math.max(0, poses - 2)).toFixed(1));
      c.readoutNumbers(0, [poses, 20]);
      const values = poses < 3 ? [poses] : poses === 3 ? [3, 1] : [poses, tighter, 3];
      c.readoutNumbers(1, values); c.readoutNumbers(2, values);
      for (const value of [...new Set([3, 6, 12, 15, 20, poses])]) c.cell(String(value), 'times tighter than with 3 (illustrative)', value < 3 ? 'not solvable' : Math.sqrt(value - 2).toFixed(1));
    },
  },
  'interactive:ReliabilityCompounding': {
    basis: [{ id: 'assumption:ReliabilityCompounding:independent-steps', kind: 'assumption', reference: 'Independent constant per-step success p: a length-n job completes with probability p^n; these are authored model results, not measured robot trials.' }],
    evidencePaths: ['lib/reliability.ts'],
    check(c) {
      const n = c.input(/^How many steps the job has/), percent = c.input(/^How often each step goes right/);
      const chance = (steps: number) => Number((100 * (percent / 100) ** steps).toFixed(1));
      c.readoutWhere({ key: /^\d+$/, text: /steps?$/ }, [n]);
      c.readoutWhere({ key: /^\d+$/, text: /^\d+(?:\.\d+)?%$/ }, [percent]);
      c.readoutWhere({ text: /per step.*jobs finish/ }, [percent, n, chance(n)]);
      c.readoutWhere({ key: /^per-step-readout$/ }, [percent]); c.readoutWhere({ key: /^episode-success-readout$/ }, [chance(n)]);
      for (const steps of [0, 10, 25, 50, 75, 100]) c.cell(`${steps} steps`, 'episode success', `${chance(steps).toFixed(1)}%`);
    },
  },
  'interactive:ExpoFtResults': {
    basis: [{ id: 'expo-ft-2026', kind: 'citation', reference: 'arXiv 2605.25477v2 four-task comparison; successful trials out of 30, with each method/task count checked independently.' }],
    citationText: { 'expo-ft-2026': "Counts from the EXPO-FT paper's four-task comparison (Dong 2026)." },
    evidencePaths: ['components/interactive/expo-ft-results.tsx'],
    seriesIds: ['sft', 'hg-dagger', 'dsrl', 'hil-serl', 'expo-ft'],
    check(c) {
      const groups = ['Egg Flip', 'Cube Pick', 'Pool Shot', 'Flower Insertion'];
      const rows = [
        ['sft', 'SFT on π0.5', [16, 22, 23, 14]],
        ['hg-dagger', 'HG-DAgger', [18, 26, 14, 24]],
        ['dsrl', 'DSRL', [15, 24, 25, 12]],
        ['hil-serl', 'HIL-SERL', [13, 0, 1, 8]],
        ['expo-ft', 'EXPO-FT', [30, 30, 30, 30]],
      ] as const;
      rows.forEach(([id, label, counts], method) => {
        c.rectCount(id, 4);
        counts.forEach((count, task) => {
          c.cell(groups[task], label, `${count}/30`);
          c.rect(id, 2 + 86 * task, 82 + 44 * method, count / 30 * 58, 2.5);
          c.svgText(id, String(count), 5 + 86 * task + count / 30 * 58, 83.25 + 44 * method);
        });
      });
    },
  },
  'interactive:SpaceLatencyLadder': {
    basis: [{ id: 'falanga-latency-2019', kind: 'citation', reference: 'Stereo camera sensing latency 0.017–0.070 s.' }, { id: 'jpl-ipn-pnt-2024', kind: 'citation', reference: 'Moon round trip 2.5 s; Mars one way 4–20 min, doubled to 8–40 min round trip.' }],
    evidencePaths: ['lib/space-latency.ts'],
    seriesIds: ['drone-camera', 'moon-round-trip', 'mars-round-trip'],
    check(c) {
      const x = (seconds: number) => 10 + (Math.log10(seconds) + 2) * 320 / (Math.log10(3600) + 2);
      c.cell('Sensing delay, drone stereo camera', 'time', '17 to 70 milliseconds');
      c.cell('Round trip, Earth to the Moon', 'time', '2.5 seconds');
      c.cell('Round trip, Earth to Mars', 'time', '8 to 40 minutes');
      c.readoutText(0, '17 to 70 milliseconds'); c.readoutText(1, '2.5 seconds'); c.readoutText(2, '8 to 40 minutes');
      c.circleCount(1); c.point('Moon round trip', x(2.5), 74, 2.5);
      c.rectCount('drone-camera', 1); c.rect('drone-camera', x(0.017), 30, x(0.070) - x(0.017), 8);
      c.rectCount('mars-round-trip', 1); c.rect('mars-round-trip', x(480), 110, x(2400) - x(480), 8);
      c.svgText(null, 'Delay; each tick is 60 times longer', 330, 190);
      c.contains('Delays a robot works withinSignals to Mars and back take 8 to 40 minutes');
    },
  },
  'interactive:UmiCollectionRates': {
    basis: [{ id: 'umi-gripper-site-2024', kind: 'citation', reference: 'UMI project comparison on cup arrangement: 231/h bare hand, 111/h UMI, 35/h Space Mouse. The paper supplies ratios; the site supplies hourly counts.' }],
    evidencePaths: ['lib/umi-collection-rates.ts'], seriesIds: ['bare-hand', 'umi', 'spacemouse'],
    check(c) {
      const rows = [['bare-hand', 'Bare hand, no robot', 231], ['umi', 'UMI handheld gripper', 111], ['spacemouse', 'Spacemouse teleoperation of a robot', 35]] as const;
      rows.forEach(([id, label, count], row) => { c.cell(label, 'demonstrations per hour', count); c.readoutNumbers(row, [count]); c.rectCount(id, 1); c.rect(id, 2, 30 + 46 * row, count * 298 / 250, 12); });
    },
  },
  'interactive:HelixZeroShotSuccess': {
    basis: [{ id: 'helix-2-5-2026', kind: 'citation', reference: 'Figure reports pooled zero-shot task success of 9% from scratch and 56% with Index pretraining in 30 unseen homes; no trial counts.' }, { id: 'assumption:HelixZeroShotSuccess:solved-bar', kind: 'assumption', reference: 'The article authors the 90% solved-generalization bar; it is not a measured Figure result.' }],
    evidencePaths: ['lib/helix-zero-shot.ts'], seriesIds: ['from-scratch', 'index-pretrained'],
    check(c) {
      c.cell('Trained from scratch', 'zero-shot success (percent)', 9);
      c.cell('Helix 2.5, pretrained on Index', 'zero-shot success (percent)', 56);
      c.cell('Bar for solved, this article', 'zero-shot success (percent)', 90);
      c.readoutText(0, '9%'); c.readoutText(1, '56%');
      c.rectCount('from-scratch', 1); c.rect('from-scratch', 6, 45, 9 * 324 / 100, 12);
      c.rectCount('index-pretrained', 1); c.rect('index-pretrained', 6, 89, 56 * 324 / 100, 12);
    },
  },
  'interactive:DroneDeliveryCounts': {
    basis: [{ id: 'zipline-safety-facts', kind: 'citation', reference: 'Safety fact sheet read October 2026: more than 3 million cumulative deliveries.' }, { id: 'wing-walmart-2026', kind: 'citation', reference: '8 June 2026: well over 1 million commercial deliveries.' }, { id: 'walmart-zipline-300-2026', kind: 'citation', reference: '5 November 2026: more than 2 million Walmart drone deliveries; the total overlaps its providers, so it is not a third additive operator bar.' }],
    evidencePaths: ['lib/drone-deliveries.ts'], seriesIds: ['zipline', 'wing'],
    check(c) {
      c.row('Zipline', { 'deliveries, as reported': 'more than 3 million', 'as of': 'fact sheet read October 2026' });
      c.row('Wing', { 'deliveries, as reported': 'well over 1 million', 'as of': 'June 2026' });
      c.readoutText(0, 'more than 3 million'); c.readoutText(1, 'well over 1 million');
      c.rectCount('zipline', 1); c.rect('zipline', 6, 27, 324, 12);
      c.rectCount('wing', 1); c.rect('wing', 6, 71, 108, 12);
    },
  },
  'interactive:RealRobotRlGains': {
    basis: [
      { id: 'rankq-2026', kind: 'citation', reference: 'Cube stacking 43.1% to 88.9%.' },
      { id: 'score-2026', kind: 'citation', reference: 'Eight hand tasks 37.8% to 89.9%.' },
      { id: 'pa-rl-2024', kind: 'citation', reference: 'OpenVLA tasks 40% to 70%.' },
      { id: 'bora-2026', kind: 'citation', reference: 'Standard objects 60.8% to 82.5%.' },
    ], evidencePaths: ['lib/real-robot-rl-gains.ts'],
    check(c) {
      const after = c.selected(/^After extra practice$/);
      c.circleCount(8);
      const rows = [['RankQ, cube stacking', 43.1, 88.9], ['SCORE, eight hand tasks', 37.8, 89.9], ['PA-RL, openvla tasks', 40, 70], ['BORA, standard objects', 60.8, 82.5]] as const;
      rows.forEach(([label, before, next], row) => {
        c.readoutNumbers(row, [after ? next : before]);
        c.row(label, { 'before (%)': before.toFixed(1), 'after (%)': next.toFixed(1), 'gain (points)': (next - before).toFixed(1) });
        c.point(`${label}: baseline`, 116 + before * 2.12, 34 + 44 * row, 3);
        c.point(`${label}: chosen state`, 116 + (after ? next : before) * 2.12, 34 + 44 * row, 3.5);
      });
    },
  },
  'interactive:AvSafetyMiles': {
    basis: [{ id: 'kalra-paddock-2016', kind: 'citation', reference: 'RAND RR-1478 Table 1 row 1: 275 million, 3.9 million and 1.6 million failure-free miles; 95% confidence.' }],
    evidencePaths: ['lib/av-safety-miles.ts'],
    seriesIds: ['fatalities', 'injuries', 'crashes'],
    check(c) {
      c.circleCount(3);
      const rows = [
        ['Fatalities, 1.09 per 100 million miles', '275 million', 275e6, 34],
        ['Reported injuries, 77 per 100 million miles', '3.9 million', 3.9e6, 96],
        ['Reported crashes, 190 per 100 million miles', '1.6 million', 1.6e6, 136],
      ] as const;
      for (const [index, [row, printed, miles, y]] of rows.entries()) {
        c.cell(row, 'failure-free miles at 95% confidence', printed);
        c.readoutText(index, `${printed}; no ${['death', 'reported injury', 'reported crash'][index]}`);
        c.point(row, 10 + (Math.log10(miles) - 6) * 320 / 3, y);
      }
      c.contains('12.5 years');
      c.svgText(null, 'Required miles; each tick is ten times farther', 330, 182);
      c.contains('Miles needed to prove safetyMatching human drivers takes 275 million miles without a death');
      c.contains('Required fleet run at 95% confidence275 million miles 0 deaths');
      c.contains("Calculated upper bound for this hypothetical runAbout 1.09 deaths per 100 million milesNo higher than the study's US human-driver benchmarkThe true fatality rate remains unknown. In the long run, at least 95 out of 100 upper bounds from studies of the same design would reach or exceed it.");
      c.contains("This is a hypothetical test with a fixed distance and zero deaths. The model assumes independent miles with the same failure probability on every mile. The study's 2013 US benchmark includes all motor vehicles.");
      c.contains("Under the study's per-mile model, a fleet at the US benchmark rate would finish this many miles without a death only about 1 time in 20. A higher fatality rate makes that result still less likely.");
    },
  },
  'interactive:DatasetRunsHours': {
    basis: [
      { id: 'fineart-2026', kind: 'citation', reference: '40,543 episodes, 1,718 hours.' },
      { id: 'droid-2024', kind: 'citation', reference: '76,000 trajectories, 350 hours.' },
      { id: 'galaxea-open-world-2025', kind: 'citation', reference: '100,000 trajectories, 500 hours.' },
      { id: 'robomind-2024', kind: 'citation', reference: '107,000 trajectories, 305.5 hours.' },
      { id: 'agibot-world-2025', kind: 'citation', reference: '1,001,552 trajectories, 2,976.4 hours.' },
    ],
    evidencePaths: ['lib/dataset-runs-hours.ts'],
    seriesIds: ['fineart', 'droid', 'galaxea', 'robomind', 'agibot'],
    check(c) {
      c.circleCount(5);
      for (const [name, runs, hours] of [['FineART', 40543, 1718], ['DROID', 76000, 350], ['Galaxea', 100000, 500], ['RoboMIND', 107000, 305.5], ['AgiBot World', 1001552, 2976.4]] as const) {
        c.row(name, { runs, hours, 'seconds per run': Math.round(hours * 3600 / runs) });
        c.point(name, 44 + (Math.log10(runs) - 4) * 282 / 2.2, 214 - (Math.log10(hours) - 2) * 174 / 1.6);
      }
    },
  },
  'interactive:TimeOffsetMiss': {
    basis: [{ id: 'realtime-vla-v2-2026', kind: 'citation', reference: 'Measured camera delay 55 ms; gap = speed in cm/s × 10 mm/cm × 0.055 s.' }, { id: 'assumption:TimeOffsetMiss:constant-speed', kind: 'assumption', reference: 'Constant-speed tracking bench; run speed is slowed only for illustration.' }],
    evidencePaths: ['components/interactive/time-offset-miss.tsx'],
    check(c) {
      const speed = c.input(/Hand speed/), gap = Math.round(speed * 0.55 * 10) / 10;
      c.readoutNumbers(0, [speed]);
      if (speed === 0) c.readoutText(1, 'Standing still: no gap');
      else c.readoutNumbers(1, [speed, gap]);
      for (const value of [...new Set([10, 25, 50, 100, speed])]) c.cell(String(value), 'gap (mm)', Math.round(value * 0.55 * 10) / 10);
    },
  },
  'interactive:MotionPantograph': {
    basis: [{ id: 'assumption:MotionPantograph:division', kind: 'assumption', reference: 'Authored 30 mm stroke and 2–5 scaling ratio; tip displacement = hand displacement divided by the control ratio.' }],
    evidencePaths: ['components/interactive/motion-pantograph.tsx'],
    check(c) {
      const scale = c.input(/Motion scale/);
      c.readoutNumbers(0, [scale, 1]);
      c.readoutNumbers(1, [scale, 1, 30, Math.round(30 / scale * 10) / 10]);
      c.contains('Illustrative:');
    },
  },
};

const overlappingSources = Object.keys(MODEL_SOURCE_ORACLES).filter(id => Object.hasOwn(DATA_SOURCE_ORACLES, id));
if (overlappingSources.length) throw new Error(`Duplicate independent source oracle owners: ${overlappingSources.join(', ')}`);
export const SOURCE_ORACLES: Readonly<Record<string, SourceOracle>> = Object.freeze({ ...DATA_SOURCE_ORACLES, ...MODEL_SOURCE_ORACLES });
