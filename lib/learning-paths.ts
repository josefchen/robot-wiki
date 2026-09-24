import { getModule } from '@/data/modules';
import type { ModuleRegistryEntry } from '@/data/modules';
import type { AcquisitionCluster } from '@/lib/seo';

export interface LearningPath {
  id: Exclude<AcquisitionCluster, 'utility'>;
  title: string;
  description: string;
  hub: string;
  entries: readonly ModuleRegistryEntry[];
}

const DEFINITIONS = [
  {
    id: 'robot-learning-vla',
    title: 'Robot learning and VLA',
    description:
      'From embodied data and imitation learning to action models, evaluation, and deployment.',
    hub: '/manipulation/',
    keys: [
      'manipulation/robot-learning-roadmap',
      'data-hardware/datasets',
      'manipulation/bc-foundations',
      'manipulation/action-spaces',
      'manipulation/diffusion-policy',
      'manipulation/vla-models',
      'data-hardware/evaluation-crisis',
      'data-hardware/industrial-deployment',
    ],
  },
  {
    id: 'classical-robotics',
    title: 'Classical robotics foundations',
    description:
      'The dependency chain underneath learned policies: geometry, sensing, estimation, planning, and control.',
    hub: '/classical/',
    keys: [
      'classical/kinematics',
      'classical/calibration',
      'classical/perception',
      'classical/state-estimation',
      'classical/motion-planning',
      'classical/control',
      'classical/ros2-for-ml-engineers',
    ],
  },
  {
    id: 'world-models',
    title: 'World models for robotics',
    description:
      'Start with the overloaded term, then compare latent, representation-space, video, and simulation approaches.',
    hub: '/world-models/',
    keys: [
      'world-models/taxonomy',
      'world-models/model-based-robot-learning',
      'world-models/latent-dynamics',
      'world-models/jepa',
      'world-models/generative-video',
      'world-models/generative-sim',
      'world-models/evaluation',
      'world-models/world-models-vs-simulators',
    ],
  },
] as const;

export function learningPaths(): readonly LearningPath[] {
  return DEFINITIONS.map((definition) => {
    const entries = definition.keys.map((key) => {
      const [domain, slug] = key.split('/');
      const entry = getModule(domain, slug);
      if (!entry || entry.status !== 'published') {
        throw new Error(`learning path ${definition.id} references ${key}`);
      }
      return entry;
    });
    return { ...definition, entries };
  });
}
