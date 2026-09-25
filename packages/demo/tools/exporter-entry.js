import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
// A brass diya (oil lamp) with a flame, as a sample client 3D model.
window.makeDiya = async () => {
  const g = new THREE.Group();
  const brass = new THREE.MeshStandardMaterial({ color: 0xc8962e, metalness: 1, roughness: 0.28 });
  const pts = [[0, -0.35], [0.55, -0.35], [0.8, -0.2], [0.95, 0.05], [0.9, 0.12], [0.7, 0], [0.3, -0.12], [0, -0.14]].map(([x, y]) => new THREE.Vector2(x, y));
  const bowl = new THREE.Mesh(new THREE.LatheGeometry(pts, 64), brass);
  const spout = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.6, 32), brass);
  spout.rotation.z = Math.PI / 2; spout.position.set(1.05, 0.02, 0);
  const flame = new THREE.Mesh(new THREE.SphereGeometry(0.14, 32, 16), new THREE.MeshStandardMaterial({ color: 0xffb020, emissive: 0xff7a00, emissiveIntensity: 2 }));
  flame.scale.set(1, 2.2, 1); flame.position.set(1.28, 0.3, 0);
  g.add(bowl, spout, flame);
  const buf = await new GLTFExporter().parseAsync(g, { binary: true });
  return Array.from(new Uint8Array(buf));
};
window.makeVideo = async (seconds = 4) => {
  const c = document.createElement('canvas'); c.width = 960; c.height = 540; document.body.append(c);
  const x = c.getContext('2d');
  const stream = c.captureStream(24);
  const rec = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp8', videoBitsPerSecond: 900_000 });
  const chunks = []; rec.ondataavailable = (e) => chunks.push(e.data);
  const start = performance.now();
  rec.start();
  await new Promise((done) => {
    const draw = () => {
      const t = (performance.now() - start) / 1000;
      const gr = x.createLinearGradient(0, 0, 960, 540);
      gr.addColorStop(0, '#1e1b4b'); gr.addColorStop(1, '#3b0764'); x.fillStyle = gr; x.fillRect(0, 0, 960, 540);
      for (let i = 0; i < 40; i++) {
        const px = (i * 97 + t * 40 * (1 + (i % 3))) % 1000 - 20, py = 540 - ((i * 53 + t * 60 * (1 + (i % 4) * 0.3)) % 600);
        x.fillStyle = `rgba(245,165,36,${0.25 + (i % 5) * 0.12})`; x.beginPath(); x.arc(px, py, 3 + (i % 6) * 2, 0, 7); x.fill();
      }
      if (t < seconds) requestAnimationFrame(draw); else { rec.stop(); }
    };
    rec.onstop = done; draw();
  });
  const blob = new Blob(chunks, { type: 'video/webm' });
  return Array.from(new Uint8Array(await blob.arrayBuffer()));
};
