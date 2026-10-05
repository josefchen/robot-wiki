/**
 * The words of every explainer: its kicker, question headline, registered
 * takeaway, step texts in order, the concept its last step names, and its
 * self-check. Scenes read their step texts from here and the page serves them
 * as text, so each explainer can be read, searched and printed without WebGL.
 * It imports nothing, so Node scripts can load it as is.
 */
export type ExplainerWords = {
  kicker: string;
  question: string;
  takeaway: string;
  steps: readonly string[];
  /**
   * The closing line: `name` with its `term` linked to `href`, a section of the
   * article titled `article`. The link carries the concept's own name rather
   * than the article title, so the line adds no new word for the reader.
   */
  concept: { name: string; term: string; article: string; href: string };
  selfCheck: { q: string; a: string };
  /** For an explainer you can pull apart: its parts, as the parts list names them. */
  parts?: readonly string[];
};

export const EXPLAINER_WORDS = {
  arm: {
    kicker: 'Robot anatomy · the arm',
    question: 'What is a robot arm made of?',
    takeaway:
      'A robot arm is a chain: each motor moves everything after it, so the motors nearest the base work hardest.',
    steps: [
      'People build this small arm themselves to teach robots new tasks. It has six motors, one for each joint.',
      'Pull it apart. Printed plastic parts and motors alternate, from the base to the jaw. Tap any part to see what it does.',
      'Each motor carries every part after it. With the arm stretched out like this, which motor works hardest just to hold it still?',
      'So arms need their strongest motors near the base and can lift only a little at the tip. This is a kinematic chain.',
    ],
    concept: {
      name: 'This chain of rigid parts and joints is called a kinematic chain',
      term: 'kinematic chain',
      article: 'Kinematics',
      href: 'https://robot-wiki.com/classical/kinematics/',
    },
    selfCheck: {
      q: 'Which motor would you make the strongest, and why?',
      a: 'The shoulder lift. It holds up the whole arm, and the further the arm reaches, the more it has to hold.',
    },
    parts: [
      'Base', 'Base motor', 'Shoulder bracket', 'Shoulder lift motor', 'Upper arm', 'Elbow motor', 'Forearm',
      'Wrist bend motor', 'Wrist', 'Wrist turn motor', 'Fixed jaw', 'Gripper motor', 'Moving jaw',
    ],
  },
  humanoid: {
    kicker: 'Robot anatomy · the humanoid',
    question: 'Where do a humanoid robot\'s motors go?',
    takeaway:
      'Over half of a humanoid\'s motors move its legs and keep it balanced, hands with fingers need about as many again, and the battery limits how long it can work.',
    steps: [
      'A humanoid is shaped like us so it can use our doors, stairs and tools. This one, a Unitree G1, stands 1.32 metres tall.',
      'Its 23 motors sit in its joints, one per joint. Guess where most of them go, then tap any part of the body to count.',
      'The legs carry the whole body, about 35 kilograms, and must react instantly, so they get the strongest motors.',
      'The battery and computer sit in the torso. One charge lasts only about two hours, so the battery limits how long it can work.',
      'Each motor adds a degree of freedom, a way to move that must be controlled. Hands with fingers need about as many as the legs.',
    ],
    concept: {
      name: 'Each independent way a robot can move is called a degree of freedom',
      term: 'degree of freedom',
      article: 'Hardware Taxonomy',
      href: 'https://robot-wiki.com/data-hardware/hardware-taxonomy/',
    },
    selfCheck: {
      q: 'What stops a humanoid working a full shift today?',
      a: 'Mostly the battery. The G1 runs for about two hours on a charge, a quarter of an eight-hour shift, so it needs battery swaps or charging breaks.',
    },
    parts: ['Legs', 'Arms', 'Waist', 'Hands', 'Torso and head'],
  },
  hand: {
    kicker: 'Robot anatomy · the hand',
    question: 'Why are robot hands so hard?',
    takeaway:
      'A human hand packs about 20 ways to move and dense touch into a small space; most robots use a simple two-finger clamp instead and lose most of that.',
    steps: [
      'Many robots hold things with a simple clamp: two fingers and one motor that opens and closes them.',
      'A human hand has 27 bones and about 20 ways to move. Each finger bends at three joints and swings sideways.',
      'Robot hands copy this. The LEAP Hand, a research hand, keeps three fingers and a thumb: 16 joints, each with its own motor.',
      'Touch matters too. A slip starts as a tiny vibration; fingertip sensors feel it, and the hand squeezes before the object falls.',
      'Last test: turn the key to point sideways, using only the fingers. Doing that is called dexterous manipulation.',
    ],
    concept: {
      name: 'Using the fingers to move an object within the hand is called dexterous manipulation',
      term: 'dexterous manipulation',
      article: 'Dexterity',
      href: 'https://robot-wiki.com/frontier/dexterity/',
    },
    selfCheck: {
      q: 'Why do so many robots still use a two-finger clamp?',
      a: 'One motor is cheap, strong and reliable, and most jobs only need to pick something up and put it down. A hand needs many motors, many sensors and much harder control, so it pays off only where the fingers must do the work.',
    },
  },
  reaching: {
    kicker: 'Kinematics · reaching',
    question: 'How does a robot arm reach a cup?',
    takeaway:
      'The robot works backwards from where the hand must go to an angle for every joint, and some places it simply cannot reach.',
    steps: [
      'An arm only controls its joints. Turn the shoulder and the hand swings in an arc.',
      'To pick up a cup, the robot must find an angle for every joint at once. Drag the cup and watch it solve.',
      'Now the cup is at the far end of the table.',
      'Some places can be reached in two different ways: elbow up or elbow down.',
      'Turning joints to see where the hand goes is forward kinematics. Working backwards from the hand to the joints is inverse kinematics.',
    ],
    concept: {
      name: 'Working backwards from the hand to the joints is called inverse kinematics',
      term: 'inverse kinematics',
      article: 'Kinematics',
      href: 'https://robot-wiki.com/classical/kinematics/',
    },
    selfCheck: {
      q: 'Why can\'t you just tell a robot arm "put your hand here"?',
      a: 'Its motors only turn joints. Something has to work out the angle of every joint that puts the hand there, and sometimes no such angles exist.',
    },
  },
  upright: {
    kicker: 'Legged robots · balance',
    question: 'Why are two legs harder than four?',
    takeaway:
      'A robot stays up while its balance point is over the patch between its feet; four feet make a big patch, two make a tiny one.',
    steps: [
      'Every body has a balance point, where its weight is centred. Here it is the dot, inside a robot dog and a humanoid.',
      'The shaded patch spans the feet on the ground. While the dot\'s shadow stays inside it, the robot stays up.',
      'Both robots get the same push, and both balance points move the same distance forward.',
      'Walking, only one or two feet touch at a time, so the patch shrinks to a line or one foot. Walking is falling and catching.',
      'This patch is called the support polygon. The robot dog ANYmal adjusts its legs 200 times a second, using a skill learned in simulation.',
    ],
    concept: {
      name: 'The patch between the feet is called the support polygon',
      term: 'support polygon',
      article: 'Legged Locomotion Lineage',
      href: 'https://robot-wiki.com/rl-sim2real/legged-locomotion/',
    },
    selfCheck: {
      q: 'Why does a humanoid take a small step when pushed?',
      a: 'The push carries its balance point past the edge of the small patch under its feet. Stepping puts a foot down beyond it, so the patch grows to cover the balance point again.',
    },
  },
  flying: {
    kicker: 'Drones · flying',
    question: 'How does a drone steer with no wings or rudder?',
    takeaway:
      'Only by changing its four propeller speeds: speed up the back pair to tilt and fly forward, and speed up one spinning pair to turn.',
    steps: [
      'Four motors, a battery and a flight computer. Two propellers spin clockwise and two counter-clockwise.',
      'Spin all four at the same speed and it hovers: together they lift exactly its weight. Faster together, it climbs.',
      'Now fly forward. No propeller points forward, so something else has to push it that way.',
      'To turn, speed up the two clockwise propellers and slow the other two. Their extra twist turns the whole drone the other way.',
      'The flight computer rebalances the four speeds hundreds of times a second to hold the tilt it wants. This is attitude control.',
    ],
    concept: {
      name: 'Holding the right tilt by constantly adjusting motor speeds is called attitude control',
      term: 'attitude control',
      article: 'Drones and Aerial Robotics',
      href: 'https://robot-wiki.com/adjacent/drones/#the-autonomy-stack-on-a-flying-robot',
    },
    selfCheck: {
      q: 'Why do two propellers spin one way and two the other?',
      a: 'Each spinning propeller twists the drone the opposite way. With two each way the twists cancel, so it can hover without turning; speeding up one pair lets it turn on purpose.',
    },
    parts: ['Frame', 'Motors', 'Propellers', 'Battery', 'Flight computer'],
  },
  path: {
    kicker: 'Motion planning · finding a path',
    question: 'How does a robot get around obstacles?',
    takeaway:
      'It tries random moves, keeps the safe ones, and grows a tree until a branch reaches the goal.',
    steps: [
      'The gripper must reach the can on the far shelf. Going in a straight line, it runs into the shelf in between.',
      'Pick a random point. From the nearest spot reached so far, take one short step toward it. Keep the step only if it hits nothing.',
      'Repeat thousands of times. The kept steps branch out into a tree that creeps into every open gap.',
      'When a branch reaches the goal, follow it back to the start. Then cut every corner where a straight shortcut is safe.',
      'Drag the shelf; the tree regrows. This is a rapidly-exploring random tree. Fast software plans an arm\'s path in about 40 millionths of a second.',
    ],
    concept: {
      name: 'Growing a tree of random safe steps is called a rapidly-exploring random tree',
      term: 'rapidly-exploring random tree',
      article: 'Motion planning',
      href: 'https://robot-wiki.com/classical/motion-planning/#sampling-based-planning',
    },
    selfCheck: {
      q: 'A box falls into the gripper\'s path. What does the robot do?',
      a: 'It grows a new tree: random points, short safe steps, until a branch reaches the goal again. It never needs to know the way round in advance, only whether each small step hits something.',
    },
  },
  grip: {
    kicker: 'Grasping · holding without slipping',
    question: 'Why do robots drop things?',
    takeaway:
      'A pinch holds only if each finger pushes within a narrow cone set by friction; tilt the grip outside the cones and the object slides out.',
    steps: [
      'Two fingers pinch a block squarely and lift it. It holds.',
      'Each fingertip can push only within a cone. Push outside it, and the finger slides along the surface.',
      'Now it grabs the block with a tilted grip and lifts. The fingers still squeeze along the line between them.',
      'Slippery surfaces narrow the cones. Rubber holds at tilts where plastic and ice slip.',
      'This is the friction cone. Robots plan a grasp by hunting for finger spots whose cones face each other, with room to spare.',
    ],
    concept: {
      name: 'The cone of pushes a fingertip can make without sliding is called the friction cone',
      term: 'friction cone',
      article: 'Grasp planning',
      href: 'https://robot-wiki.com/classical/grasp-planning/',
    },
    selfCheck: {
      q: 'Why do grippers have rubber pads?',
      a: 'Rubber grips harder, which widens each fingertip\'s cone. A wider cone lets the fingers squeeze at a steeper angle, so the grip survives a tilt, a bump or a slippery object.',
    },
  },
  mug: {
    kicker: 'Scene representation · four ways to see a mug',
    question: 'What does a robot actually see?',
    takeaway:
      'It stores the world as dots, cubes, a skin or soft blobs, and each one trades detail against speed and memory.',
    steps: [
      'A depth camera measures one distance for every pixel. Each becomes a dot, but only on the side the camera can see.',
      'Cubes, called voxels, split space into a grid where each box is simply full or empty. Coarse, but very simple.',
      'A skin, called a mesh, joins the surface into small flat triangles. Its smooth shape is what you need to plan where fingers go.',
      'Soft blobs, called Gaussian splats, blend together into an image that looks like a photo. They are the newest of the four.',
      'Same mug, four costs: more pieces give more detail but take more memory and time. These are scene representations.',
    ],
    concept: {
      name: 'These ways of storing the world are called scene representations',
      term: 'scene representations',
      article: 'Scene representation',
      href: 'https://robot-wiki.com/classical/scene-representation/#the-ladder-and-what-each-rung-can-answer',
    },
    selfCheck: {
      q: 'Why might one robot keep the same mug both as cubes and as a skin?',
      a: 'Each answers a different question. Cubes say "is this space free?" in a single look-up, which suits checking that the arm won\'t bump into anything. A skin gives the exact smooth surface, which is what planning a grasp needs.',
    },
  },
  whereami: {
    kicker: 'State estimation · knowing where you are',
    question: 'Does a robot know where it is?',
    takeaway:
      'A robot never knows exactly where it is: it keeps a best guess and a cloud of doubt, and moving grows the doubt while every measurement shrinks it.',
    steps: [
      'It drives by counting wheel turns. Each turn adds a little error, so its guess drifts and its cloud of doubt grows.',
      'Now it spots a landmark whose place on its map it already knows.',
      'A worse sensor shrinks the cloud less. The robot blends its guess with the reading, trusting whichever has less doubt.',
      'This blending is a Kalman filter. Spacecraft, drones and many robots use one to keep track of where they are.',
    ],
    concept: {
      name: 'Blending a guess with imperfect readings, trusting whichever has less doubt, is called a Kalman filter',
      term: 'Kalman filter',
      article: 'State Estimation',
      href: 'https://robot-wiki.com/classical/state-estimation/#the-kalman-filter',
    },
    selfCheck: {
      q: 'Why can\'t it simply trust the GPS?',
      a: 'GPS alone is only good to a few metres: a phone is typically within 4.9 metres under open sky, and worse near buildings and trees. Blending it with the robot\'s own motion gives a better guess than either one alone.',
    },
  },
  puppeteer: {
    kicker: 'Robot learning · teleoperation',
    question: 'How do robots learn new tasks?',
    takeaway:
      'A person moves a copy of the arm, the robot mirrors it, and every moment becomes an example for the robot to imitate.',
    steps: [
      'A person moves the leader arm by hand. The follower copies every joint a moment later. Drag the leader\'s hand.',
      'Press record. Thirty times a second, the robot saves what its camera sees and where every joint is: one example each time.',
      'After many demonstrations, the robot learns to copy them. Now it moves alone, beside a grey ghost replaying one demonstration.',
      'Steering a robot through a copy of itself is teleoperation. Learning to repeat the recordings on its own is imitation learning.',
    ],
    concept: {
      name: 'Steering a robot through a copy of itself is called teleoperation, and learning from the recordings is imitation learning',
      term: 'teleoperation',
      article: 'Teleoperation Rigs',
      href: 'https://robot-wiki.com/data-hardware/teleop-rigs/',
    },
    selfCheck: {
      q: 'Why steer the robot with a second copy of the arm instead of a joystick?',
      a: 'The copy has the same joints, so each joint angle carries straight across. Moving it feels natural, and every recording is already written in the robot\'s own joint angles, ready to imitate.',
    },
  },
  worlds: {
    kicker: 'Robot learning · simulation',
    question: 'How do robots learn to walk without breaking?',
    takeaway:
      'They practise in thousands of slightly different simulated worlds at once, so the real world is just one more variation.',
    steps: [
      'One simulated robot tries to walk. It stumbles, falls, resets and tries again, doing a little better each time.',
      'Now run 4,096 copies at once on one graphics chip. They share one brain, so every fall teaches all of them.',
      'Make every world a little different: slippery or grippy ground, heavier bodies, random shoves. Shuffle to deal new worlds.',
      'One tile is the real world. Two robots step onto it: one practised in a single perfect world, one in all 4,096.',
      'Practise in thousands of varied worlds and reality is just one more. This is massively parallel simulation with domain randomization.',
    ],
    concept: {
      name: 'Training thousands of copies at once is massively parallel simulation, and varying their worlds is domain randomization',
      term: 'massively parallel simulation',
      article: 'Massively Parallel Sim RL',
      href: 'https://robot-wiki.com/rl-sim2real/parallel-sim-rl/',
    },
    selfCheck: {
      q: 'Why vary the worlds instead of building one perfect copy of the real one?',
      a: 'No copy is ever perfect: real ground, weight and bumps always differ a little. A robot that copes with thousands of different worlds treats the real one as just one more.',
    },
  },
} as const satisfies Record<string, ExplainerWords>;

export type ExplainerId = keyof typeof EXPLAINER_WORDS;
