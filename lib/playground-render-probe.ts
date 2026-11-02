/** Values sampled from the actual Three.js object graph, not calculated
 * from the UI state or from the canonical expected kinematic chain. */
export type PlaygroundRenderProbe = {
  kind: string;
  name: string;
  contextActive: boolean;
  clearColour: string;
  toneMapping: number;
  points: number;
  sprites: number;
  fog: boolean;
  joints: Array<{
    name: string;
    angle: number;
    lower: number;
    upper: number;
    position: [number, number, number];
  }>;
  links: Array<{
    name: string;
    position: [number, number, number];
  }>;
  meshes: Array<{
    name: string;
    vertices: number;
    colours: string[];
    roughness: number[];
    metalness: number[];
  }>;
};
