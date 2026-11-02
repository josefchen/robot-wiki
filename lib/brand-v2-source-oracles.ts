import type { SourceOracle } from './brand-v2-source-oracle-core.ts';

/** Explicit independent paper values and authored equations. Missing entries
 * fail the reader; this is not a source-presence or nonempty-text allowance. */
export const SOURCE_ORACLES: Readonly<Record<string, SourceOracle>> = {
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
    check(c) { c.readoutText(0, c.selected(/^Hold out scene 4$/) ? 'Scene 4 held out · test cards from 1 scene · none of it in training' : 'Random episodes · test cards from 3 scenes · all 3 also in training'); },
  },
  'interactive:BearCaseLock': {
    basis: [{ id: 'assumption:BearCaseLock:four-premises', kind: 'assumption', reference: 'The four article watchlist premises are an AND condition; two start partial and none met. Reader toggles are suppositions, not new research results.' }],
    evidencePaths: ['lib/bear-case.ts', 'components/iso/figures/bear-lock.ts'],
    check(c) { const count = [/^10,000 at work$/, /^90% in unseen homes$/, /^Cost-per-task parity$/, /^Success scaling law$/].filter(label => c.selected(label)).length; c.readoutNumbers(0, count === 0 ? [4, 2] : count === 4 ? [4] : [count, 4]); },
  },
  'interactive:HelixClockwork': {
    basis: [{ id: 'helix-02-2026', kind: 'citation', reference: 'Figure reports S0 at 1000 Hz and S1 at 200 Hz, hence five control steps per joint target.' }, { id: 'assumption:HelixClockwork:elapsed-clock', kind: 'assumption', reference: 'The authored demonstration counts completed ticks from zero at the native elapsed-millisecond setting.' }],
    citationText: { 'helix-02-2026': "Rates from Figure's Helix 02 announcement (January 2026)." }, evidencePaths: ['components/iso/figures/helix-clockwork.ts'],
    check(c) { const ms = Math.floor(c.input(/^Time on the clock$/) + 1e-9); c.readoutNumbers(0, [ms]); c.readoutNumbers(1, [ms, ms, Math.floor(ms / 5)]); },
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
    check(c) { c.row('On-policy, like PPO', { 'batches usable after 6 rounds': '1', 'older batches': 'thrown away' }); c.row('Off-policy, like SAC', { 'batches usable after 6 rounds': '6', 'older batches': 'kept in the replay buffer' }); },
  },
  'interactive:DemoOrSim': {
    basis: [{ id: 'reality-gap-survey-2026', kind: 'citation', reference: 'Contact-model fidelity differs between walking and manipulation.' }, { id: 'rudin-2021', kind: 'citation', reference: 'ANYmal flat-ground policy in under four minutes of training.' }, { id: 'act-aloha-2023', kind: 'citation', reference: 'Battery insertion success 80–90% after ten minutes of demonstrations.' }], evidencePaths: ['components/interactive/demo-or-sim.tsx'],
    check(c) { c.row('Simulation, with RL', { 'needs a contact model': 'yes', example: 'ANYmal walked on flat ground after under 4 minutes of training' }); c.row('Real demonstrations', { 'needs a contact model': 'no', example: 'ACT slotted a battery 80 to 90% of the time after 10 minutes of demonstrations' }); },
  },
  'interactive:NewtonSolvers': {
    basis: [{ id: 'state-of-simulation-2026', kind: 'citation', reference: 'NVIDIA solver inventory and supported material categories.' }, { id: 'newton-manipulation-blog-2026', kind: 'citation', reference: 'Newton release credits Kamino and coupled cable support.' }], evidencePaths: ['components/interactive/newton-solvers.tsx'],
    nonQuantitative: 'The four material examples and solver assignments are categorical; no speed, accuracy or solver benchmark is plotted.',
    check(c) {
      c.row('Robot arms and legs', { solver: 'MuJoCo Warp', 'what the sources say it handles': "jointed robots in generalized coordinates, as Newton's primary backend" });
      c.row('Closed-chain linkages', { solver: 'Kamino', 'what the sources say it handles': 'closed-chain mechanisms, credited to Disney Research' });
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
      c.readoutText(3, `Shoulder ${Math.round(a)} degrees · hand ${across}, ${out}`);
    },
  },
  'interactive:ImpedancePress': {
    basis: [{ id: 'hogan-1985', kind: 'citation', reference: 'One-axis stationary impedance reduces to spring force k × (target - tool).' }, { id: 'assumption:ImpedancePress:unitless-springs', kind: 'assumption', reference: 'Authored spring rates 1, 2 and 4 dial marks per ruler mark, a surface at zero, and no force in newtons claimed.' }],
    citationText: { 'hogan-1985': 'Hogan (1985)' }, evidencePaths: ['lib/impedance-press.ts'],
    check(c) {
      const target = c.input(/^Target$/), soft = c.selected(/^Soft$/), stiff = c.selected(/^Stiff$/), rate = soft ? 1 : stiff ? 4 : 2;
      const name = soft ? 'Soft' : stiff ? 'Stiff' : 'Medium', magnitude = Math.abs(target), words = `${Number.isInteger(magnitude) ? magnitude : magnitude.toFixed(1)} ${magnitude === 1 ? 'mark' : 'marks'}`;
      const targetText = target === 0 ? 'on the surface' : `${words} ${target < 0 ? 'short' : 'past'}`;
      c.readoutText(0, targetText);
      const push = rate * Math.max(0, target);
      c.readoutText(1, `${name} · ${targetText} · ${target <= 0 ? 'no push' : `push ${Number.isInteger(push) ? push : push.toFixed(1)}`}`);
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
    check(c) { const percent = c.input(/^Along the stroke$/); c.readoutNumbers(0, [percent]); c.readoutNumbers(1, percent >= 100 ? [100] : []); c.contains('no number is claimed'); },
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
    check(c) { c.contains('Schematic: one action'); c.contains('no number is claimed'); },
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
      const params = c.input(/^Model size on/), server = c.selected(/^Data-centre computer$/);
      const curve = (size: number) => size <= 3 ? 52.57 * size / 3 : 52.57 * Math.exp(Math.log(size / 3) * Math.log((1000 / 3.9) / 52.57) / Math.log(9.1 / 3));
      const toy = curve(params), milliseconds = server ? 1000 / 162.5 : toy, hz = Math.round(1000 / milliseconds), missed = Math.max(0, Math.ceil(milliseconds / 20) - 1);
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
      c.readoutNumbers(12, [angle, distance, round(hand, 1)]);
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
      for (const value of [70, 75, 85, 100, 115, 130]) c.cell(String(value), 'lower foot (cm from the floor)', Math.round(90 * (100 - value) / 100));
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
      for (const value of [3, 6, 12, 15, 20]) c.cell(String(value), 'times tighter than with 3 (illustrative)', Math.sqrt(value - 2).toFixed(1));
    },
  },
  'interactive:ReliabilityCompounding': {
    basis: [{ id: 'assumption:ReliabilityCompounding:independent-steps', kind: 'assumption', reference: 'Independent constant per-step success p: a length-n job completes with probability p^n; these are authored model results, not measured robot trials.' }],
    evidencePaths: ['lib/reliability.ts'],
    check(c) {
      const n = c.input(/^How many steps the job has/), percent = c.input(/^How often each step goes right/);
      const chance = (steps: number) => Number((100 * (percent / 100) ** steps).toFixed(1));
      c.readoutWhere({ key: /^\d+$/, text: /steps$/ }, [n]);
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
    basis: [{ id: 'zipline-safety-facts', kind: 'citation', reference: 'Safety fact sheet read October 2026: more than 3 million cumulative deliveries.' }, { id: 'wing-walmart-2026', kind: 'citation', reference: '8 June 2026: well over 1 million commercial deliveries.' }, { id: 'walmart-drone-1m-2026', kind: 'citation', reference: 'Walmart total overlaps providers; it is not a third additive operator bar.' }],
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
      const after = c.selected(/^After RL$/);
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
        c.readoutText(index, printed);
        c.point(row, 10 + (Math.log10(miles) - 6) * 320 / 3, y);
      }
      c.contains('12.5 years');
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
      for (const value of [10, 25, 50, 100]) c.cell(String(value), 'gap (mm)', Math.round(value * 0.55 * 10) / 10);
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
