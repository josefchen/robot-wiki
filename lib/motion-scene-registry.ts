/** One census for scene capture, contact sheets, and site-wide checks. */
export interface SceneTarget {
  id: string;
  route: string;
  beats: number;
}

export const SCENE_TARGETS: readonly SceneTarget[] = [
  { id: 'kalman-predict-update', route: '/classical/state-estimation/', beats: 5 },
  { id: 'fk-chain', route: '/classical/kinematics/', beats: 4 },
  { id: 'rrt-growth', route: '/classical/motion-planning/', beats: 4 },
  { id: 'diffusion-denoising', route: '/manipulation/diffusion-policy/', beats: 4 },
  { id: 'action-decode', route: '/manipulation/vla-models/', beats: 4 },
  { id: 'flow-transport', route: '/manipulation/pi-line/', beats: 4 },
  { id: 'batch-scale', route: '/rl-sim2real/parallel-sim-rl/', beats: 4 },
  { id: 'gait-support', route: '/rl-sim2real/legged-locomotion/', beats: 4 },
  { id: 'action-fork', route: '/world-models/generative-video/', beats: 4 },
  { id: 'latent-drift', route: '/world-models/latent-dynamics/', beats: 4 },
  { id: 'push-layers', route: '/world-models/generative-sim/', beats: 4 },
  { id: 'farm-throughput', route: '/data-hardware/data-bottleneck/', beats: 4 },
  { id: 'episode-survival', route: '/data-hardware/evaluation-crisis/', beats: 4 },
  { id: 'jam-overhead', route: '/data-hardware/industrial-deployment/', beats: 4 },
  { id: 'reliability-threshold', route: '/frontier/reliability-gap/', beats: 4 },
  { id: 'tactile-slip', route: '/frontier/dexterity/', beats: 4 },
  { id: 'sense-avoid', route: '/adjacent/drones/', beats: 4 },
];
