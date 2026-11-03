/** Independent calculations for the source-parity reader. No renderer/model
 * function is imported: constants below are the explicitly documented local
 * assumptions, and the numerical methods differ where useful (closed-form
 * Euler error, finite-difference closure Jacobian, supporting hull planes). */
export const round = (value: number, digits: number) => Number(value.toFixed(digits));
export function seededUniform(seed: number): () => number {
  let word = seed >>> 0;
  return () => { word = (word + 0x6d2b79f5) >>> 0; let bits = Math.imul(word ^ (word >>> 15), word | 1); bits ^= bits + Math.imul(bits ^ (bits >>> 7), bits | 61); return ((bits ^ (bits >>> 14)) >>> 0) / 4294967296; };
}

/** A quadratic Bezier velocity is affine in time. Its left Riemann sum
 * misses the endpoint by (2*control-noise-target)/steps, exactly. */
export function flowEndpointError(steps: number): number {
  const rand = seededUniform(20241031), gaussian = () => Math.sqrt(-2 * Math.log(Math.max(rand(), Number.EPSILON))) * Math.cos(2 * Math.PI * rand());
  let total = 0;
  for (let i = 0; i < 48; i++) {
    const noise = [gaussian(), gaussian()], mode = rand() < 0.55 ? [-1.35, -0.65] : [1.3, 0.75], target = [mode[0] + 0.28 * gaussian(), mode[1] + 0.28 * gaussian()], bend = rand() * 2 - 1;
    total += 2 * 0.22 * Math.hypot(target[0] - noise[0], target[1] - noise[1]) * Math.abs(bend) / steps;
  }
  return total / 48;
}

/** Solve a small dense system by partial-pivot elimination. */
function solve(matrix: number[][], right: number[]): number[] {
  const rows = matrix.map((row, i) => [...row, right[i]]), n = right.length;
  for (let col = 0; col < n; col++) {
    let pivot = col; for (let row = col + 1; row < n; row++) if (Math.abs(rows[row][col]) > Math.abs(rows[pivot][col])) pivot = row;
    [rows[col], rows[pivot]] = [rows[pivot], rows[col]];
    if (Math.abs(rows[col][col]) < 1e-14) throw new Error('singular independent constraint system');
    const scale = rows[col][col]; for (let k = col; k <= n; k++) rows[col][k] /= scale;
    for (let row = 0; row < n; row++) if (row !== col) { const factor = rows[row][col]; for (let k = col; k <= n; k++) rows[row][k] -= factor * rows[col][k]; }
  }
  return rows.map(row => row[n]);
}

/** Constrained minimum turn-correction norm, with finite differences rather
 * than the renderer's analytic articulated-chain Jacobian. */
export function loopClosureValues(drift: number): { openGap: number; closedWorst: number; totalTurn: number } {
  const rad = Math.PI / 180;
  const trueTurns = Array.from({ length: 14 }, (_, i) => [5, 8, 13].includes(i + 1) ? 90 : 0);
  const measured = trueTurns.map((turn, i) => turn - drift * (1 + 0.8 * Math.cos(Math.PI * i / 13)));
  const chain = (turns: number[]) => {
    let heading = 0, x = 0, y = 0; const pins = [[0, 0]];
    for (let leg = 0; leg < 15; leg++) { if (leg) heading += turns[leg - 1]; x += 2 * Math.cos(heading * rad); y += 2 * Math.sin(heading * rad); pins.push([x, y]); }
    return { pins, residual: [x + 2 * Math.cos(heading * rad), y + 2 * Math.sin(heading * rad), (heading - 270) * rad] };
  };
  const initial = chain(measured); let corrections = measured.map(() => 0);
  for (let iteration = 0; iteration < 60; iteration++) {
    const turns = measured.map((v, i) => v + corrections[i]), current = chain(turns), h = 1e-4;
    const columns = turns.map((_, j) => { const plus = [...turns], minus = [...turns]; plus[j] += h; minus[j] -= h; const a = chain(plus).residual, b = chain(minus).residual; return a.map((v, i) => (v - b[i]) / (2 * h)); });
    const j = [0, 1, 2].map(row => columns.map(column => column[row]));
    const gram = j.map(a => j.map(b => a.reduce((sum, v, i) => sum + v * b[i], 0)));
    const rhs = j.map((row, i) => row.reduce((sum, v, k) => sum + v * corrections[k], 0) - current.residual[i]);
    const lambda = solve(gram, rhs), next = columns.map(column => column.reduce((sum, v, i) => sum + v * lambda[i], 0));
    const delta = Math.max(...next.map((v, i) => Math.abs(v - corrections[i]))); corrections = next; if (delta < 1e-9) break;
  }
  const solved = chain(measured.map((v, i) => v + corrections[i])), truth = chain(trueTurns);
  return { openGap: Math.hypot(initial.residual[0], initial.residual[1]), closedWorst: Math.max(...solved.pins.map((p, i) => Math.hypot(p[0] - truth.pins[i][0], p[1] - truth.pins[i][1]))), totalTurn: 14 * drift };
}

type Vec = [number, number, number];
const dot = (a: Vec, b: Vec) => a.reduce((sum, v, i) => sum + v * b[i], 0);
const minus = (a: Vec, b: Vec): Vec => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a: Vec, b: Vec): Vec => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];

export function graspExpected(positions: number[], mu: number): { epsilon: number; slipping: number } {
  const corners = [[1, 1], [-1, 1], [-1, -1], [1, -1]], forces: Vec[] = [];
  for (const position of positions) {
    const t = ((position % 1) + 1) % 1 * 4, edge = Math.floor(t), fraction = t - edge, a = corners[edge], b = corners[(edge + 1) % 4];
    const p = [a[0] + (b[0] - a[0]) * fraction, a[1] + (b[1] - a[1]) * fraction], normal = [-(a[0] + b[0]) / 2, -(a[1] + b[1]) / 2];
    for (const sign of [-1, 1]) { const fx = normal[0] - sign * mu * normal[1], fy = normal[1] + sign * mu * normal[0]; forces.push([fx, fy, p[0] * fy - p[1] * fx]); }
  }
  const points: Vec[] = [[0, 0, 0], ...forces]; let epsilon = Infinity, facets = 0;
  for (let a = 0; a < points.length; a++) for (let b = a + 1; b < points.length; b++) for (let c = b + 1; c < points.length; c++) {
    const normal = cross(minus(points[b], points[a]), minus(points[c], points[a])), length = Math.hypot(...normal); if (length < 1e-12) continue;
    const offset = dot(normal, points[a]), distances = points.map(point => dot(normal, point) - offset);
    if (distances.every(v => v >= -1e-7) || distances.every(v => v <= 1e-7)) { epsilon = Math.min(epsilon, Math.abs(offset) / length); facets++; }
  }
  epsilon = facets >= 4 && epsilon > 1e-7 && Number.isFinite(epsilon) ? epsilon : 0;
  const inCone = (target: Vec) => {
    for (let a = 0; a < forces.length; a++) {
      const one = forces[a], norm = dot(one, one), weight = dot(one, target) / norm;
      if (weight >= -1e-9 && Math.hypot(...minus(one.map(v => v * weight) as Vec, target)) < 1e-7) return true;
      for (let b = a + 1; b < forces.length; b++) {
        const two = forces[b], ab = dot(one, two), bb = dot(two, two), det = norm * bb - ab * ab;
        if (Math.abs(det) > 1e-12) { const at = dot(one, target), bt = dot(two, target), x = (at * bb - bt * ab) / det, y = (bt * norm - at * ab) / det; if (x >= -1e-9 && y >= -1e-9 && Math.hypot(...minus(one.map((v, i) => v * x + two[i] * y) as Vec, target)) < 1e-7) return true; }
        for (let c = b + 1; c < forces.length; c++) {
          const three = forces[c], determinant = dot(one, cross(two, three)); if (Math.abs(determinant) < 1e-12) continue;
          if ([dot(target, cross(two, three)), dot(one, cross(target, three)), dot(one, cross(two, target))].every(v => v / determinant >= -1e-9)) return true;
        }
      }
    }
    return false;
  };
  let slipping = 0; for (let k = 0; k < 8; k++) if (!inCone([-Math.cos(Math.PI * k / 4), -Math.sin(Math.PI * k / 4), 0])) slipping++;
  return { epsilon, slipping };
}

/** The seeded RRT teaching problem, rebuilt independently from its explicit
 * world, nearest-neighbour rule, step cap and sampled collision rule. */
export function rrtExpected(): { branches: number; length: number } {
  const random = seededUniform(19981001), nodes: Array<{x:number;y:number;parent:number}> = [{ x: 7, y: 32, parent: -1 }];
  const free = (a: {x:number;y:number}, b: {x:number;y:number}) => {
    const samples = Math.max(2, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 1.5) + 1);
    for (let k = 0; k <= samples; k++) { const x = a.x + (b.x - a.x) * k / samples, y = a.y + (b.y - a.y) * k / samples; if (x < 0 || x > 100 || y < 0 || y > 64 || x > 47 && x < 53 && y > 20 && y < 64 || [[26,15,7],[30,47,5],[71,12,6],[74,48,8]].some(([cx,cy,r]) => Math.hypot(x-cx,y-cy)<r)) return false; }
    return true;
  };
  let goal = -1;
  for (let branch = 1; branch <= 900; branch++) {
    let accepted = false;
    for (let attempt = 0; attempt < 200; attempt++) {
      const sample = random() < 0.015 ? [93, 32] : [random() * 100, random() * 64]; let nearest = 0, distance = Infinity;
      nodes.forEach((node, i) => { const d = Math.hypot(sample[0] - node.x, sample[1] - node.y); if (d < distance) { distance = d; nearest = i; } });
      if (distance < 1e-6) continue; const start = nodes[nearest], reach = Math.min(2, distance) / distance, end = { x: start.x + (sample[0] - start.x) * reach, y: start.y + (sample[1] - start.y) * reach, parent: nearest };
      if (!free(start, end)) continue; nodes.push(end); accepted = true;
      if (Math.hypot(end.x - 93, end.y - 32) <= 5 && free(end, {x:93,y:32})) goal = nodes.length - 1;
      break;
    }
    if (!accepted || goal >= 0) break;
  }
  if (goal < 0) throw new Error('independent authored RRT did not reach its fixed goal');
  let length = Math.hypot(nodes[goal].x - 93, nodes[goal].y - 32);
  for (let i = goal; nodes[i].parent >= 0; i = nodes[i].parent) { const a = nodes[i], b = nodes[a.parent]; length += Math.hypot(a.x - b.x, a.y - b.y); }
  return { branches: nodes.length - 1, length };
}

/** Independent terrain/noise construction and normalized readings. */
export function teacherExpected(degradation: number) {
  const terrain = Array.from({length:24},(_,i)=>round(0.08*Math.sin(i*0.5)+0.045*Math.sin(i*1.27+0.8)+(i>=14?0.05:0)-(i>=5&&i<9?0.04:0),4));
  const field = (seed:number,signed:boolean) => { let state=seed;return Array.from({length:24},()=>{state=state*48271%2147483647;return round(signed?state/2147483647*2-1:state/2147483647,4);}); };
  const noise=field(123456789,true),thresholds=field(987654321,false),lost=thresholds.map(v=>v<degradation),low=Math.min(...terrain),high=Math.max(...terrain);
  const blurred=terrain.map((_,i)=>{let sum=0,weight=0;for(let offset=-6;offset<=6;offset++){if(i+offset<0||i+offset>=24)continue;const w=Math.exp(-offset*offset/18);sum+=terrain[i+offset]*w;weight+=w;}return sum/weight;});
  const errors=terrain.map((height,i)=>{const base=blurred[i]-height+0.06*noise[i];return degradation*(base+(lost[i]?0.12*(base>=0?1:-1):0));});
  const mae=errors.reduce((sum,value)=>sum+Math.abs(value),0)/24;
  return {terrain,lost,low,high,mae,guess:terrain.map((v,i)=>round(v+errors[i],4)),readings:terrain.map((v,i)=>round((v-low)/(high-low)+degradation*0.45*noise[i],4))};
}

/** Re-integrate only observed inputs from the documented release state. */
export function pendulumExpected(raw: unknown, declaredSteps: number) {
  if (!Array.isArray(raw) || raw.length > 128) throw new Error('invalid or over-bound pendulum input population');
  let angle = 12 * Math.PI / 180, rate = 0, integral = 0, steps = 0;
  for (const item of raw) {
    if (!item || typeof item !== 'object') throw new Error('invalid pendulum input record');
    const event = item as Record<string, unknown>;
    if (event.kind === 'push') {
      if (Object.keys(event).sort().join(',') !== 'impulse,kind' || event.impulse !== 2) throw new Error('invalid push input');
      rate += 2;
      continue;
    }
    if (event.kind !== 'advance' || Object.keys(event).sort().join(',') !== 'kd,ki,kind,kp,steps' || !Number.isSafeInteger(event.steps) || Number(event.steps) <= 0 || ![event.kp,event.ki,event.kd].every(value=>typeof value==='number'&&Number.isFinite(value))) throw new Error('invalid integration input');
    const count = Number(event.steps), kp = Number(event.kp), ki = Number(event.ki), kd = Number(event.kd);
    steps += count; if (steps > 288000) throw new Error('pendulum integration witness exceeds its bound');
    for (let i = 0; i < count; i++) {
      const previous = angle, torque = Math.max(-40,Math.min(40,-(kp*angle+kd*rate+ki*integral)));
      rate += (9.81*Math.sin(angle)+(torque+0.8))*(1/480);
      angle = ((angle+rate*(1/480)+Math.PI)%(2*Math.PI)+2*Math.PI)%(2*Math.PI)-Math.PI;
      if(angle===-Math.PI)angle=Math.PI;
      integral = Math.max(-1.5,Math.min(1.5,integral+previous*(1/480)));
    }
  }
  if (!Number.isSafeInteger(declaredSteps) || declaredSteps !== steps) throw new Error('pendulum input-step population mismatch');
  return { angle, rate, integral, steps };
}

/** Independently projected faces of the two authored gauge needles. The
 * camera is orthographic (68° azimuth, 20° elevation), fitted to the fixed
 * stand bounds; torque sweeps 18°/Nm and clips at 10 Nm. No drawing helper
 * supplies these four-corner polygons. */
export function pendulumNeedlesExpected(pushNm: number, pullNm: number) {
  const a = 68 * Math.PI / 180, e = 20 * Math.PI / 180;
  const project = ([x, y, z]: readonly number[]) => [
    x * Math.sin(a) - y * Math.cos(a),
    (x * Math.cos(a) + y * Math.sin(a)) * Math.sin(e) - z * Math.cos(e),
  ];
  const bounds: number[][] = [];
  for (const x of [-104, 188]) for (const y of [-30, 40]) for (const z of [-14, 0]) bounds.push(project([x, y, z]));
  for (let i = 0; i < 48; i++) {
    const phase = i * Math.PI / 24;
    for (const y of [-5, 0]) bounds.push(project([76 * Math.cos(phase), y, 84 + 76 * Math.sin(phase)]));
  }
  bounds.push(project([134, 14, 100]));
  const xs = bounds.map(p => p[0]), ys = bounds.map(p => p[1]);
  const left = Math.min(...xs), right = Math.max(...xs), top = Math.min(...ys), bottom = Math.max(...ys);
  const height = Math.ceil(620 * (bottom - top) / (right - left) + 20);
  const scale = Math.min(620 / (right - left), (height - 20) / (bottom - top));
  const offset = [320 - (left + right) * scale / 2, height / 2 - (top + bottom) * scale / 2];
  return [
    { id: 'pendulum-gravity-arrow', words: "Short needle: gravity's pull", torque: pullNm, length: 23, tail: 2.6, width: 0.9, depth: 23.8 },
    { id: 'pendulum-push-arrow', words: "Long needle: the motor's push", torque: pushNm, length: 29.6, tail: 3.6, width: 1.1, depth: 24.4 },
  ].map(needle => {
    const angle = -Math.PI / 2 + Math.min(Math.abs(needle.torque), 10) * Math.PI / 10;
    const u = [Math.sin(angle), Math.cos(angle)], v = [Math.cos(angle), -Math.sin(angle)];
    const corners = [[-needle.tail, needle.width], [needle.length, 0.25], [needle.length, -0.25], [-needle.tail, -needle.width]];
    const points = corners.map(([along, across]) => project([134 + u[0] * along + v[0] * across, needle.depth, 56 + u[1] * along + v[1] * across])
      .map((value, axis) => Math.round((offset[axis] + value * scale) * 10) / 10));
    return { id: needle.id, words: needle.words, points };
  });
}

export function pushDistanceExpected(raw: unknown): number {
  if (!Array.isArray(raw) || raw.length > 128 || raw.some(force=>typeof force!=='number'||!Number.isFinite(force))) throw new Error('invalid or over-bound force input population');
  return Math.min(0.5, raw.reduce((position,force)=>position+(Math.min(10,Math.max(1,force))/3)**2/9.81,0));
}

/** Metric plan-view geometry for the representation teaching scene. */
export function representationExpected(cell: number) {
  const far=(x:number)=>150+(x-150)*174/88,shadow=[[86,108],[130,108],[far(130),22],[far(86),22]];
  const unseen=(x:number,y:number)=>{let inside=false;for(let a=0,b=3;a<4;b=a++){const p=shadow[a],q=shadow[b];if((p[1]>y)!==(q[1]>y)&&x<(q[0]-p[0])*(y-p[1])/(q[1]-p[1])+p[0])inside=!inside;}return inside;};
  const boxes=[[20,14,260,8],[86,88,44,20],[199,96,2,2],[228,46,24,24]];
  const cells:Array<{x:number;y:number;state:string}>=[];
  for(let y=0;y+cell<=200.001;y+=cell)for(let x=0;x+cell<=300.001;x+=cell){const cx=x+cell/2,cy=y+cell/2,solid=boxes.some(([bx,by,w,h])=>cx>=bx&&cx<=bx+w&&cy>=by&&cy<=by+h);cells.push({x,y,state:solid?'occupied':unseen(cx,cy)?'unknown':'free'});}
  const samples:Array<{x:number;y:number;kind:string}>=[];
  for(let x=20;x<=280;x+=cell)if(!unseen(x,22))samples.push({x,y:22,kind:'wall'});
  for(let x=86;x<=130;x+=cell)samples.push({x,y:108,kind:'occluder'});
  samples.push({x:200,y:98,kind:'thin'});
  const count=Math.max(4,Math.round(Math.PI*12/cell));for(let i=0;i<=count;i++){const a=Math.PI*i/count;samples.push({x:240+12*Math.cos(a),y:58+12*Math.sin(a),kind:'transparent'});}
  const invented:Array<{x:number;y:number}>=[];let row=0;for(let y=22+cell/2;y<108;y+=cell){row++;for(let x=far(86)+(row%2===0?cell/2:0);x<130;x+=cell)if(unseen(x,y))invented.push({x,y});}
  return {shadow,cells,samples,invented};
}
