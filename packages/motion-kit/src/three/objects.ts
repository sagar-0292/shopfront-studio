import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

export type Kind = 'ring' | 'gem' | 'knot' | 'blob' | 'cup' | 'orbit' | 'stack';
export type Built = { object: THREE.Object3D; update?: (t: number) => void; dispose: () => void };

export function material(kind: string | undefined, color: THREE.Color): THREE.Material {
  switch (kind) {
    case 'glass':
      return new THREE.MeshPhysicalMaterial({ color, metalness: 0, roughness: 0.05, transmission: 0.9, thickness: 0.6, ior: 1.5, clearcoat: 1 });
    case 'matte':
      return new THREE.MeshStandardMaterial({ color, metalness: 0, roughness: 0.85 });
    case 'ceramic':
      return new THREE.MeshPhysicalMaterial({ color, metalness: 0, roughness: 0.35, clearcoat: 0.6 });
    default:
      return new THREE.MeshStandardMaterial({ color, metalness: 1, roughness: 0.22 });
  }
}

const disposeAll = (o: THREE.Object3D) => () =>
  o.traverse((c) => {
    const m = c as THREE.Mesh;
    m.geometry?.dispose();
    const mat = m.material as THREE.Material | THREE.Material[] | undefined;
    (Array.isArray(mat) ? mat : mat ? [mat] : []).forEach((x) => x.dispose());
  });

export function build(kind: Kind, color: THREE.Color, mat: string | undefined, lite: boolean): Built {
  const seg = lite ? 0.5 : 1;
  const group = new THREE.Group();
  let update: Built['update'];
  switch (kind) {
    case 'ring': {
      const m = new THREE.Mesh(new THREE.TorusGeometry(1, 0.3, 32 * seg, 96 * seg), material(mat, color));
      m.rotation.x = 0.9;
      group.add(m);
      break;
    }
    case 'gem': {
      const g = new THREE.IcosahedronGeometry(1.15, 0);
      const m = new THREE.Mesh(g, mat ? material(mat, color) : new THREE.MeshPhysicalMaterial({ color, metalness: 0.15, roughness: 0.04, clearcoat: 1, iridescence: 0.6, flatShading: true }));
      group.add(m);
      break;
    }
    case 'knot': {
      group.add(new THREE.Mesh(new THREE.TorusKnotGeometry(0.78, 0.25, 180 * seg, 24 * seg), material(mat, color)));
      break;
    }
    case 'blob': {
      const g = new THREE.IcosahedronGeometry(1.1, lite ? 10 : 22);
      const base = (g.attributes.position.array as Float32Array).slice();
      const pos = g.attributes.position as THREE.BufferAttribute;
      const m = new THREE.Mesh(g, mat ? material(mat, color) : new THREE.MeshPhysicalMaterial({ color, roughness: 0.25, metalness: 0.1, clearcoat: 1 }));
      group.add(m);
      update = (t) => {
        const s = t * 0.0006;
        for (let i = 0; i < pos.count; i++) {
          const x = base[i * 3], y = base[i * 3 + 1], z = base[i * 3 + 2];
          const n = 1 + 0.12 * Math.sin(x * 2.1 + s) * Math.cos(y * 1.7 + s * 1.3) + 0.06 * Math.sin(z * 3.1 + s * 0.7);
          pos.setXYZ(i, x * n, y * n, z * n);
        }
        pos.needsUpdate = true;
        g.computeVertexNormals();
      };
      break;
    }
    case 'cup': {
      const pts = [
        [0, -0.8], [0.62, -0.8], [0.68, -0.72], [0.8, 0.55], [0.84, 0.72], [0.78, 0.74], [0.72, 0.58], [0.6, -0.68], [0, -0.68],
      ].map(([x, y]) => new THREE.Vector2(x, y));
      const mm = material(mat ?? 'ceramic', color);
      const body = new THREE.Mesh(new THREE.LatheGeometry(pts, 64 * seg), mm);
      const handle = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.07, 16, 32, Math.PI * 1.2), mm);
      handle.position.set(0.86, 0.05, 0);
      handle.rotation.z = -Math.PI * 0.6;
      const saucer = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 0.9, 0.08, 64 * seg), mm);
      saucer.position.y = -0.86;
      group.add(body, handle, saucer);
      group.rotation.x = 0.25;
      break;
    }
    case 'orbit': {
      const core = new THREE.Mesh(new THREE.SphereGeometry(0.55, 48 * seg, 48 * seg), material(mat, color));
      group.add(core);
      const rings: THREE.Group[] = [];
      [1.1, 1.5, 1.9].forEach((r, i) => {
        const ring = new THREE.Group();
        ring.add(new THREE.Mesh(new THREE.TorusGeometry(r, 0.006, 6, 128), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.35 })));
        const count = 3 + i * 2;
        const moon = new THREE.InstancedMesh(new THREE.SphereGeometry(0.07 + i * 0.015, 16, 16), material(mat, color), count);
        const mx = new THREE.Matrix4();
        for (let k = 0; k < count; k++) {
          const a = (k / count) * Math.PI * 2;
          moon.setMatrixAt(k, mx.makeTranslation(Math.cos(a) * r, Math.sin(a) * r, 0));
        }
        ring.add(moon);
        ring.rotation.set(1.2 + i * 0.35, i * 0.6, 0);
        rings.push(ring);
        group.add(ring);
      });
      update = (t) => rings.forEach((r, i) => (r.rotation.z = t * 0.0003 * (i % 2 ? -1 : 1) * (1 + i * 0.4)));
      break;
    }
    case 'stack': {
      const shades = [0, 0.12, 0.24, 0.36];
      const boxes = shades.map((d, i) => {
        const c = color.clone().offsetHSL(0, 0, -d * 0.6);
        const b = new THREE.Mesh(new RoundedBoxGeometry(1.5 - i * 0.18, 0.28, 1.5 - i * 0.18, 4, 0.08), material(mat ?? 'ceramic', c));
        b.position.y = -0.55 + i * 0.36;
        b.rotation.y = i * 0.3;
        group.add(b);
        return b;
      });
      update = (t) => boxes.forEach((b, i) => { b.position.y = -0.55 + i * 0.36 + Math.sin(t * 0.0015 + i) * 0.035 * i; b.rotation.y = i * 0.3 + Math.sin(t * 0.0005) * 0.15 * i; });
      break;
    }
  }
  return { object: group, update, dispose: disposeAll(group) };
}
