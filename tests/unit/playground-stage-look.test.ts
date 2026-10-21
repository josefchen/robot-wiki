import { readFileSync } from 'node:fs';
import { Mesh, PerspectiveCamera, SRGBColorSpace, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { applyStageLook } from '@/components/three/load-robot';
import { createProceduralArm } from '@/components/three/procedural-arm';
import { HOME_VIEW, fitHome, framePoints, homeBand, inView, type HomeView } from '@/components/three/robot-scene';
import {
  CLAY_MIX,
  FLOOR_MIX,
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

  it('draws the table one tone step off the page paper, its rings toward graphite', () => {
    close(
      PLAYGROUND_COLORS.floor,
      mixSrgb(hex('--color-paper'), hex('--color-concrete'), FLOOR_MIX.concreteInFloor),
    );
    close(
      PLAYGROUND_COLORS.floorRing,
      mixSrgb(hex('--color-paper'), hex('--color-graphite'), FLOOR_MIX.graphiteInRing),
    );
    // A quiet step: lighter than the clay, so the arm stands off the table,
    // and darker than the paper, so the table reads as a place.
    const lum = ([r, g, b]: readonly number[]) => 0.2126 * r + 0.7152 * g + 0.0722 * b;
    expect(lum(PLAYGROUND_COLORS.floor)).toBeLessThan(lum(PLAYGROUND_COLORS.paper));
    expect(lum(PLAYGROUND_COLORS.floor)).toBeGreaterThan(lum(PLAYGROUND_COLORS.clay));
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

describe('the home view keeps the arm clear of the hint line', () => {
  /** The fitted arm's projected box, as shares of the stage from its top (0) to its bottom (1). */
  function fitted(aspect: number, heightPx: number) {
    const points = framePoints(createProceduralArm());
    const home = fitHome(points, aspect, heightPx);
    const lens = new PerspectiveCamera(stageFov(aspect), aspect, 0.01, 50);
    lens.position.copy(home.position);
    lens.lookAt(home.target);
    lens.updateMatrixWorld();
    let top = Infinity;
    let bottom = -Infinity;
    const v = new Vector3();
    for (const p of points) {
      v.copy(p).project(lens);
      top = Math.min(top, (1 - v.y) / 2);
      bottom = Math.max(bottom, (1 - v.y) / 2);
    }
    return { top, bottom, fill: bottom - top };
  }

  it('keeps the centred 70 % band on a tall stage', () => {
    expect(homeBand(560)).toEqual({ top: HOME_VIEW.heightFill, bottom: -HOME_VIEW.heightFill });
    expect(homeBand(0)).toEqual({ top: HOME_VIEW.heightFill, bottom: -HOME_VIEW.heightFill });
    const desk = fitted(1.6, 560);
    expect(desk.fill).toBeGreaterThan(HOME_VIEW.heightFill - 0.02);
    expect(desk.fill).toBeLessThanOrEqual(HOME_VIEW.heightFill + 0.001);
    expect((desk.top + desk.bottom) / 2).toBeCloseTo(0.5, 2);
  });

  it('on a phone stage puts the arm about 20 px under the hint\'s words and keeps it at least 65 % of the height', () => {
    // The hint line's box, from playground.css: 1 px rule, 12 px down, one 13 px line at 1.5, 2 px padding.
    const css = readFileSync('components/three/playground.css', 'utf8');
    const hint = css.match(/\.playground \.pg-hint \{([^}]*)\}/)?.[1] ?? '';
    expect(hint).toMatch(/top: 12px;/);
    expect(hint).toMatch(/padding: 2px 6px 2px 0;/);
    expect(hint).toMatch(/font-size: 13px;/);
    // Clear of the whole box, with room under it.
    expect(HOME_VIEW.topClearPx).toBeGreaterThanOrEqual(Math.ceil(1 + 12 + 2 + 13 * 1.5 + 2) + 14);
    // 390 and 360 px phones: a 3:2 stage 228 and 208 px tall.
    for (const [width, height] of [[342, 228], [312, 208]]) {
      const arm = fitted(width / height, height);
      expect(arm.top * height).toBeGreaterThanOrEqual(HOME_VIEW.topClearPx - 0.5);
      expect(arm.fill).toBeGreaterThanOrEqual(0.65);
      expect(arm.bottom).toBeLessThan(1);
    }
  });
});

describe('a reach the home view cannot show is brought into view', () => {
  function lensAt(view: HomeView, aspect: number) {
    const lens = new PerspectiveCamera(stageFov(aspect), aspect, 0.01, 50);
    lens.position.copy(view.position);
    lens.lookAt(view.target);
    lens.updateMatrixWorld();
    return lens;
  }

  // Desk and phone stages: 16:10 beside the deck, 3:2 on a 390 px phone.
  const STAGES = [[736, 460], [342, 228]] as const;

  it('refits along the same direction until the arm, the target and the floor under it are all in view', () => {
    const arm = framePoints(createProceduralArm());
    for (const [width, height] of STAGES) {
      const aspect = width / height;
      const home = fitHome(arm, aspect, height);
      expect(inView(arm, lensAt(home, aspect), height)).toBe(true);
      // 60 cm forward and 50 cm up (scene y is up), and the ring on the floor under it.
      const reach = [...arm, new Vector3(0.6, 0.5, 0), new Vector3(0.6, 0, 0)];
      expect(inView(reach, lensAt(home, aspect), height)).toBe(false);

      const from = home.position.clone().sub(home.target);
      const view = fitHome(reach, aspect, height, from);
      expect(inView(reach, lensAt(view, aspect), height)).toBe(true);
      const along = view.position.clone().sub(view.target);
      expect(along.clone().normalize().distanceTo(from.clone().normalize())).toBeLessThan(1e-9);
      expect(along.length()).toBeGreaterThan(from.length());
    }
  });

  it('counts the hint line\'s strip, the frame\'s edges and the space behind the camera as out of view', () => {
    const arm = framePoints(createProceduralArm());
    for (const [width, height] of STAGES) {
      const aspect = width / height;
      const lens = lensAt(fitHome(arm, aspect, height), aspect);
      const at = (x: number, y: number) => new Vector3(x, y, 0.5).unproject(lens);
      const clearTop = 1 - (2 * HOME_VIEW.topClearPx) / height;
      expect(inView([at(0, clearTop - 0.01)], lens, height)).toBe(true);
      expect(inView([at(0, clearTop + 0.01)], lens, height)).toBe(false);
      expect(inView([at(0.9, 0)], lens, height)).toBe(true);
      expect(inView([at(1.02, 0)], lens, height)).toBe(false);
      expect(inView([at(0, -1.02)], lens, height)).toBe(false);
      const behind = lens.position.clone().add(lens.position.clone().sub(fitHome(arm, aspect, height).target));
      expect(inView([behind], lens, height)).toBe(false);
    }
  });
});
