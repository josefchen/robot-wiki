import { readFileSync } from 'node:fs';
import { Mesh, SRGBColorSpace } from 'three';
import { describe, expect, it } from 'vitest';
import { applyStageLook } from '@/components/three/load-robot';
import { createProceduralArm } from '@/components/three/procedural-arm';
import {
  CLAY_MIX,
  PLAYGROUND_COLORS,
  PLAYGROUND_MATERIALS,
  STAGE_LIGHTS,
  hexToSrgb,
  mixSrgb,
  stageFov,
} from '@/components/three/stage-look';

/**
 * The playground's WebGL colours and light rig are restated literals (WebGL
 * cannot read CSS). These tests hold them to the runtime sources they
 * mirror: the --color-* and --accent declarations in app/globals.css, the
 * explainers' clay and motor mixes in explainers.css, and the explainer
 * stage in kit.js. A change to any of those fails here until the
 * playground follows.
 */

const globals = readFileSync('app/globals.css', 'utf8');
const explainersCss = readFileSync('components/explainers/explainers.css', 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
const kit = readFileSync('components/explainers/kit.js', 'utf8');
const armScene = readFileSync('components/explainers/scenes/arm.js', 'utf8');

function declared(css: string, name: string): string {
  const match = css.match(new RegExp(`${name}:\\s*([^;]+);`));
  if (!match) throw new Error(`${name} is not declared`);
  return match[1].trim();
}

function hex(name: string): string {
  const value = declared(globals, name);
  expect(value, name).toMatch(/^#[0-9A-Fa-f]{6}$/);
  return value.toUpperCase();
}

const close = (actual: readonly number[], expected: readonly number[], digits = 12) => {
  expect(actual).toHaveLength(3);
  actual.forEach((value, i) => expect(value).toBeCloseTo(expected[i], digits));
};

describe('playground colours resolve to the runtime tokens', () => {
  it('clears to the page paper and paints the accent the page uses', () => {
    close(PLAYGROUND_COLORS.paper, hexToSrgb(hex('--color-paper')));
    close(PLAYGROUND_COLORS.accent, hexToSrgb(hex('--color-signal')));
    close(PLAYGROUND_COLORS.miss, hexToSrgb(hex('--color-error')));
    // The explainers' focus colour is the role highlight, which is --accent.
    expect(declared(explainersCss, '--focus')).toBe('var(--role-highlight-graphic)');
    expect(hex('--accent')).toBe(hex('--color-signal'));
  });

  it('mixes clay and motor grey exactly as the explainers declare them', () => {
    const clay = declared(explainersCss, '--clay').match(
      /^color-mix\(in srgb, var\(--color-concrete\), var\(--color-graphite\) ([\d.]+)%\)$/,
    );
    const dark = declared(explainersCss, '--dark').match(
      /^color-mix\(in srgb, var\(--color-graphite\), var\(--color-concrete\) ([\d.]+)%\)$/,
    );
    expect(clay, '--clay is a concrete/graphite mix').not.toBeNull();
    expect(dark, '--dark is a graphite/concrete mix').not.toBeNull();
    expect(CLAY_MIX.graphiteInClay).toBe(Number(clay![1]) / 100);
    expect(CLAY_MIX.concreteInDark).toBe(Number(dark![1]) / 100);
    close(
      PLAYGROUND_COLORS.clay,
      mixSrgb(hex('--color-concrete'), hex('--color-graphite'), Number(clay![1]) / 100),
    );
    close(
      PLAYGROUND_COLORS.dark,
      mixSrgb(hex('--color-graphite'), hex('--color-concrete'), Number(dark![1]) / 100),
    );
  });

  it('hands three.js those colours as sRGB, so they render unchanged', () => {
    for (const [name, colour] of [
      ['clay', PLAYGROUND_COLORS.clay],
      ['dark', PLAYGROUND_COLORS.dark],
      ['accent', PLAYGROUND_COLORS.accent],
    ] as const) {
      const material = PLAYGROUND_MATERIALS[name];
      const rgb = { r: 0, g: 0, b: 0 };
      material.color.getRGB(rgb, SRGBColorSpace);
      // Through three's linear working space and back: far inside 1/255.
      close([rgb.r, rgb.g, rgb.b], colour, 4);
    }
    expect(PLAYGROUND_MATERIALS.clay.roughness).toBe(STAGE_LIGHTS.material.roughness);
    expect(PLAYGROUND_MATERIALS.clay.metalness).toBe(STAGE_LIGHTS.material.metalness);
  });
});

describe('playground light rig matches the explainer stage', () => {
  it('uses the same hemisphere, key, fill and floor shadow', () => {
    const { hemisphere, key, fill } = STAGE_LIGHTS;
    expect(kit).toContain(
      `new THREE.HemisphereLight(0x${hemisphere.sky.slice(1).toLowerCase()}, 0x${hemisphere.ground.slice(1).toLowerCase()}, ${hemisphere.intensity})`,
    );
    expect(kit).toContain(`this.key = new THREE.DirectionalLight(0xffffff, ${key.intensity});`);
    expect(kit).toContain(`this.key.shadow.mapSize.set(${key.mapSize}, ${key.mapSize});`);
    expect(kit).toContain(`this.key.shadow.radius = ${key.radius};`);
    expect(kit).toContain(`this.key.shadow.bias = ${key.bias};`);
    expect(kit).toContain('this.renderer.shadowMap.type = THREE.PCFShadowMap;');
    expect(kit).toContain(
      `this.key.position.set(${key.direction[0]} * size, ${key.direction[1].toFixed(1)} * size, ${key.direction[2]} * size);`,
    );
    expect(kit).toContain(`left: -${key.extent} * size, right: ${key.extent} * size`);
    expect(kit).toContain(`const fill = new THREE.DirectionalLight(0xffffff, ${fill.intensity});`);
    expect(kit).toContain(`fill.position.set(${fill.position.join(', ')});`);
    expect(kit).toContain(
      `roughness: ${STAGE_LIGHTS.material.roughness}, metalness: ${STAGE_LIGHTS.material.metalness}`,
    );
    expect(kit).toContain(`{ roughness: ${STAGE_LIGHTS.accentRoughness} }`);
    expect(declared(explainersCss, '--shadow')).toBe(String(STAGE_LIGHTS.floorShadowOpacity));
    // The arm explainer's scale, which places the key light and its shadow.
    expect(armScene).toContain(`stage.setScale(${STAGE_LIGHTS.size});`);
  });

  it('keeps the explainer camera: 30 degrees on a 16:10 stage, wider when narrower', () => {
    expect(kit).toContain('new THREE.PerspectiveCamera(30, 16 / 10, 0.01, 200)');
    expect(stageFov(16 / 10)).toBeCloseTo(30, 10);
    expect(stageFov(2.2)).toBe(30);
    const hHalf = Math.atan(Math.tan((15 * Math.PI) / 180) * 1.6);
    for (const aspect of [1.25, 1, 0.6]) {
      expect(stageFov(aspect)).toBeCloseTo((2 * Math.atan(Math.tan(hHalf) / aspect) * 180) / Math.PI, 10);
      expect(stageFov(aspect)).toBeGreaterThan(30);
    }
  });
});

describe('applyStageLook', () => {
  it('paints printed parts clay and motors grey, all casting shadows, and maps each motor to its joint', () => {
    const robot = createProceduralArm();
    const motors = applyStageLook(robot, 'fallback');
    const meshes: Mesh[] = [];
    robot.traverse((object) => {
      if ((object as Mesh).isMesh) meshes.push(object as Mesh);
    });
    expect(meshes.length).toBeGreaterThan(3);
    for (const mesh of meshes) {
      expect([PLAYGROUND_MATERIALS.clay, PLAYGROUND_MATERIALS.dark]).toContain(mesh.material);
      expect(mesh.castShadow).toBe(true);
      expect(mesh.receiveShadow).toBe(true);
    }
    expect(Object.keys(motors).sort()).toEqual(['elbow_flex', 'shoulder_lift', 'shoulder_pan']);
    for (const list of Object.values(motors)) {
      for (const mesh of list) expect(mesh.material).toBe(PLAYGROUND_MATERIALS.dark);
    }
    expect(meshes.some((mesh) => mesh.material === PLAYGROUND_MATERIALS.clay)).toBe(true);
  });
});
