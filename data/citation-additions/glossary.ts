/**
 * Sources added for glossary definitions in the November 2026 review.
 * Same schema and author-field policy as data/citations.ts: every entry was
 * opened and checked against the page it names.
 */
import type { Citation } from '../schemas/citation.ts';

export const ADDITIONS: Citation[] = [
  // transformer, 2026-11-12. arXiv Atom API: 8 authors in this order, v1 2017-06-12. Abstract: "We
  // propose a new simple network architecture, the Transformer, based solely on attention mechanisms,
  // dispensing with recurrence and convolutions entirely."
  {
    id: 'transformer-2017',
    title: 'Attention Is All You Need',
    authors: [
      'Ashish Vaswani',
      'Noam Shazeer',
      'Niki Parmar',
      'Jakob Uszkoreit',
      'Llion Jones',
      'Aidan N. Gomez',
      'Lukasz Kaiser',
      'Illia Polosukhin',
    ],
    year: 2017,
    arxiv: '1706.03762',
    url: 'https://arxiv.org/abs/1706.03762',
    type: 'paper',
  },
  // imu, 2026-11-12. Report landing page (UCAM-CL-TR-696, August 2007, DOI 10.48456/tr-696) prints
  // "Oliver J. Woodman". Section 2: "Inertial measurement units (IMUs) typically contain three
  // orthogonal rate-gyroscopes and three orthogonal accelerometers, measuring angular velocity and
  // linear acceleration respectively." Abstract: average position error "grows to over 150 m after
  // 60 seconds of operation".
  {
    id: 'woodman-inertial-navigation-2007',
    title: 'An introduction to inertial navigation',
    authors: ['Oliver J. Woodman'],
    year: 2007,
    venue: 'University of Cambridge Computer Laboratory, Technical Report UCAM-CL-TR-696',
    url: 'https://doi.org/10.48456/tr-696',
    type: 'paper',
  },
  // lidar, 2026-11-12. NOAA Ocean Service fact page, "Last updated: 09/23/26", "Author: NOAA":
  // "Lidar, which stands for Light Detection and Ranging, is a remote sensing method that uses light
  // in the form of a pulsed laser to measure ranges (variable distances)"; the pulses "generate
  // precise, three-dimensional information"; an instrument "principally consists of a laser, a
  // scanner, and a specialized GPS receiver".
  {
    id: 'noaa-lidar-2026',
    title: 'What is lidar?',
    authors: ['NOAA'],
    year: 2026,
    venue: 'NOAA Ocean Service, updated 2026-09-23',
    url: 'https://oceanservice.noaa.gov/facts/lidar.html',
    type: 'docs',
  },
  // support polygon, 2026-11-12. Crossref 10.1007/978-3-319-32552-1_48: Springer Handbook of
  // Robotics (2016), chapter 48, authors Pierre-Brice Wieber, Russ Tedrake, Scott Kuindersma. Text
  // read from the authors' preprint (groups.csail.mit.edu/robotics-center/public_papers/Wieber15.pdf),
  // section 48.3: the CoM "must project on the ground along the gravity vector ... inside the convex
  // hull of the contact points ... also known as the support polygon", "valid only when considering
  // contacts with a flat ground"; and "The most commonly used dynamic stability margin requires that
  // the CoP (or ZMP) remains within the boundary of the support polygon."
  {
    id: 'wieber-legged-robots-2016',
    title: 'Modeling and Control of Legged Robots',
    authors: ['Pierre-Brice Wieber', 'Russ Tedrake', 'Scott Kuindersma'],
    year: 2016,
    venue: 'Springer Handbook of Robotics (2nd ed.)',
    url: 'https://doi.org/10.1007/978-3-319-32552-1_48',
    type: 'paper',
  },
  // attitude control, 2026-11-12. Undated living page in the PX4 Guide (main), read 2026-11-12:
  // "This is a standard cascaded control architecture"; "The outer loop computes the error between
  // the attitude setpoint and the estimated attitude that, multiplied by a gain (P controller),
  // generates a rate setpoint"; the rate controller's P and I terms use filtered gyro data.
  {
    id: 'px4-controller-diagrams',
    title: 'Controller Diagrams',
    authors: ['PX4'],
    year: 'n.d.',
    accessedOn: '2026-11-12',
    venue: 'PX4 Guide (main)',
    url: 'https://docs.px4.io/main/en/flight_stack/controller_diagrams.html',
    type: 'docs',
  },
  // attitude control, 2026-11-12. NASA Small Spacecraft Technology State of the Art, chapter 5,
  // 2026 edition (PDF title "SOA: Guidance, Navigation, and Control 2026"), section 5.1: "Actuators
  // are designed to change a spacecraft's attitude ... Common spacecraft actuators include magnetic
  // torquers, reaction wheels, and thrusters."
  {
    id: 'nasa-smallsat-gnc-2026',
    title: 'Guidance, Navigation & Control',
    authors: ['NASA'],
    year: 2026,
    venue: 'NASA Small Spacecraft Technology State of the Art, chapter 5 (2026 edition)',
    url: 'https://www.nasa.gov/wp-content/uploads/2026/05/5-soa-gnc-2026-final.pdf',
    type: 'docs',
  },
  // De Novo pathway, 2026-11-12. FDA page "De Novo Classification Request", "Content current as of:
  // 09/30/2025", read 2026-11-12: "The De Novo request provides a marketing pathway to classify novel
  // medical devices for which general controls alone, or general and special controls, provide
  // reasonable assurance of safety and effectiveness for the intended use, but for which there is no
  // legally marketed predicate device"; devices classified "into class I or class II" through it
  // "may be marketed and used as predicates for future premarket notification [510(k)] submissions".
  {
    id: 'fda-de-novo-classification-2025',
    title: 'De Novo Classification Request',
    authors: ['U.S. Food and Drug Administration'],
    year: 2025,
    venue: 'U.S. Food and Drug Administration, content current as of 2025-09-30',
    url: 'https://www.fda.gov/medical-devices/premarket-submissions-selecting-and-preparing-correct-submission/de-novo-classification-request',
    type: 'docs',
  },
  // partial credit, 2026-11-12. BEHAVIOR site, "Evaluation and Rules" page for the 2026 challenge
  // (footer "(c) 2026 Stanford Vision and Learning Lab"), read 2026-11-12. Primary metric: "Task
  // success score: Averaged across 100 tasks. Calculation: Partial successes = (Number of goal BDDL
  // predicates satisfied at episode end) / (Total number of goal predicates)"; "The success score (Q)
  // is the metric used for ranking submissions."
  {
    id: 'behavior-challenge-evaluation-2026',
    title: 'Evaluation and Rules',
    authors: ['Stanford Vision and Learning Lab'],
    year: 2026,
    accessedOn: '2026-11-12',
    venue: 'BEHAVIOR project site, 2026 BEHAVIOR Challenge',
    url: 'https://behavior.stanford.edu/challenge/evaluation.html',
    type: 'docs',
  },
];
