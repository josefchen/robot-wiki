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
      'This small robot arm has six motors (highlighted), one at each joint, where the arm bends or turns.',
      'Pull it apart. Plastic parts and motors take turns, from the base to the gripper. Tap any part to see what it does.',
      'Each motor holds up every part further out, toward the gripper. With the arm stretched out, which motor works hardest to stop it sagging?',
      'So the motors near the base must be strongest, and the gripper can carry only light things. Linked parts like this form a kinematic chain.',
    ],
    concept: {
      name: 'This chain of rigid parts and joints is called a kinematic chain',
      term: 'kinematic chain',
      article: 'Kinematics',
      href: 'https://robot-wiki.com/classical/kinematics/',
    },
    selfCheck: {
      q: 'Which motor would you make the strongest, and why?',
      a: 'The shoulder. It holds up the whole arm, and the further the arm reaches, the more it has to hold.',
    },
    parts: [
      'Base', 'Base motor', 'Shoulder bracket', 'Shoulder lift motor', 'Upper arm', 'Elbow motor', 'Forearm',
      'Wrist bend motor', 'Wrist', 'Wrist turn motor', 'Fixed finger', 'Gripper motor', 'Moving finger',
    ],
  },
  humanoid: {
    kicker: 'Robot anatomy · the humanoid',
    question: 'Where do a humanoid robot\'s motors go?',
    takeaway:
      'Over half of a humanoid\'s motors move its legs and keep it balanced, hands with fingers need about as many again, and the battery limits how long it can work.',
    steps: [
      'A humanoid is shaped like us so it can use our doors, stairs and tools.',
      'It has 23 motors, one in each joint, where the body bends or turns. Guess where most of them are.',
      'The legs carry the whole body, about 35 kilograms, and keep it from falling, so they get the strongest motors.',
      'The chest cover swings open: the battery and computer sit inside. One charge lasts only about two hours, which limits its working time.',
      'Each motor adds one way to move, called a degree of freedom. Hands with fingers need about as many motors as the legs.',
    ],
    concept: {
      name: 'Each independent way a robot can move is called a degree of freedom',
      term: 'degree of freedom',
      article: 'Hardware Taxonomy',
      href: 'https://robot-wiki.com/data-hardware/hardware-taxonomy/',
    },
    selfCheck: {
      q: 'What stops a humanoid working a full shift today?',
      a: 'Mostly the battery. This robot runs for about two hours on a charge, a quarter of an eight-hour shift, so it needs battery swaps or charging breaks.',
    },
    parts: ['Legs', 'Arms', 'Waist', 'Hands', 'Torso and head'],
  },
  hand: {
    kicker: 'Robot anatomy · the hand',
    question: 'Why are robot hands so hard?',
    takeaway:
      'A human hand packs about 20 ways to move and dense touch into a small space; most robots use a simple two-finger clamp instead and lose most of that.',
    steps: [
      'Most robots hold things with a simple clamp: two fingers and one motor. It can only open and close.',
      'Your hand packs about 20 ways to move into a small space: each finger bends at three joints and swings sideways at the knuckle.',
      'A robot hand that copies yours can have a motor at every joint. This one has 16, where the clamp has one.',
      'Your fingertips are packed with touch sensors that feel a slip begin. Robot fingers need sensors too; a plain clamp feels nothing.',
      'A test: turn a held key a quarter turn, using only the fingers. Moving things within the hand is called dexterous manipulation.',
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
    kicker: 'Robot arms · reaching',
    question: 'How does a robot arm reach a cup?',
    takeaway:
      'The robot works backwards from where the hand must go to an angle for every joint, and some places it simply cannot reach.',
    steps: [
      'An arm only controls its joints. Turn the shoulder and the hand swings in an arc.',
      'To pick up a cup, the robot must find an angle for every joint at once. Drag the cup and watch it work them out.',
      'Now the cup slides much further away.',
      'Some places can be reached two ways: elbow up or elbow down. The faint arm shows the other way.',
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
      'Every body has a balance point, where its weight is centred. The dot marks it on a robot dog and a humanoid.',
      'The shaded patch spans the feet on the ground. While the spot straight below the dot stays inside it, the robot stays up.',
      'Both robots get the same push, and both balance points move the same distance forward.',
      'When walking, only some feet touch the ground. The patch shrinks, the spot often falls outside it, and each new step catches the fall.',
      'This patch is called the support polygon. Balance changes fast: one robot dog adjusts its legs 200 times a second to stay up.',
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
      'Four motors, a battery and a flight computer. Seen from above, two propellers spin clockwise and two counter-clockwise.',
      'Spin all four at the same speed and it hovers: their upward push matches its weight. Faster together, it climbs.',
      'Now fly forward. No propeller points forward, so something else has to push it that way.',
      'Each propeller twists the drone against its spin. Speed up the clockwise pair and their twist wins: the drone turns counter-clockwise.',
      'A gust tips it. The flight computer feels the tilt and resets the four speeds, often 400 times a second. This is attitude control.',
    ],
    concept: {
      name: 'Keeping the drone at a chosen tilt by constantly adjusting motor speeds is called attitude control',
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
      'A robot\'s gripper must reach the can on the far shelf. Going straight there, it hits the shelf in between.',
      'Pick a random point. Step a short way toward it from the closest spot already reached. Keep the step only if it hits nothing.',
      'Repeat thousands of times. The kept steps branch out into a tree that creeps into every open gap.',
      'When a branch reaches the goal, follow it back to the start. Then cut every corner where a straight shortcut is safe.',
      'Drag the shelf: the tree regrows. A fast version of this rapidly-exploring random tree plans a typical arm path in 40 millionths of a second.',
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
      'Two fingers pinch a block straight across and lift it. It holds.',
      'A fingertip can push straight in or at a slant. Any push inside this cone holds; slant further and the finger slides.',
      'Now it grabs the block with a tilted grip and lifts. The fingers squeeze along the line between them.',
      'A slippery block narrows the cones. At this tilt, rubber holds, while plastic and ice slip.',
      'Robots place their fingers so the squeeze line sits well inside both cones. Each cone is called a friction cone.',
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
      'A depth camera also measures how far away each point is. Each point becomes a dot, but only on the side it sees.',
      'Cubes split space into a grid. Each box is either part of the mug or empty. Blocky, but simple.',
      'A skin joins points on the surface into small flat triangles, giving the smooth, exact shape a robot needs to plan its grip.',
      'Soft blobs overlap into one surface. Each blob can also carry colour, so together they can look like a photo.',
      'Same mug, four ways to store it. Each trades detail against speed and memory. These are scene representations.',
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
      'It drives by counting wheel turns. Each turn adds a little error, so its guess slips further off and its cloud of doubt grows.',
      'Now its camera spots a landmark: a sign it already knows, at a known place on its map.',
      'A poorer camera shrinks the cloud less. The robot blends its own guess with the landmark\'s, trusting whichever has less doubt.',
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
      'A person moves a copy of the arm, and the robot copies every move. Drag the copy\'s hand: put the block on the circle.',
      'While it records, the robot saves what its camera sees and where every joint is, 30 times a second. Each save is one example.',
      'Each recorded run is a demonstration. After many, the robot learns to copy them and moves alone, beside a faint replay of one.',
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
      'This robot exists only inside a computer. It tries to walk, falls, starts over and does a little better each time.',
      'Now run 4,096 copies at once on one computer. All their tries train one shared brain, so every fall teaches it.',
      'Make every world a little different: slippery or grippy ground, heavier bodies, random shoves. Shuffle to deal new worlds.',
      'One tile is the real world. Two robots step onto it: one practised in just one world, the other in all 4,096.',
      'After thousands of different worlds, the real world is just one more. This is massively parallel simulation with domain randomization.',
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
