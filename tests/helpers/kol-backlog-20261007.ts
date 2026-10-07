// Dated paragraphs that the 2026-10-07 KOL backlog step added, keyed by the
// article path under content/. withoutKolBacklogParagraphs in
// kol-backlog-20261001.ts removes these after the earlier batches' paragraphs.
export const KOL_BACKLOG_20261007_PARAGRAPHS: Readonly<Record<string, readonly string[]>> = {
  'classical/control.mdx': [
    "ForceTwin, from Marco Hutter (ETH Zurich) and colleagues (September 2026), fits an articulated object's inertia, friction, damping and spring or door-closer forces from a person probing it with a handheld force-sensing gripper. As the feedforward model for impedance control on a Spot and a Franka FR3, it completed 87% of goals across nine object-robot pairs, against 60% with vision-language-model priors and 57% with kinematics-only twins <Cite id=\"forcetwin-2026\" />.",
  ],
  'classical/scene-representation.mdx': [
    'ParticleSplat, from Deepak Pathak (Carnegie Mellon) and colleagues (September 2026), encodes posed multi-view images into latent particles that decode to 3D Gaussians, trained with a novel-view synthesis objective. Object masks emerge without labels, moving a particle moves its object, and the representation improved downstream manipulation <Cite id="particlesplat-2026" />.',
    'SceneLM, from Jitendra Malik (UC Berkeley), Marco Pavone and colleagues (September 2026), keeps the whole map as a structured text list of objects that one vision-language model edits after each image. On language-grounded retrieval and localization benchmarks it performed competitively with complete mapping pipelines, with a map 6 to 12 times more compact, and it ran online on an edge device aboard a quadruped <Cite id="scenelm-2026" />.',
  ],
  'frontier/dexterity.mdx': [
    "In September 2026, Enyi Wang and Yan Wang of Tsinghua University's Institute for AI Industry Research and colleagues reported TacDyn-WAM, a world action model that predicts learned tactile representations instead of reconstructing tactile images. On five real-robot tasks with 60 demonstrations each, it averaged 71.0% success, 16 points above the tactile policy FTP-1, and 85.0% after pretraining on about 6,000 real visuo-tactile trajectories <Cite id=\"tacdyn-wam-2026\" />.",
  ],
};
