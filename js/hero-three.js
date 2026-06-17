// Home hero background — a gentle 3D rain of glossy candies and swirl lollipops,
// rendered with three.js behind the hero text. Transparent canvas so the page's
// light gradient + overlay veil show through. Loops forever, pauses when the tab
// is hidden or the hero scrolls out of view, and respects reduced-motion.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const canvas = document.getElementById('candy-canvas');
if (canvas && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  start();
}

function start() {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  } catch (e) {
    return; // no WebGL — the CSS gradient stays as the backdrop
  }
  const host = canvas.parentElement;
  const sizeOf = () => ({ w: host.clientWidth, h: host.clientHeight });

  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
  camera.position.set(0, 0, 9);

  // soft studio reflections so the candies look wet/glossy
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

  scene.add(new THREE.HemisphereLight(0xffffff, 0xdfeaff, 1.1));
  const key = new THREE.DirectionalLight(0xffffff, 1.4);
  key.position.set(4, 6, 6);
  scene.add(key);

  // vibrant confectionery palette
  const PALETTE = [0xee2244, 0xff7a2a, 0xffc41e, 0x28b463, 0x12b5d6,
                   0x8b5cf6, 0xff5ca0, 0xff5454].map(c => new THREE.Color(c));

  const sphereGeo = new THREE.SphereGeometry(0.5, 28, 28);
  const coneGeo = new THREE.ConeGeometry(0.34, 0.5, 18);
  const stickGeo = new THREE.CylinderGeometry(0.05, 0.05, 1.5, 12);
  const stickMat = new THREE.MeshPhysicalMaterial({ color: 0xf3ede0, roughness: 0.6, metalness: 0 });

  const candyMat = (color) => new THREE.MeshPhysicalMaterial({
    color, roughness: 0.18, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.12,
    sheen: 0.4, sheenColor: new THREE.Color(0xffffff),
  });

  function makeHardCandy(color) {
    return new THREE.Mesh(sphereGeo, candyMat(color));
  }
  function makeWrapped(color) {
    const g = new THREE.Group();
    const mat = candyMat(color);
    const body = new THREE.Mesh(sphereGeo, mat);
    body.scale.set(1.15, 0.78, 0.78);
    g.add(body);
    [-1, 1].forEach(s => {
      const end = new THREE.Mesh(coneGeo, mat);
      end.position.x = s * 0.62;
      end.rotation.z = s * Math.PI / 2;
      g.add(end);
    });
    return g;
  }
  function makeLollipop(color) {
    const g = new THREE.Group();
    const head = new THREE.Mesh(sphereGeo, candyMat(color));
    g.add(head);
    const stick = new THREE.Mesh(stickGeo, stickMat);
    stick.position.y = -1.15;
    g.add(stick);
    return g;
  }

  const TOP = 8, BOTTOM = -8, SPAN = TOP - BOTTOM;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const COUNT = Math.max(16, Math.min(46, Math.round((sizeOf().w || 1200) / 30)));
  const items = [];
  const rnd = (a, b) => a + Math.random() * (b - a);

  for (let i = 0; i < COUNT; i++) {
    const color = PALETTE[(Math.random() * PALETTE.length) | 0];
    const kind = Math.random();
    const obj = kind < 0.5 ? makeHardCandy(color) : kind < 0.8 ? makeWrapped(color) : makeLollipop(color);
    const s = rnd(0.45, 1.0);
    obj.scale.multiplyScalar(s);
    obj.position.set(rnd(-9, 9), rnd(BOTTOM, TOP), rnd(-3, 2.5));
    obj.rotation.set(rnd(0, 6.28), rnd(0, 6.28), rnd(0, 6.28));
    obj.userData = {
      vy: rnd(0.5, 1.4) * (0.4 + s),               // bigger = a touch faster (nearer)
      rx: rnd(-0.6, 0.6), ry: rnd(-0.6, 0.6),
      swayA: rnd(0.1, 0.5), swayF: rnd(0.2, 0.6), swayP: rnd(0, 6.28),
      baseX: obj.position.x,
    };
    scene.add(obj);
    items.push(obj);
  }

  function resize() {
    const { w, h } = sizeOf();
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  resize();
  window.addEventListener('resize', resize);

  const clock = new THREE.Clock();
  let running = false, frame = 0;

  function tick() {
    if (!running) return;
    frame = requestAnimationFrame(tick);
    const dt = Math.min(clock.getDelta(), 0.05);
    const t = clock.elapsedTime;
    for (const o of items) {
      const u = o.userData;
      o.position.y -= u.vy * dt * (reduced ? 0.15 : 1);
      o.position.x = u.baseX + Math.sin(t * u.swayF + u.swayP) * u.swayA;
      o.rotation.x += u.rx * dt;
      o.rotation.y += u.ry * dt;
      if (o.position.y < BOTTOM) {
        o.position.y += SPAN;
        u.baseX = rnd(-9, 9);
      }
    }
    renderer.render(scene, camera);
  }
  function play() { if (!running) { running = true; clock.getDelta(); frame = requestAnimationFrame(tick); } }
  function stop() { running = false; cancelAnimationFrame(frame); }

  document.addEventListener('visibilitychange', () => document.hidden ? stop() : play());
  // only animate while the hero is on screen
  const io = new IntersectionObserver(
    ([e]) => (e.isIntersecting ? play() : stop()),
    { threshold: 0 }
  );
  io.observe(host);
  play();
}
