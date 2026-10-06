/** One census for scene capture, contact sheets, and site-wide checks. */
export interface SceneTarget {
  id: string;
  route: string;
  beats: number;
}

export const SCENE_TARGETS: readonly SceneTarget[] = [
  { id: 'kalman-predict-update', route: '/classical/state-estimation/', beats: 5 },
  { id: 'diffusion-denoising', route: '/manipulation/diffusion-policy/', beats: 5 },
  { id: 'batch-scale', route: '/rl-sim2real/parallel-sim-rl/', beats: 4 },
  { id: 'gait-support', route: '/rl-sim2real/legged-locomotion/', beats: 4 },
  { id: 'jam-overhead', route: '/data-hardware/industrial-deployment/', beats: 4 },
  { id: 'reliability-threshold', route: '/', beats: 4 },
  { id: 'tactile-slip', route: '/frontier/dexterity/', beats: 4 },
  { id: 'sense-avoid', route: '/adjacent/drones/', beats: 4 },
];
