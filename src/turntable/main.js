// Turntable: the Pair Production sneakers in 3D. The design arrives in the address as a Wavefunction
// (turntable.html#QX1...), the same code the Atelier opens, and is collapsed here exactly as the showcase did it,
// so the pair on the platter is the pair the visitor painted. Without a code it shows the visitor's own world.
//
// The shoe is a 3D model generated from the showcase's own photo (scripts/pair_model.py stands it exactly where the
// photo's shoe stands). The panel colors are painted onto a flat map of the side view (the photo's nine panel
// outlines), projected through the shoe from the side and multiplied over its white leather, as the showcase does
// in 2D. The lining and the insole stay white.

import {
  WebGLRenderer, Scene, PerspectiveCamera, Group, Mesh, MeshStandardMaterial, MeshBasicMaterial, CanvasTexture,
  SRGBColorSpace, NeutralToneMapping, PMREMGenerator, DirectionalLight, CylinderGeometry, PlaneGeometry, Vector2, Vector3,
  Raycaster, Spherical, Timer,
} from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { decodeProject, encodeProject, sanitizeProject, paletteOf, oklch } from '../engine/index.js';
import { collapse } from '../runtime/qontext-runtime.js';
import { PANELS, PHOTO, pairOf } from '../site/pair-shape.js';
import { paletteFor, initialSeed } from '../site/world.js';
import { fmtInt, reduced } from '../site/lib.js';

const $ = (id) => document.getElementById(id);
const W = PHOTO.width;
const H = PHOTO.height;
const MODEL = 'pair-shoe.glb';
const GAP = 0.2; // half the distance between the two feet, in shoe lengths
const TARGET = new Vector3(0, 0.14, 0);
const HOME = { pair: new Spherical(2.1, 1.1, 0.95), left: new Spherical(1.5, 1.15, 0.95), right: new Spherical(1.5, 1.15, 0.95) };
const PATHS = PANELS.map((p) => ({ ...p, path: new Path2D(p.d) }));

/**
 * Where the shoe stands in the photo: heel x, sole y and length, in photo pixels. scripts/pair_model.py stood the
 * 3D shoe in the same frame, so model (x, y) is photo (x0 + x * L, yBottom - y * L).
 */
const FRAME = (() => {
  const n = PHOTO.silhouette.match(/\d+(\.\d+)?/g).map(Number);
  const xs = n.filter((_, i) => i % 2 === 0);
  const ys = n.filter((_, i) => i % 2 === 1);
  return { x0: Math.min(...xs), yBottom: Math.max(...ys), L: Math.max(...xs) - Math.min(...xs) };
})();

const stage = $('ttStage');
const view = $('ttView');
const state = { show: 'pair', spin: !reduced(), pair: null };
const feet = { left: null, right: null };

/** The design in the address, or the visitor's own world when there is none (or it cannot be read). */
function readDesign() {
  const raw = location.hash.slice(1);
  let code = raw;
  try {
    code = decodeURIComponent(raw);
  } catch {
    // Broken percent-encoding (a link cut short): decodeProject rejects it below, with the notice.
  }
  code = code.trim();
  let notice = '';
  if (code) {
    try {
      return { project: decodeProject(code), notice };
    } catch {
      notice = 'That link does not hold a pair, so here is your own world instead.';
    }
  }
  const seed = initialSeed();
  const project = sanitizeProject({ name: `Pair, world ${fmtInt(seed)}`, ...paletteFor(seed), state: 'random', stateSeed: 7, measureSeed: seed });
  return { project, notice };
}

/**
 * The side view with each panel filled in its color and white everywhere else: what gets projected onto the shoe.
 * Outside the photo's outline each panel spreads a little further, because the model's laces and tongue stand a
 * few pixels proud of it.
 */
const OUTSIDE = new Path2D();
OUTSIDE.rect(-W, -H, 3 * W, 3 * H);
OUTSIDE.addPath(new Path2D(PHOTO.silhouette));
function paintSide(colors, canvas = document.createElement('canvas')) {
  canvas.width = 2048;
  canvas.height = Math.round((2048 * H) / W);
  const g = canvas.getContext('2d');
  g.setTransform(canvas.width / W, 0, 0, canvas.height / H, 0, 0);
  g.fillStyle = '#ffffff';
  g.fillRect(0, 0, W, H);
  g.save();
  g.clip(OUTSIDE, 'evenodd');
  g.lineWidth = 48;
  g.lineJoin = 'round';
  for (const p of PATHS) {
    g.strokeStyle = colors.get(p.id);
    g.stroke(p.path);
  }
  g.restore();
  for (const p of PATHS) {
    g.fillStyle = colors.get(p.id);
    g.fill(p.path);
  }
  return canvas;
}

/** The panel under a point of the side view (photo pixels), or null. */
const probe = document.createElement('canvas').getContext('2d');
const panelAt = (x, y) => PATHS.find((p) => probe.isPointInPath(p.path, x, y)) || null;

function renderText(project, pair, notice) {
  const n = pair.differ.length;
  $('ttLead').textContent = `${project.name}, as painted in Pair Production. The left foot reads the grid by its rows and the right foot by its columns, so ${n === 1 ? 'one panel' : `${n} panels`} can never match.`;
  $('ttNotice').hidden = !notice;
  $('ttNotice').textContent = notice;
  const code = encodeProject(project);
  $('ttAtelier').href = `studio.html#${code}`;
  const rows = PANELS.map((p) => {
    const tr = document.createElement('tr');
    tr.dataset.panel = p.id;
    const th = document.createElement('th');
    th.scope = 'row';
    th.textContent = p.name;
    if (pair.differ.includes(p.id)) {
      tr.dataset.differ = '';
      const note = document.createElement('span');
      note.className = 'differ';
      note.textContent = ' (the feet differ)';
      th.append(note);
    }
    tr.append(th);
    for (const side of ['left', 'right']) {
      const hex = pair[side].get(p.id);
      const td = document.createElement('td');
      td.className = 'hex';
      td.dataset.hex = hex;
      td.style.setProperty('--c', hex);
      td.textContent = hex;
      tr.append(td);
    }
    return tr;
  });
  $('ttPanels').tBodies[0].replaceChildren(...rows);
  view.setAttribute('aria-label', `Your pair in 3D: ${project.name}. ${n === 1 ? 'One panel differs' : `${n} panels differ`} between the feet.`);
}

function band(project) {
  const hue = project.base;
  stage.style.setProperty('--band', oklch(0.2, 0.03, hue).hex);
  stage.style.setProperty('--glass', oklch(0.27, 0.036, hue).hex);
  return oklch(0.26, 0.035, hue).hex;
}

/**
 * The model's leather with the side-view paint projected through it (photo pixel = frame offset + model (x, y) *
 * frame scale), multiplied in where the model's _PAINT attribute says the surface is the outside.
 */
function paintedLeather(leather, paint) {
  const m = leather.clone();
  m.onBeforeCompile = (s) => {
    s.uniforms.paint = { value: paint };
    s.uniforms.paintOffset = { value: new Vector2(FRAME.x0 / W, 1 - FRAME.yBottom / H) };
    s.uniforms.paintScale = { value: new Vector2(FRAME.L / W, FRAME.L / H) };
    s.vertexShader = `attribute float _paint;\nuniform vec2 paintOffset;\nuniform vec2 paintScale;\nvarying vec2 vPaint;\nvarying float vPaintMix;\n${s.vertexShader}`.replace(
      '#include <begin_vertex>',
      '#include <begin_vertex>\n  vPaint = paintOffset + transformed.xy * paintScale;\n  vPaintMix = _paint;',
    );
    s.fragmentShader = `uniform sampler2D paint;\nvarying vec2 vPaint;\nvarying float vPaintMix;\n${s.fragmentShader}`.replace(
      '#include <map_fragment>',
      '#include <map_fragment>\n  diffuseColor.rgb *= mix(vec3(1.0), texture2D(paint, vPaint).rgb, vPaintMix);',
    );
  };
  return m;
}

function shadowTexture() {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 64;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(128, 32, 4, 128, 32, 128);
  grad.addColorStop(0, 'rgba(0,0,0,0.55)');
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  g.setTransform(1, 0, 0, 0.25, 0, 24);
  g.fillStyle = grad;
  g.fillRect(0, -96, 256, 256);
  return new CanvasTexture(c);
}

function loadPhoto() {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('The shoe photo did not load.'));
    img.src = PHOTO.src;
  });
}

/** The model's mesh, with the loading progress shown as it arrives. */
function loadModel() {
  return new Promise((resolve, reject) => {
    const loading = $('ttLoading');
    new GLTFLoader().load(
      MODEL,
      (gltf) => resolve(gltf.scene.getObjectByProperty('isMesh', true)),
      (e) => {
        if (e.total) loading.textContent = `Bringing the pair out, ${Math.round((100 * e.loaded) / e.total)}%`;
      },
      () => reject(new Error('The 3D model did not load.')),
    );
  });
}

/** When WebGL is missing or the model does not load: the pair side on, painted in 2D. */
async function flat(pair, why) {
  const photo = await loadPhoto();
  stage.classList.add('flat');
  const side = (colors, mirror) => {
    const c = document.createElement('canvas');
    c.width = W;
    c.height = H;
    const g = c.getContext('2d');
    if (mirror) g.setTransform(-1, 0, 0, 1, W, 0);
    g.drawImage(photo, 0, 0);
    g.globalCompositeOperation = 'multiply';
    for (const p of PATHS) {
      g.fillStyle = colors.get(p.id);
      g.fill(p.path);
    }
    g.globalCompositeOperation = 'destination-in';
    g.fill(new Path2D(PHOTO.silhouette));
    c.setAttribute('role', 'img');
    c.setAttribute('aria-label', mirror ? 'Left foot, side on' : 'Right foot, side on');
    return c;
  };
  $('ttLoading').hidden = false;
  $('ttLoading').textContent = `${why} Here is your pair side on.`;
  view.removeAttribute('role');
  view.removeAttribute('aria-roledescription');
  view.removeAttribute('tabindex');
  view.append(side(pair.left, true), side(pair.right, false));
  stage.dataset.ready = 'flat';
}

async function start() {
  let { project, notice } = readDesign();
  state.pair = pairOf(paletteOf(project), collapse({ ...project, seed: project.measureSeed }).outcomes);
  renderText(project, state.pair, notice);
  let platterColor = band(project);

  let renderer;
  let model;
  try {
    renderer = new WebGLRenderer({ antialias: true, alpha: true });
  } catch {
    await flat(state.pair, 'This browser cannot draw in 3D.');
    return;
  }
  try {
    model = await loadModel();
  } catch (e) {
    renderer.dispose();
    await flat(state.pair, e.message);
    return;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = NeutralToneMapping;
  const canvas = renderer.domElement;
  canvas.setAttribute('aria-hidden', 'true');
  view.append(canvas);

  const scene = new Scene();
  const pmrem = new PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.85;
  const key = new DirectionalLight(0xffffff, 1.1);
  key.position.set(1.5, 3, 2);
  scene.add(key);

  const camera = new PerspectiveCamera(30, 1, 0.05, 30);
  const controls = new OrbitControls(camera, canvas);
  controls.target.copy(TARGET);
  controls.enablePan = false;
  controls.enableDamping = !reduced();
  controls.minDistance = 0.8;
  controls.maxDistance = 4.5;
  controls.maxPolarAngle = Math.PI * 0.49;

  for (const t of ['map', 'normalMap', 'roughnessMap']) if (model.material[t]) model.material[t].anisotropy = 8;
  const platter = new Group();
  scene.add(platter);
  const disc = new Mesh(new CylinderGeometry(0.72, 0.72, 0.03, 96), new MeshStandardMaterial({ color: platterColor, roughness: 0.85 }));
  disc.position.y = -0.015;
  platter.add(disc);
  const shadow = shadowTexture();
  for (const side of ['left', 'right']) {
    const canvasPaint = paintSide(state.pair[side]);
    const paint = new CanvasTexture(canvasPaint);
    paint.colorSpace = SRGBColorSpace;
    const mesh = new Mesh(model.geometry, paintedLeather(model.material, paint));
    mesh.position.set(-0.5, 0, 0);
    const foot = new Group();
    foot.add(mesh);
    const floor = new Mesh(new PlaneGeometry(1.15, 0.5), new MeshBasicMaterial({ map: shadow, transparent: true, depthWrite: false }));
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0.002;
    foot.add(floor);
    // The photo is a right shoe seen from its outer side; the left foot is its mirror image.
    if (side === 'left') foot.scale.z = -1;
    platter.add(foot);
    feet[side] = { foot, mesh, paint, canvasPaint };
  }

  const sph = new Spherical();
  const place = (s) => {
    camera.position.setFromSpherical(s).add(TARGET);
    controls.update();
  };
  const layout = () => {
    feet.left.foot.visible = state.show !== 'right';
    feet.right.foot.visible = state.show !== 'left';
    feet.left.foot.position.z = state.show === 'pair' ? -GAP : 0;
    feet.right.foot.position.z = state.show === 'pair' ? GAP : 0;
    stage.dataset.show = state.show;
    for (const b of stage.querySelectorAll('[data-show]')) if (b.tagName === 'BUTTON') b.setAttribute('aria-pressed', String(b.dataset.show === state.show));
  };

  const resize = () => {
    const { width, height } = view.getBoundingClientRect();
    renderer.setSize(width, height, false);
    camera.aspect = width / Math.max(height, 1);
    // Narrow screens see the pair from a little further back, so both toes stay in frame.
    camera.zoom = Math.min(1, camera.aspect / 0.95);
    camera.updateProjectionMatrix();
    wake();
  };

  // Frames are drawn only while something moves (a spin, a drag settling, a resize) and the pair is on screen.
  const timer = new Timer();
  let raf = 0;
  let idle = true;
  let onScreen = true;
  function tick(t) {
    raf = 0;
    timer.update(t);
    if (state.spin) platter.rotation.y += Math.min(timer.getDelta(), 0.1) * 0.32;
    const moving = controls.update();
    renderer.render(scene, camera);
    stage.dataset.ready = 'true';
    if (state.spin || moving) wake();
    else idle = true;
  }
  function wake() {
    if (raf) return;
    if (!onScreen) {
      idle = true;
      return;
    }
    if (idle) timer.reset();
    idle = false;
    raf = requestAnimationFrame(tick);
  }
  controls.addEventListener('change', wake);
  controls.addEventListener('start', () => setSpin(false));

  function setSpin(on) {
    state.spin = on;
    stage.dataset.spin = String(on);
    $('ttSpin').setAttribute('aria-pressed', String(on));
    wake();
  }
  function reset() {
    platter.rotation.y = 0;
    place(HOME[state.show]);
    wake();
  }

  // Keyboard: arrows turn the pair, plus and minus zoom.
  view.addEventListener('keydown', (e) => {
    const turns = { ArrowLeft: [-0.2, 0], ArrowRight: [0.2, 0], ArrowUp: [0, -0.12], ArrowDown: [0, 0.12] };
    const zooms = { '+': 0.85, '=': 0.85, '-': 1 / 0.85, _: 1 / 0.85 };
    if (!(e.key in turns) && !(e.key in zooms)) return;
    e.preventDefault();
    sph.setFromVector3(camera.position.clone().sub(controls.target));
    if (e.key in turns) {
      sph.theta += turns[e.key][0];
      sph.phi = Math.min(Math.max(sph.phi + turns[e.key][1], 0.15), controls.maxPolarAngle);
    } else {
      sph.radius = Math.min(Math.max(sph.radius * zooms[e.key], controls.minDistance), controls.maxDistance);
    }
    setSpin(false);
    place(sph);
    stage.dataset.azimuth = String(Math.round((sph.theta * 180) / Math.PI));
  });

  // Plain scrolling moves the page; Ctrl or Cmd with the wheel (and a trackpad pinch) zooms.
  view.addEventListener('wheel', (e) => { if (!e.ctrlKey && !e.metaKey) e.stopPropagation(); }, { capture: true });

  // Pointing at a panel reads it out, and marks its row in the table.
  const ray = new Raycaster();
  const ndc = new Vector2();
  const local = new Vector3();
  const readout = $('ttReadout');
  function read(e) {
    const r = canvas.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const shown = ['left', 'right'].filter((s) => feet[s].foot.visible);
    const hit = ray.intersectObjects(shown.map((s) => feet[s].mesh), false)[0];
    const active = $('ttPanels').querySelector('tr[data-active]');
    if (active) delete active.dataset.active;
    if (!hit) return;
    const side = hit.object === feet.left.mesh ? 'left' : 'right';
    hit.object.worldToLocal(local.copy(hit.point));
    const p = panelAt(FRAME.x0 + local.x * FRAME.L, FRAME.yBottom - local.y * FRAME.L);
    if (!p) return;
    const [l, rr] = [state.pair.left.get(p.id), state.pair.right.get(p.id)];
    readout.textContent = `${p.name}, ${side} foot: ${state.pair[side].get(p.id)}. ${l === rr ? 'Both feet agree here.' : `The other foot is ${side === 'left' ? rr : l}: the feet can never agree here.`}`;
    $('ttPanels').querySelector(`tr[data-panel="${p.id}"]`).dataset.active = '';
  }
  canvas.addEventListener('pointermove', read);
  canvas.addEventListener('pointerdown', read);

  for (const b of stage.querySelectorAll('button[data-show]')) {
    b.addEventListener('click', () => {
      state.show = b.dataset.show;
      layout();
      reset();
    });
  }
  $('ttSpin').addEventListener('click', () => setSpin(!state.spin));
  $('ttReset').addEventListener('click', reset);

  // A new code in the address repaints the pair in place.
  window.addEventListener('hashchange', () => {
    ({ project, notice } = readDesign());
    state.pair = pairOf(paletteOf(project), collapse({ ...project, seed: project.measureSeed }).outcomes);
    renderText(project, state.pair, notice);
    platterColor = band(project);
    disc.material.color.set(platterColor);
    for (const side of ['left', 'right']) {
      paintSide(state.pair[side], feet[side].canvasPaint);
      feet[side].paint.needsUpdate = true;
    }
    wake();
  });

  new ResizeObserver(resize).observe(view);
  new IntersectionObserver(([e]) => {
    onScreen = e.isIntersecting;
    wake();
  }).observe(view);
  layout();
  setSpin(state.spin);
  place(HOME.pair);
  $('ttLoading').hidden = true;
  resize();
}

start().catch((e) => {
  $('ttLoading').textContent = `The pair could not be shown: ${e.message}`;
  stage.dataset.ready = 'error';
});
