import type { LoadingManager, Material, Object3D } from 'three';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

/** Signature matches urdf-loader's MeshLoadFunc. */
export interface GlbMeshLoader {
  (
    url: string,
    manager: LoadingManager,
    material: Material,
    onComplete: (mesh: Object3D, err?: Error) => void,
  ): void;
}

/**
 * Mesh loader for URDF visual/collision nodes whose GLB meshes are
 * Draco-compressed. The decoder is self-hosted at /draco/ (copied from
 * three/examples/jsm/libs/draco) so the site stays fully static and offline
 * capable.
 *
 * Mesh errors are reported through onMeshError and deliberately NOT passed to
 * urdf-loader's onComplete: the library would console.error them, and the
 * caller swaps the whole model for the procedural fallback instead.
 */
export function createGlbMeshLoader(onMeshError: () => void): GlbMeshLoader {
  const draco = new DRACOLoader();
  draco.setDecoderPath('/draco/');

  return (url, manager, _material, onComplete) => {
    const gltf = new GLTFLoader(manager);
    gltf.setDRACOLoader(draco);
    gltf.load(
      url,
      (result) => onComplete(result.scene),
      undefined,
      () => {
        onMeshError();
        // urdf-loader's types declare a non-null mesh but its runtime checks
        // for null; a null here means "skip this visual", which is fine
        // because the caller replaces the robot on any mesh failure.
        onComplete(null as unknown as Object3D);
      },
    );
  };
}
