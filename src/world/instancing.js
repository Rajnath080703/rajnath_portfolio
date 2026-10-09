/**
 * Turn a template Group (built from ordinary meshes) into one InstancedMesh per
 * material — so 100 students cost 3 draw calls instead of 1,000.
 */
import { Group, InstancedMesh, Matrix4, Color } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export function mergeByMaterial(template) {
  template.updateMatrixWorld(true);
  const buckets = new Map();
  template.traverse((o) => {
    if (!o.isMesh) return;
    const g = o.geometry.clone();
    g.applyMatrix4(o.matrixWorld);
    // keep only the common attributes so merges never fail
    for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k);
    if (g.index) {
      const ng = g.toNonIndexed();
      g.dispose();
      if (!buckets.has(o.material)) buckets.set(o.material, []);
      buckets.get(o.material).push(ng);
    } else {
      if (!buckets.has(o.material)) buckets.set(o.material, []);
      buckets.get(o.material).push(g);
    }
  });
  return [...buckets.entries()].map(([material, geos]) => ({ material, geometry: mergeGeometries(geos) }));
}

/**
 * @param template Group
 * @param matrices Matrix4[]
 * @param tint optional (material, index) => Color|null for per-instance colour
 */
export function instanceTemplate(template, matrices, tint) {
  const out = new Group();
  for (const { material, geometry } of mergeByMaterial(template)) {
    const im = new InstancedMesh(geometry, material, matrices.length);
    matrices.forEach((m, i) => {
      im.setMatrixAt(i, m);
      if (tint) {
        const c = tint(material, i);
        if (c) im.setColorAt(i, c);
      }
    });
    im.instanceMatrix.needsUpdate = true;
    if (im.instanceColor) im.instanceColor.needsUpdate = true;
    out.add(im);
  }
  return out;
}

export const m4 = () => new Matrix4();
export { Color };
