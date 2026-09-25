import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { build, type Kind } from './objects';
import { onTick } from '../loop';
import type { Env } from '../env';

export type SceneHandle = { pause: () => void; resume: () => void; dispose: () => void };

type Opts = { kind: Kind | 'model'; color?: string; material?: string; src?: string; env: Env };

async function loadModel(src: string) {
  if (!/^(\/|https:\/\/)[\w./%-]+\.glb(\?[\w=&-]*)?$/i.test(src)) throw new Error('Model address must be a .glb file');
  const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
  const gltf = await new GLTFLoader().loadAsync(src);
  const obj = gltf.scene;
  const box = new THREE.Box3().setFromObject(obj);
  const size = box.getSize(new THREE.Vector3()).length() || 1;
  const center = box.getCenter(new THREE.Vector3());
  obj.position.sub(center);
  const wrap = new THREE.Group();
  wrap.add(obj);
  wrap.scale.setScalar(2.6 / size);
  return wrap;
}

export async function createScene(host: HTMLElement, o: Opts): Promise<SceneHandle> {
  const lite = o.env.tier === 'lite';
  const renderer = new THREE.WebGLRenderer({ antialias: !lite, alpha: true, powerPreference: lite ? 'low-power' : 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, lite ? 1.25 : 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  const canvas = renderer.domElement;
  canvas.className = 'sf-3d-canvas';
  canvas.setAttribute('aria-hidden', 'true');

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = envTex;
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 50);
  camera.position.set(0, 0, 6);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x222244, 0.6));
  const key = new THREE.DirectionalLight(0xffffff, 1.4);
  key.position.set(3, 4, 5);
  scene.add(key);

  const color = new THREE.Color(o.color && /^#[0-9a-f]{3,6}$/i.test(o.color) ? o.color : '#f5a524');
  let root: THREE.Object3D;
  let update: ((t: number) => void) | undefined;
  let disposeObj = () => {};
  if (o.kind === 'model') {
    root = await loadModel(o.src ?? '');
  } else {
    const b = build(o.kind, color, o.material, lite);
    root = b.object; update = b.update; disposeObj = b.dispose;
  }
  const pivot = new THREE.Group();
  pivot.add(root);
  scene.add(pivot);
  host.append(canvas);

  const resize = () => {
    const w = host.clientWidth || 1, h = host.clientHeight || 1;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  const ro = new ResizeObserver(resize);
  ro.observe(host);
  resize();

  let tx = 0, ty = 0, rx = 0, ry = 0;
  const move = (e: PointerEvent) => {
    tx = (e.clientX / window.innerWidth - 0.5) * 0.8;
    ty = (e.clientY / window.innerHeight - 0.5) * 0.5;
  };
  if (o.env.finePointer) window.addEventListener('pointermove', move, { passive: true });

  let stopTick: (() => void) | null = null;
  let frames = 0;
  const tick = (t: number) => {
    rx += (ty - rx) * 0.05;
    ry += (tx - ry) * 0.05;
    pivot.rotation.x = rx;
    pivot.rotation.y = ry + t * 0.00025;
    update?.(t);
    renderer.render(scene, camera);
    host.dataset.sfFrames = String(++frames);
  };
  const resume = () => { stopTick ??= onTick(tick); };
  const pause = () => { stopTick?.(); stopTick = null; };
  resume();
  return {
    pause,
    resume,
    dispose() {
      pause();
      ro.disconnect();
      window.removeEventListener('pointermove', move);
      disposeObj();
      envTex.dispose();
      pmrem.dispose();
      renderer.dispose();
      canvas.remove();
    },
  };
}
