import type { SceneTarget } from './motion-scene-registry';

export type SceneRole = 'state' | 'measurement' | 'action' | 'value' | 'constraint' | 'reference' | 'highlight';

/** Independent semantic classification. A new mark must receive a reviewed role. */
const ROLE_RULES: Record<string, readonly [RegExp, SceneRole | 'gait-phase'][]> = {
  'kalman-predict-update': [
    [/^(guess|blend)-(area|curve)$/, 'state'],
    [/^reading-(area|curve)$/, 'measurement'],
    [/^blend-(share|point)$/, 'highlight'],
  ],
  'diffusion-denoising': [[/^observed-state$/, 'state'],
    [/^demonstration-\d+$|^action-arrow-\d+$|^action-\d+$/, 'action'],
    [/^reference-arrow-\d+$|^noise-\d+$/, 'reference'], [/^worked-guess$/, 'highlight']],
  'batch-scale': [[/^fixed-budget-time$/, 'value'], [/^cpu-cost-time$/, 'constraint'],
    [/^selected-environment-count$/, 'highlight']],
  'gait-support': [[/^[a-z]+-foot-\d+$/, 'state']],
  'jam-overhead': [[/^productive-time$/, 'value'],
    [/^clearing-time$|^downtime$/, 'constraint']],
  'reliability-threshold': [[/^episode-\d+$/, 'value']],
  'tactile-slip': [[/^held-object$/, 'state'], [/^(left|right)-touch$/, 'measurement']],
  'sense-avoid': [[/^latency-budget$|^obstacle$/, 'constraint'],
    [/^avoidance-budget$/, 'action']],
};

export function expectedSceneRole(sceneId: SceneTarget['id'], mark: string): SceneRole | 'gait-phase' {
  const matching = (ROLE_RULES[sceneId] ?? []).filter(([pattern]) => pattern.test(mark));
  if (matching.length !== 1) throw new Error(`${sceneId}: ${mark} has ${matching.length} semantic roles`);
  return matching[0][1];
}

export function registeredRoleScenes(): string[] {
  return Object.keys(ROLE_RULES);
}
