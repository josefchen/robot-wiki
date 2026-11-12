/**
 * Sources added to the classical articles in the November 2026 review.
 * Same schema and author-field policy as data/citations.ts: every entry was
 * opened and checked against the page it names.
 */
import type { Citation } from '../schemas/citation.ts';

export const ADDITIONS: Citation[] = [
  // kinematics, 2026-11-12. CrossRef 10.1007/978-1-84628-642-1: Springer London, 2009.
  {
    id: 'siciliano-robotics-2009',
    title: 'Robotics: Modelling, Planning and Control',
    authors: ['Bruno Siciliano', 'Lorenzo Sciavicco', 'Luigi Villani', 'Giuseppe Oriolo'],
    year: 2009,
    venue: 'Springer London',
    url: 'https://doi.org/10.1007/978-1-84628-642-1',
    type: 'paper',
  },
  // UCSD report, version dated October 7, 2009: "The pseudoinverse method is unstable as
  // sigma_i approaches zero; in fact, it is exactly at singularities that sigma_i's are equal to zero."
  {
    id: 'buss-ik-survey-2009',
    title: 'Introduction to Inverse Kinematics with Jacobian Transpose, Pseudoinverse and Damped Least Squares methods',
    authors: ['Samuel R. Buss'],
    year: 2009,
    venue: 'University of California, San Diego (technical report)',
    url: 'https://mathweb.ucsd.edu/~sbuss/ResearchWeb/ikmethods/iksurvey.pdf',
    type: 'paper',
  },
  // README fetched 2026-11-12: "At each step, mink solves a quadratic program for a velocity: the one
  // that best reduces the task errors while it satisfies every limit and constraint."
  {
    id: 'mink-ik-2026',
    title: 'mink: Python inverse kinematics based on MuJoCo',
    authors: ['Kevin Zakka'],
    year: 2026,
    venue: 'GitHub',
    url: 'https://github.com/kevinzakka/mink',
    type: 'docs',
  },
  // README "URDF Versioning" table: 1.1 "Adds quaternion orientation support via the quat_xyzw
  // attribute and capsule geometry"; 1.2 "Adds extended joint limits: acceleration, deceleration, and jerk".
  {
    id: 'urdfdom-versions-2026',
    title: 'urdfdom: URDF Versioning',
    authors: ['ROS'],
    year: 2026,
    venue: 'ros/urdfdom GitHub README',
    url: 'https://github.com/ros/urdfdom',
    type: 'docs',
  },
  // Release published 2026-07-07: "URDF v1.2 support"; acceleration and jerk read from the <limit> element.
  {
    id: 'pinocchio-4-1-2026',
    title: 'pinocchio 4.1.0',
    authors: ['stack-of-tasks'],
    year: 2026,
    venue: 'stack-of-tasks/pinocchio GitHub release, 2026-07-07',
    url: 'https://github.com/stack-of-tasks/pinocchio/releases/tag/v4.1.0',
    type: 'docs',
  },
  // motion-planning, 2026-11-12. arXiv 2611.06913 v1 2026-11-04: "With a 3 kg payload, cuRoboV2-Fast
  // achieves 4.4 ms mean planning time on RTX 5090, 14.7x faster than cuRoboV2."
  {
    id: 'curobo-v2-fast-2026',
    title: 'cuRoboV2-Fast: Fast Torque-Limited Collision-Free Motion Planning',
    authors: ['Balakumar Sundaralingam', 'Adithyavairavan Murali', 'Stan Birchfield'],
    year: 2026,
    venue: 'arXiv preprint',
    arxiv: '2611.06913',
    url: 'https://arxiv.org/abs/2611.06913',
    type: 'paper',
  },
  // Release notes dated 2026-10-20: "An opt-in sanity check re-validates every planned trajectory, replans
  // from a new seed when it finds a collision ... on the collision-tunneling benchmark it cuts residual
  // tunneling roughly 7 to 12 times."
  {
    id: 'moveit-pro-10-2-2026',
    title: 'MoveIt Pro 10.2.0 release notes',
    authors: ['PickNik Robotics'],
    year: 2026,
    venue: 'MoveIt Pro documentation, 2026-10-20',
    url: 'https://docs.picknik.ai/release-notes/2026/10/20/10.2.0/',
    type: 'docs',
  },
  // arXiv 2610.23884 v1 2026-09-26: six planners, 1800 MotionBenchMaker problems, equal 2 s budget;
  // "On the 7-DoF Panda, sampling (pRRTC) is the most reliable paradigm at 98%"; "On the 14-DoF dual-arm
  // composite, sampling still solves about 90% of feasible problems, while no search or optimization
  // planner clears a third of them."
  {
    id: 'prismplan-2026',
    title: 'PrismPlan: A Shared GPU Substrate for Motion Planning Across Paradigms',
    authors: ['Hong Wu', 'ChaoXuan Liu', 'ShuJie Wang'],
    year: 2026,
    venue: 'arXiv preprint',
    arxiv: '2610.23884',
    url: 'https://arxiv.org/abs/2610.23884',
    type: 'paper',
  },
  // arXiv 2609.30213 v1 2026-09-24: constraints "reduce the valid configuration space to a measure-zero
  // subset"; "synthesize plans in microseconds to milliseconds for high dimensional systems (up to 20
  // dimensions)".
  {
    id: 'revamp-2026',
    title: 'ReVAMP: Vector-Accelerated Motion Planning for Kinematically-Constrained Systems via Reparameterization',
    authors: ['Shrutheesh R. Iyer', 'Thomas Cohn', 'Zachary Kingston'],
    year: 2026,
    venue: 'arXiv preprint',
    arxiv: '2609.30213',
    url: 'https://arxiv.org/abs/2609.30213',
    type: 'paper',
  },
  // arXiv 2604.23960 v1 2026-04-27: "all five planners attain subsecond median runtimes on problems with
  // four Panda manipulators."
  {
    id: 'va-mrmp-2026',
    title: 'Multi-Robot Motions in Milliseconds: Vector-Accelerated Primitives for Sampling-Based Planning',
    authors: ['James D. Motes', 'Marco Morales', 'Nancy M. Amato'],
    year: 2026,
    venue: 'arXiv preprint',
    arxiv: '2604.23960',
    url: 'https://arxiv.org/abs/2604.23960',
    type: 'paper',
  },
  // arXiv 1909.09688 (ICRA 2020): "we first identify a logical gap in the optimality proof of RRT*";
  // radius "should be increased from gamma (log n / n)^(1/d) to gamma' (log n / n)^(1/(d+1))".
  {
    id: 'solovey-rrt-star-2020',
    title: 'Revisiting the Asymptotic Optimality of RRT*',
    authors: ['Kiril Solovey', 'Lucas Janson', 'Edward Schmerling', 'Emilio Frazzoli', 'Marco Pavone'],
    year: 2020,
    venue: 'IEEE International Conference on Robotics and Automation (ICRA)',
    arxiv: '1909.09688',
    url: 'https://arxiv.org/abs/1909.09688',
    type: 'paper',
  },
  // CrossRef 10.1109/SFCS.1979.10, October 1979.
  {
    id: 'reif-1979',
    title: "Complexity of the mover's problem and generalizations",
    authors: ['John H. Reif'],
    year: 1979,
    venue: '20th Annual Symposium on Foundations of Computer Science (SFCS 1979)',
    url: 'https://doi.org/10.1109/SFCS.1979.10',
    type: 'paper',
  },
  // CrossRef 10.1146/annurev-control-060117-105226, published 2018-05-28.
  {
    id: 'kingston-constraints-2018',
    title: 'Sampling-Based Methods for Motion Planning with Constraints',
    authors: ['Zachary Kingston', 'Mark Moll', 'Lydia E. Kavraki'],
    year: 2018,
    venue: 'Annual Review of Control, Robotics, and Autonomous Systems',
    url: 'https://doi.org/10.1146/annurev-control-060117-105226',
    type: 'paper',
  },
  // control, 2026-11-12. arXiv 2610.22176 v1 2026-10-15: integrates "a whole body model predictive
  // controller (WB-MPC) with an extended Kalman filter (EKF) for online estimation of fully physically
  // consistent time-varying inertial parameters"; "validated with simulation and hardware experiments on
  // a humanoid system."
  {
    id: 'foster-wbmpc-payload-2026',
    title: 'Inertially Significant Humanoid Teleoperation via Whole Body Model Predictive Control and Online Parameter Estimation',
    authors: ['James Foster', 'Beomyeong Park', 'Luigi Penco', 'Robert Griffin'],
    year: 2026,
    venue: 'arXiv preprint',
    arxiv: '2610.22176',
    url: 'https://arxiv.org/abs/2610.22176',
    type: 'paper',
  },
  // arXiv 2610.35862 v1 2026-10-26: "the force-reactive policy succeeds in 80% of rollouts, compared with
  // 26.7% for a position-only policy trained on the same demonstrations and executed by the same controller."
  {
    id: 'flore-2026',
    title: 'Learning Force-Reactive Humanoid Loco-Manipulation',
    authors: ['Sihang Li', 'Xiaofeng Guo', 'Jinkun Cao', 'Charlie Cheng', 'Ruihan Yang', 'Chen Feng', 'Guanya Shi', 'Haozhi Qi'],
    year: 2026,
    venue: 'arXiv preprint',
    arxiv: '2610.35862',
    url: 'https://arxiv.org/abs/2610.35862',
    type: 'paper',
  },
  // CrossRef 10.1007/978-1-4899-7560-7: Springer US, 2008.
  {
    id: 'featherstone-2008',
    title: 'Rigid Body Dynamics Algorithms',
    authors: ['Roy Featherstone'],
    year: 2008,
    venue: 'Springer US',
    url: 'https://doi.org/10.1007/978-1-4899-7560-7',
    type: 'paper',
  },
  // arXiv 2212.00541: "We introduce MuJoCo MPC (MJPC), an open-source, interactive application and
  // software framework for real-time predictive control, based on MuJoCo physics."
  {
    id: 'mjpc-2022',
    title: 'Predictive Sampling: Real-time Behaviour Synthesis with MuJoCo',
    authors: ['Taylor Howell', 'Nimrod Gileadi', 'Saran Tunyasuvunakool', 'Kevin Zakka', 'Tom Erez', 'Yuval Tassa'],
    year: 2022,
    venue: 'arXiv preprint',
    arxiv: '2212.00541',
    url: 'https://arxiv.org/abs/2212.00541',
    type: 'paper',
  },
  // arXiv 1909.04947 (ICRA 2020): "an open-source framework tailored for efficient multi-contact optimal control".
  {
    id: 'crocoddyl-2019',
    title: 'Crocoddyl: An Efficient and Versatile Framework for Multi-Contact Optimal Control',
    authors: ['Carlos Mastalli', 'Rohan Budhiraja', 'Wolfgang Merkt', 'Guilhem Saurel', 'Bilal Hammoud', 'Maximilien Naveau', 'Justin Carpentier', 'Ludovic Righetti', 'Sethu Vijayakumar', 'Nicolas Mansard'],
    year: 2019,
    venue: 'arXiv preprint',
    arxiv: '1909.04947',
    url: 'https://arxiv.org/abs/1909.04947',
    type: 'paper',
  },
  // arXiv 1910.13753: "a collection of solvers for fast embedded optimization intended for fast embedded applications".
  {
    id: 'acados-2019',
    title: 'acados: a modular open-source framework for fast embedded optimal control',
    authors: ['Robin Verschueren', 'Gianluca Frison', 'Dimitris Kouzoupis', 'Jonathan Frey', 'Niels van Duijkeren', 'Andrea Zanelli', 'Branimir Novoselnik', 'Thivaharan Albin', 'Rien Quirynen', 'Moritz Diehl'],
    year: 2019,
    venue: 'arXiv preprint',
    arxiv: '1910.13753',
    url: 'https://arxiv.org/abs/1910.13753',
    type: 'paper',
  },
  // state-estimation, 2026-11-12. arXiv 2107.06829 (IEEE T-RO 2022): "up to 100 Hz odometry and mapping
  // in large outdoor environments"; iterated Kalman filter core.
  {
    id: 'fast-lio2-2021',
    title: 'FAST-LIO2: Fast Direct LiDAR-inertial Odometry',
    authors: ['Wei Xu', 'Yixi Cai', 'Dongjiao He', 'Jiarong Lin', 'Fu Zhang'],
    year: 2021,
    venue: 'arXiv preprint',
    arxiv: '2107.06829',
    url: 'https://arxiv.org/abs/2107.06829',
    type: 'paper',
  },
  // arXiv 2007.00258 (IROS 2020): lidar inertial odometry "via smoothing and mapping" on a factor graph
  // with IMU pre-integration and loop closures as factors.
  {
    id: 'lio-sam-2020',
    title: 'LIO-SAM: Tightly-coupled Lidar Inertial Odometry via Smoothing and Mapping',
    authors: ['Tixiao Shan', 'Brendan Englot', 'Drew Meyers', 'Wei Wang', 'Carlo Ratti', 'Daniela Rus'],
    year: 2020,
    venue: 'arXiv preprint',
    arxiv: '2007.00258',
    url: 'https://arxiv.org/abs/2007.00258',
    type: 'paper',
  },
  // CrossRef 10.3390/s26206568, Sensors 26(20), 2026-10-16. Abstract: "The workstation's most accurate
  // system collapses on the target, silently discarding up to two-thirds of its input while latency,
  // coverage and memory report normal operation."
  {
    id: 'matos-lio-benchmark-2026',
    title: 'Benchmarking LiDAR and LiDAR-Inertial Odometry Algorithms for Embedded UAV Deployment in Warehouse Environments',
    authors: ['António T. Matos', 'André Dias', 'André Moura', 'João J. Martins', 'Ricardo Morais', 'José Almeida'],
    year: 2026,
    venue: 'Sensors',
    url: 'https://doi.org/10.3390/s26206568',
    type: 'paper',
  },
  // arXiv 2610.17870 v1 2026-10-13: "tightly couples measurements from a main body IMU, multiple
  // leg-mounted IMUs, and joint encoders within a sliding-window optimization"; quadruped experiments.
  {
    id: 'lag-io-2026',
    title: 'LAG-IO: Multi-IMU State Estimation for Legged Robots Using Factor Graphs',
    authors: ['Yicheng Zhou', 'Longwen Chen', 'Qinghua Yu', 'Junhao Xiao', 'Huimin Lu', 'Xieyuanli Chen'],
    year: 2026,
    venue: 'arXiv preprint',
    arxiv: '2610.17870',
    url: 'https://arxiv.org/abs/2610.17870',
    type: 'paper',
  },
  // arXiv 2610.29568 v1 2026-10-21: "the flow matching model serves as an auxiliary proposal distribution";
  // real-world "errors of only 0.36 cm and 0.88 cm for single- and dual-contact scenarios, respectively,
  // while operating at 0.69 ms and 2.69 ms."
  {
    id: 'contact-flow-filter-2026',
    title: 'Mixture of Flow Matching and Particle Filter for Proprioception-Based Online Contact Estimation',
    authors: ['Seo Wook Han', 'Min Jun Kim'],
    year: 2026,
    venue: 'arXiv preprint',
    arxiv: '2610.29568',
    url: 'https://arxiv.org/abs/2610.29568',
    type: 'paper',
  },
  // grasp-planning, 2026-11-12. arXiv 2212.08333 (IEEE T-RO 2023): "a 93.3% success rate when clearing
  // bins with over 300 unseen objects"; "Over 900 mean-picks-per-hour is reported on a single-arm system."
  {
    id: 'anygrasp-2022',
    title: 'AnyGrasp: Robust and Efficient Grasp Perception in Spatial and Temporal Domains',
    authors: ['Hao-Shu Fang', 'Chenxi Wang', 'Hongjie Fang', 'Minghao Gou', 'Jirong Liu', 'Hengxu Yan', 'Wenhai Liu', 'Yichen Xie', 'Cewu Lu'],
    year: 2022,
    venue: 'arXiv preprint',
    arxiv: '2212.08333',
    url: 'https://arxiv.org/abs/2212.08333',
    type: 'paper',
  },
  // arXiv 2103.14127 (ICRA 2021): "trained on 17 million simulated grasps"; "over 90% success rate" on
  // unseen objects in structured clutter.
  {
    id: 'contact-graspnet-2021',
    title: 'Contact-GraspNet: Efficient 6-DoF Grasp Generation in Cluttered Scenes',
    authors: ['Martin Sundermeyer', 'Arsalan Mousavian', 'Rudolph Triebel', 'Dieter Fox'],
    year: 2021,
    venue: 'arXiv preprint',
    arxiv: '2103.14127',
    url: 'https://arxiv.org/abs/2103.14127',
    type: 'paper',
  },
  // arXiv 2605.26944 v1 2026-05-26. Physics-simulator experiments: modular methods' grasp success "is 1.6
  // to 2 times higher than the end-to-end method (i.e., AnyGrasp)"; "The end-to-end method yields a very
  // high force closure failure rate of 61.3%."
  {
    id: 'pose-shape-grasp-2026',
    title: 'Object Pose and Shape Estimation for Grasping: Does it Work?',
    authors: ['Pavan Karke', 'Kushal Shah', 'Gaurav Singh', 'Md Faizal Karim', 'K Madhava Krishna', 'Rajat Talak'],
    year: 2026,
    venue: 'arXiv preprint',
    arxiv: '2605.26944',
    url: 'https://arxiv.org/abs/2605.26944',
    type: 'paper',
  },
  // arXiv 2610.25410 v1 2026-10-18: "around 0.5B grasp annotations across eight dexterous hands and
  // approximately 50K objects".
  {
    id: 'tro-grasp-plus-2026',
    title: 'T(R,O) Grasp++: Cross-Embodiment Dexterous Grasping in Cluttered Environments at Scale',
    authors: ['Xin Fei', 'Zhixuan Xu', 'Huaicong Fang', 'Fangjun Chen', 'Zhaoyu Mu', 'Rui Yang', 'Zhexi Luo', 'Lin Shao'],
    year: 2026,
    venue: 'arXiv preprint',
    arxiv: '2610.25410',
    url: 'https://arxiv.org/abs/2610.25410',
    type: 'paper',
  },
  // arXiv 2610.11194 v1 2026-10-08: "over 2.6 million scenes and 0.4B scene-specific grasp ground truths".
  {
    id: 'omnidex-2026',
    title: 'OmniDex: Scaling Dexterous Hand Grasping to Diverse Cluttered Scenes',
    authors: ['Naiyu Fang', 'Zhongjin Luo', 'Yuxin Mo', 'Siyuan Huang', 'Jianbo Liu', 'Yufei Liu', 'Zheyuan Zhou', 'Chenkai Jin', 'Xiaogang Wang', 'Hongsheng Li'],
    year: 2026,
    venue: 'arXiv preprint',
    arxiv: '2610.11194',
    url: 'https://arxiv.org/abs/2610.11194',
    type: 'paper',
  },
  // perception, 2026-11-12. arXiv 2512.11130: "can run over 10x faster than FoundationStereo while
  // closely matching its zero-shot accuracy".
  {
    id: 'fast-foundationstereo-2025',
    title: 'Fast-FoundationStereo: Real-Time Zero-Shot Stereo Matching',
    authors: ['Bowen Wen', 'Shaurya Dewan', 'Stan Birchfield'],
    year: 2025,
    venue: 'arXiv preprint',
    arxiv: '2512.11130',
    url: 'https://arxiv.org/abs/2512.11130',
    type: 'paper',
  },
  // Meta AI blog, update dated March 27, 2026: "track up to 16 objects in a single forward pass";
  // "increasing throughput from 16 to 32 frames per second on a single H100 GPU".
  {
    id: 'sam3-1-2026',
    title: 'SAM 3.1: Faster and More Accessible Real-Time Video Detection and Tracking With Multiplexing and Global Reasoning',
    authors: ['Meta AI'],
    year: 2026,
    venue: 'Meta AI blog',
    url: 'https://ai.meta.com/blog/segment-anything-model-3/',
    type: 'blog',
  },
  // Cognex press release, Sept. 22, 2026: "Cognex will acquire RealSense for approximately $500 million";
  // "The transaction is expected to close in the fourth quarter of 2026".
  {
    id: 'cognex-realsense-2026',
    title: 'Cognex to Acquire RealSense, Expanding Machine Vision Leadership into High-Growth Robotic Perception Market',
    authors: ['Cognex Corporation'],
    year: 2026,
    venue: 'Cognex press release',
    url: 'https://www.cognex.com/en/company/press-releases/cognex-to-acquire-realsense',
    type: 'press',
  },
  // BOP Challenge 2025 page, fetched 2026-11-12: seen-object accuracy "improving by more than 50% (from
  // 56.9 to 86.0 AR) on the seven BOP core datasets"; unseen objects onboarded "in max 5 min on 1 GPU";
  // "The best method for this task achieved in 2024 an impressive 82.5 AR"; tracks on BOP-Industrial.
  {
    id: 'bop-2025-challenge',
    title: 'BOP Challenge 2025',
    authors: ['BOP organizers'],
    year: 2025,
    venue: 'BOP: Benchmark for 6D Object Pose Estimation',
    url: 'https://bop.felk.cvut.cz/challenges/bop-challenge-2025/',
    type: 'docs',
  },
  // arXiv 2506.00599: "Benchmarking state-of-the-art (SOTA) methods for 2D detection and 6D pose
  // estimation reveals a significant performance degradation compared to standard household benchmarks".
  {
    id: 'xyz-ibd-2025',
    title: 'XYZ-IBD: Benchmarking Robust 6D Object Pose Estimation under Real-World Industrial Complexity',
    authors: ['Junwen Huang', 'Jiaqi Hu', 'Peter KT Yu', 'Slobodan Ilic', 'Martin Sundermeyer', 'Benjamin Busam'],
    year: 2025,
    venue: 'arXiv preprint',
    arxiv: '2506.00599',
    url: 'https://arxiv.org/abs/2506.00599',
    type: 'paper',
  },
  // CrossRef 10.1017/CBO9780511811685: Cambridge University Press, 2004 (2nd ed.).
  {
    id: 'hartley-zisserman-2004',
    title: 'Multiple View Geometry in Computer Vision',
    authors: ['Richard Hartley', 'Andrew Zisserman'],
    year: 2004,
    venue: 'Cambridge University Press',
    url: 'https://doi.org/10.1017/CBO9780511811685',
    type: 'paper',
  },
  // scene-representation, 2026-11-12. arXiv 2601.19887 v1 2026-01-27: "remove high-dimensional
  // 15-degree-of-freedom drift and planar degeneracy from VGGT-SLAM by creating a new factor graph design";
  // "running online onboard a ground robot using a Jetson Thor"; "about 23 percent less pose error than
  // VGGT-SLAM" on TUM.
  {
    id: 'vggt-slam-2-2026',
    title: 'VGGT-SLAM 2.0: Real-time Dense Feed-forward Scene Reconstruction',
    authors: ['Dominic Maggio', 'Luca Carlone'],
    year: 2026,
    venue: 'arXiv preprint',
    arxiv: '2601.19887',
    url: 'https://arxiv.org/abs/2601.19887',
    type: 'paper',
  },
  // arXiv 2610.23622 v1 2026-10-16: integrates FOUND-IT "into a mobile manipulator platform"; supports
  // "object change detection, support for multiple mapping sessions, determination of navigable paths, and
  // directly support object grasping"; scene graphs "from a single uncalibrated camera".
  {
    id: 'found-it-mobile-manipulation-2026',
    title: 'Foundation-Model-Driven 3D Scene Graphs for Mobile Manipulation',
    authors: ['Dominic Maggio', 'Lorenzo Shaikewitz', 'Aryan Naveen', 'Kris Hauser', 'Luca Carlone'],
    year: 2026,
    venue: 'arXiv preprint',
    arxiv: '2610.23622',
    url: 'https://arxiv.org/abs/2610.23622',
    type: 'paper',
  },
  // arXiv 2602.16356 (v2 2026-10-12): "semantic-kinematic 3D scene graphs of articulated scenes";
  // revolute and prismatic joint parameters; "parent-child relations" between containers and contents.
  {
    id: 'moma-sg-2026',
    title: 'Articulated 3D Scene Graphs for Open-World Mobile Manipulation',
    authors: ['Martin Büchner', 'Adrian Röfer', 'Tim Engelbracht', 'Tim Welschehold', 'Zuria Bauer', 'Hermann Blum', 'Marc Pollefeys', 'Abhinav Valada'],
    year: 2026,
    venue: 'arXiv preprint',
    arxiv: '2602.16356',
    url: 'https://arxiv.org/abs/2602.16356',
    type: 'paper',
  },
  // Isaac Sim docs, Neural Volume Rendering, fetched 2026-11-12: environments "use OpenUSD ParticleField
  // geometry (3D Gaussian splats and related radiance fields), which Omniverse RTX renders natively
  // together with polygonal scene content."
  {
    id: 'isaac-sim-nurec-docs-2026',
    title: 'Neural Volume Rendering',
    authors: ['NVIDIA'],
    year: 2026,
    venue: 'Isaac Sim documentation',
    url: 'https://docs.isaacsim.omniverse.nvidia.com/latest/assets/usd_assets_nurec.html',
    type: 'docs',
  },
  // arXiv 2409.06765: "gsplat achieves up to 10% less training time and 4x less memory than the original
  // implementation."
  {
    id: 'gsplat-2024',
    title: 'gsplat: An Open-Source Library for Gaussian Splatting',
    authors: ['Vickie Ye', 'Ruilong Li', 'Justin Kerr', 'Matias Turkulainen', 'Brent Yi', 'Zhuoyang Pan', 'Otto Seiskari', 'Jianbo Ye', 'Jeffrey Hu', 'Matthew Tancik', 'Angjoo Kanazawa'],
    year: 2024,
    venue: 'arXiv preprint',
    arxiv: '2409.06765',
    url: 'https://arxiv.org/abs/2409.06765',
    type: 'paper',
  },
  // calibration, 2026-11-12. arXiv 2611.02999 v1 2026-11-02: "one 6.5 s motion yields 0.21 cm
  // translation error"; "Compensating the recovered offset during policy training and deployment increases
  // success by 8.1 percentage points across six families and six tasks (1,800 matched pairs)".
  {
    id: 'synchec-2026',
    title: 'SyncHeC: Markerless Spatio-Temporal Hand-Eye Calibration via Differentiable Rendering and Continuous-Time Joint Optimization',
    authors: ['Zhengdong Hong'],
    year: 2026,
    venue: 'arXiv preprint',
    arxiv: '2611.02999',
    url: 'https://arxiv.org/abs/2611.02999',
    type: 'paper',
  },
  // arXiv 2611.02884 v1 2026-11-02: wrist and fixed cameras "in a single procedure"; "calibration errors
  // in simulation decrease by 86.4% in translation and 71.6% in rotation ... relative to
  // reconstruction-based baselines."
  {
    id: 'anchorhec-2026',
    title: 'AnchorHEC: Targetless Hand-Eye Calibration of Wrist and Fixed Cameras',
    authors: ['Guebin Hwang', 'Taeyeop Lee', 'Yeonseo Lee', 'Hyosup Shin', 'Sungho Jo'],
    year: 2026,
    venue: 'arXiv preprint',
    arxiv: '2611.02884',
    url: 'https://arxiv.org/abs/2611.02884',
    type: 'paper',
  },
  // arXiv 2609.02306 v1 2026-09-02: "calibration reduces foot-height RMS residuals from 4.26 to 2.20 mm
  // on A3 and from 8.03 to 1.43 mm on A2"; uses "static double-support contact".
  {
    id: 'humanoid-joint-offset-2026',
    title: 'Contact-Constrained Lower-Limb Joint-Offset Calibration for Humanoid Robots',
    authors: ['Kaixiang Lu', 'Haiyu Lan', 'Chunxiao Qiao', 'You Li', 'Chengyuan Luo', 'Enyu Li', 'Peiwen Lin', 'Chuang Wang'],
    year: 2026,
    venue: 'arXiv preprint',
    arxiv: '2609.02306',
    url: 'https://arxiv.org/abs/2609.02306',
    type: 'paper',
  },
  // arXiv 2609.10082 v1 2026-09-09: "image filtering reduces the held-out reprojection error by 25%".
  {
    id: 'reproducible-intrinsics-2026',
    title: 'Automatic Reproducible Camera Intrinsic Calibration',
    authors: ['Xiangcheng Hu'],
    year: 2026,
    venue: 'arXiv preprint',
    arxiv: '2609.10082',
    url: 'https://arxiv.org/abs/2609.10082',
    type: 'paper',
  },
  // ros2-for-ml-engineers, 2026-11-12. REP 2000 (modified 2026-07-08): releases "every 12 months";
  // LTS releases in even years "supported for 5 years", alternating with non-LTS releases.
  {
    id: 'rep-2000-2026',
    title: 'REP 2000: ROS 2 Releases and Target Platforms',
    authors: ['Mikael Arguedas', 'Steven! Ragnarok', 'Dirk Thomas', 'Audrow Nash', 'Geoffrey Biggs', 'Marco A. Gutierrez'],
    year: 2026,
    venue: 'Robotics Enhancement Proposals',
    url: 'https://reps.openrobotics.org/rep-2000/',
    type: 'docs',
  },
  // Open Robotics Discourse post by ahcorde, 2026-11-04: "@christophebedard is the ROS Boss for ROS 2
  // Makoa Mata-mata, our next release, planned for May 2027."
  {
    id: 'ros2-makoa-boss-2026',
    title: 'Christophe Bédard is the ROS Boss for ROS 2 Makoa Mata-mata',
    authors: ['ahcorde'],
    year: 2026,
    venue: 'Open Robotics Discourse',
    url: 'https://discourse.openrobotics.org/t/christophe-bedard-is-the-ros-boss-for-ros-2-makoa-mata-mata/59531',
    type: 'blog',
  },
  // README fetched 2026-11-12: "Without the Zenoh router, nodes will not be able to discover each other
  // since multicast discovery is disabled by default in the node's session config."
  {
    id: 'rmw-zenoh-readme-2026',
    title: 'rmw_zenoh',
    authors: ['ROS 2'],
    year: 2026,
    venue: 'ros2/rmw_zenoh GitHub README',
    url: 'https://github.com/ros2/rmw_zenoh',
    type: 'docs',
  },
];
