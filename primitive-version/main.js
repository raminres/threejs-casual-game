import * as THREE from 'three';
import './style.css';

// --- GAME STATE ---
let currentLevel = 1;
let coins = 350;
let progress = 0;
const maxProgress = 12;

let spins = 5;
const maxSpins = 50;
let isSpinning = false;

// Box Opening Mini-Game State
let keys = 3;
let boxObjects = [];

// Dynamic Building Costs
let buildingCosts = {
  dock: 100,
  lighthouse: 150,
  boat: 200
};

// Track building counts and placed 3D meshes
let buildingCounts = { dock: 0, lighthouse: 0, boat: 0 };
let placedBuildingMeshes = [];

// Helper: Random Integer Generator
function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// --- UPGRADED SLICE REWARDS (12 Slices) ---
const REWARDS = [
  { type: 'coin',  val: 300,     label: '300' },
  { type: 'chest', val: 'CHEST', label: '📦 CHEST' },
  { type: 'spin',  val: 5,       label: '+5 SPIN' },
  { type: 'coin',  val: 400,     label: '400' },
  { type: 'coin',  val: 800,     label: '800' },
  { type: 'chest', val: 'CHEST', label: '📦 CHEST' },
  { type: 'coin',  val: 250,     label: '250' },
  { type: 'spin',  val: 5,       label: '+5 SPIN' },
  { type: 'coin',  val: 500,     label: '500' },
  { type: 'coin',  val: 1000,    label: '1000' },
  { type: 'coin',  val: 3000,    label: '3000' },
  { type: 'coin',  val: 500,     label: '500' },
];

const SLICE_COUNT = 12;
const SLICE_ANGLE = (Math.PI * 2) / SLICE_COUNT;

// --- DOM ELEMENTS ---
const coinCountEl = document.getElementById('coin-count');
const progressTextEl = document.getElementById('progress-text');
const progressFillEl = document.getElementById('progress-fill');
const progressWrapperEl = document.getElementById('progress-wrapper');

const spinEnergyWrapperEl = document.getElementById('spin-energy-wrapper');
const spinEnergyTextEl = document.getElementById('spin-energy-text');
const spinEnergyFillEl = document.getElementById('spin-energy-fill');

const bottomBarEl = document.getElementById('bottom-bar');
const spinBarEl = document.getElementById('spin-bar');
const backIslandBarEl = document.getElementById('back-island-bar');

const btnDock = document.getElementById('btn-dock');
const btnLighthouse = document.getElementById('btn-lighthouse');
const btnBoat = document.getElementById('btn-boat');

const btnGoSpin = document.getElementById('btn-go-spin');
const btnBackIsland = document.getElementById('btn-back-island');

const levelCompleteModalEl = document.getElementById('level-complete-modal');
const completeTitleEl = document.getElementById('complete-title');
const btnNextIsland = document.getElementById('btn-next-island');

const boxHudOverlayEl = document.getElementById('box-hud-overlay');
const keyCountEl = document.getElementById('key-count');

// --- THREE.JS SETUP ---
const canvas = document.getElementById('game-canvas');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0f172a);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

// --- CAMERA PRESETS ---
function setIslandCamera() {
  camera.fov = 60;
  camera.up.set(0, 1, 0);
  
  if (currentLevel === 1) {
    camera.position.set(12, 5, 9);
  } else if (currentLevel === 2) {
    camera.position.set(-11, 6, 10);
  } else {
    camera.position.set(0, 7, 12);
  }
  camera.lookAt(0, 0, 0);
  camera.updateProjectionMatrix();
}

function setSpinCamera() {
  camera.fov = 60;
  camera.up.set(0, 0, -1);
  camera.position.set(0, 12, 0);
  camera.lookAt(0, 0, 0);
  camera.updateProjectionMatrix();
}

function setMapCamera() {
  camera.fov = 60;
  camera.up.set(0, 1, 0);
  camera.position.set(0, 0, 14);
  camera.lookAt(0, 0, 0);
  camera.updateProjectionMatrix();
}

function setBoxCamera() {
  camera.fov = 55;
  camera.up.set(0, 1, 0);
  camera.position.set(0, 7.5, 6.5);
  camera.lookAt(0, 0, 0.2);
  camera.updateProjectionMatrix();
}

setIslandCamera();

// --- LIGHTING ---
const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
dirLight.position.set(5, 10, 7);
scene.add(dirLight);

// --- GROUPS ---
const islandGroup = new THREE.Group();
const spinGroup = new THREE.Group();
const mapGroup = new THREE.Group();
const boxGroup = new THREE.Group();

scene.add(islandGroup);
scene.add(spinGroup);
scene.add(mapGroup);
scene.add(boxGroup);

spinGroup.visible = false;
mapGroup.visible = false;
boxGroup.visible = false;

// ==========================================
// 1. ISLAND SCENE
// ==========================================
let groundMat, seaMat;

function buildIsland() {
  const groundGeo = new THREE.BoxGeometry(6, 0.3, 6);
  groundMat = new THREE.MeshStandardMaterial({ color: 0x22c55e });
  const groundMesh = new THREE.Mesh(groundGeo, groundMat);
  groundMesh.position.set(-3, -0.15, 0);
  islandGroup.add(groundMesh);

  const seaGeo = new THREE.BoxGeometry(6, 0.2, 6);
  seaMat = new THREE.MeshStandardMaterial({ color: 0x0284c7 });
  const seaMesh = new THREE.Mesh(seaGeo, seaMat);
  seaMesh.position.set(3, -0.25, 0);
  islandGroup.add(seaMesh);
}
buildIsland();

// ==========================================
// 2. MAP SCENE (3-ISLAND VERTICAL PROGRESSION)
// ==========================================
let shipPyramidMesh = null;
const ISLAND_1_Y = -4.0;
const ISLAND_2_Y = 0.0;
const ISLAND_3_Y = 4.0;

function buildMapScene() {
  const lineGeo = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, ISLAND_1_Y, 0),
    new THREE.Vector3(0, ISLAND_3_Y, 0)
  ]);
  const lineMat = new THREE.LineDashedMaterial({
    color: 0xfbbf24,
    dashSize: 0.3,
    gapSize: 0.2
  });
  const routeLine = new THREE.Line(lineGeo, lineMat);
  routeLine.computeLineDistances();
  mapGroup.add(routeLine);

  const isl1Geo = new THREE.CylinderGeometry(1.6, 1.6, 0.3, 32);
  const isl1Mat = new THREE.MeshStandardMaterial({ color: 0x22c55e });
  const island1Marker = new THREE.Mesh(isl1Geo, isl1Mat);
  island1Marker.position.set(0, ISLAND_1_Y, 0);
  mapGroup.add(island1Marker);

  const isl2Geo = new THREE.CylinderGeometry(1.6, 1.6, 0.3, 32);
  const isl2Mat = new THREE.MeshStandardMaterial({ color: 0x0ea5e9 });
  const island2Marker = new THREE.Mesh(isl2Geo, isl2Mat);
  island2Marker.position.set(0, ISLAND_2_Y, 0);
  mapGroup.add(island2Marker);

  const isl3Geo = new THREE.CylinderGeometry(1.6, 1.6, 0.3, 32);
  const isl3Mat = new THREE.MeshStandardMaterial({ color: 0x8b5cf6 });
  const island3Marker = new THREE.Mesh(isl3Geo, isl3Mat);
  island3Marker.position.set(0, ISLAND_3_Y, 0);
  mapGroup.add(island3Marker);

  const pyramidGeo = new THREE.ConeGeometry(0.5, 1.2, 4);
  const pyramidMat = new THREE.MeshStandardMaterial({ 
    color: 0xf97316, 
    metalness: 0.3, 
    roughness: 0.2 
  });
  shipPyramidMesh = new THREE.Mesh(pyramidGeo, pyramidMat);
  shipPyramidMesh.position.set(0, ISLAND_1_Y + 0.6, 0.2);
  mapGroup.add(shipPyramidMesh);
}
buildMapScene();

function animateMapShipTravel(startY, endY, onComplete) {
  const duration = 3500;
  const startTime = performance.now();
  const startPosY = startY + 0.6;
  const endPosY = endY + 0.6;

  function step(currentTime) {
    const elapsed = currentTime - startTime;
    const t = Math.min(elapsed / duration, 1);

    const easeT = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

    shipPyramidMesh.position.y = THREE.MathUtils.lerp(startPosY, endPosY, easeT);
    shipPyramidMesh.rotation.y = easeT * Math.PI * 4;

    if (t < 1) {
      requestAnimationFrame(step);
    } else {
      setTimeout(() => {
        if (onComplete) onComplete();
      }, 400);
    }
  }

  requestAnimationFrame(step);
}

// ==========================================
// 3. DYNAMIC BUILDING SYSTEM & RESTART LOGIC
// ==========================================
function buyBuilding(type) {
  const cost = buildingCosts[type];

  if (coins < cost || progress >= maxProgress) return;

  coins -= cost;
  progress++;
  buildingCounts[type]++;

  buildingCosts[type] += getRandomInt(20, 60);

  let mesh = null;
  if (type === 'dock') {
    const dockGeo = new THREE.BoxGeometry(1.5, 0.1, 0.8);
    const dockMat = new THREE.MeshStandardMaterial({ color: 0x854d0e });
    mesh = new THREE.Mesh(dockGeo, dockMat);
    mesh.position.set(0, 0.05, (buildingCounts.dock - 1) * 1.2 - 1.5);
  } 
  else if (type === 'lighthouse') {
    const lhGeo = new THREE.CylinderGeometry(0.3, 0.5, 2, 16);
    const lhMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc });
    mesh = new THREE.Mesh(lhGeo, lhMat);
    mesh.position.set(-4.5 + (buildingCounts.lighthouse * 0.8), 1, -1.5);
  } 
  else if (type === 'boat') {
    const boatGeo = new THREE.BoxGeometry(1.2, 0.3, 0.6);
    const boatMat = new THREE.MeshStandardMaterial({ color: 0xd97706 });
    mesh = new THREE.Mesh(boatGeo, boatMat);
    mesh.position.set(3.5, -0.1, (buildingCounts.boat * 1.5) - 2);
  }

  if (mesh) {
    islandGroup.add(mesh);
    placedBuildingMeshes.push(mesh);
  }

  updateUI();
}

btnDock.addEventListener('click', () => buyBuilding('dock'));
btnLighthouse.addEventListener('click', () => buyBuilding('lighthouse'));
btnBoat.addEventListener('click', () => buyBuilding('boat'));

function restartGame() {
  currentLevel = 1;
  coins = 350;
  progress = 0;
  spins = 5;

  buildingCosts = { dock: 100, lighthouse: 150, boat: 200 };
  buildingCounts = { dock: 0, lighthouse: 0, boat: 0 };

  placedBuildingMeshes.forEach(mesh => islandGroup.remove(mesh));
  placedBuildingMeshes = [];

  groundMat.color.setHex(0x22c55e);
  seaMat.color.setHex(0x0284c7);

  if (shipPyramidMesh) {
    shipPyramidMesh.position.set(0, ISLAND_1_Y + 0.6, 0.2);
    shipPyramidMesh.rotation.y = 0;
  }

  mapGroup.visible = false;
  spinGroup.visible = false;
  boxGroup.visible = false;
  islandGroup.visible = true;

  progressWrapperEl.classList.remove('hidden');
  bottomBarEl.classList.remove('hidden');

  setIslandCamera();
  updateUI();
}

btnNextIsland.addEventListener('click', () => {
  levelCompleteModalEl.classList.add('hidden');

  if (currentLevel === 1) {
    islandGroup.visible = false;
    spinGroup.visible = false;
    boxGroup.visible = false;
    mapGroup.visible = true;
    progressWrapperEl.classList.add('hidden');
    bottomBarEl.classList.add('hidden');
    setMapCamera();

    animateMapShipTravel(ISLAND_1_Y, ISLAND_2_Y, () => {
      currentLevel = 2;
      progress = 0;
      buildingCounts = { dock: 0, lighthouse: 0, boat: 0 };

      buildingCosts.dock += getRandomInt(100, 120);
      buildingCosts.lighthouse += getRandomInt(100, 120);
      buildingCosts.boat += getRandomInt(100, 120);

      placedBuildingMeshes.forEach(mesh => islandGroup.remove(mesh));
      placedBuildingMeshes = [];

      groundMat.color.setHex(0x10b981);
      seaMat.color.setHex(0x06b6d4);

      mapGroup.visible = false;
      islandGroup.visible = true;
      progressWrapperEl.classList.remove('hidden');
      bottomBarEl.classList.remove('hidden');

      setIslandCamera();
      updateUI();
    });
  } else if (currentLevel === 2) {
    islandGroup.visible = false;
    spinGroup.visible = false;
    boxGroup.visible = false;
    mapGroup.visible = true;
    progressWrapperEl.classList.add('hidden');
    bottomBarEl.classList.add('hidden');
    setMapCamera();

    animateMapShipTravel(ISLAND_2_Y, ISLAND_3_Y, () => {
      currentLevel = 3;
      progress = 0;
      buildingCounts = { dock: 0, lighthouse: 0, boat: 0 };

      buildingCosts.dock += getRandomInt(100, 120);
      buildingCosts.lighthouse += getRandomInt(100, 120);
      buildingCosts.boat += getRandomInt(100, 120);

      placedBuildingMeshes.forEach(mesh => islandGroup.remove(mesh));
      placedBuildingMeshes = [];

      groundMat.color.setHex(0x8b5cf6);
      seaMat.color.setHex(0x3b82f6);

      mapGroup.visible = false;
      islandGroup.visible = true;
      progressWrapperEl.classList.remove('hidden');
      bottomBarEl.classList.remove('hidden');

      setIslandCamera();
      updateUI();
    });
  } else {
    restartGame();
  }
});

// ==========================================
// 4. SPIN SCENE
// ==========================================
let wheelGroup = new THREE.Group();
let buttonGroup = new THREE.Group();
let spinButtonMesh = null;

function createTextTexture(text) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');

  ctx.clearRect(0, 0, 256, 128);

  ctx.font = '900 40px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  ctx.strokeStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.lineWidth = 6;
  ctx.strokeText(text, 128, 64);

  ctx.fillStyle = '#ffffff';
  ctx.fillText(text, 128, 64);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

function buildSpinScene() {
  spinGroup.position.set(0, 0, 2.6);
  spinGroup.rotation.x = 0;

  const colors = [
    '#f43f5e', '#3b82f6', '#10b981', '#f59e0b', 
    '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16', 
    '#eab308', '#a855f7', '#6366f1', '#14b8a6'
  ];

  for (let i = 0; i < SLICE_COUNT; i++) {
    const wedgeGeo = new THREE.CylinderGeometry(
      3.5, 3.5, 0.4, 
      16, 1, false, 
      i * SLICE_ANGLE + Math.PI, SLICE_ANGLE
    );

    const wedgeMat = new THREE.MeshStandardMaterial({ 
      color: colors[i], 
      roughness: 0.3 
    });

    const wedgeMesh = new THREE.Mesh(wedgeGeo, wedgeMat);
    wheelGroup.add(wedgeMesh);

    const labelTex = createTextTexture(REWARDS[i].label);
    const labelGeo = new THREE.PlaneGeometry(1.4, 0.7);
    const labelMat = new THREE.MeshBasicMaterial({
      map: labelTex,
      transparent: true,
      side: THREE.DoubleSide
    });

    const labelMesh = new THREE.Mesh(labelGeo, labelMat);
    const midAngle = (i + 0.5) * SLICE_ANGLE + Math.PI;
    const radialDistance = 2.2;

    labelMesh.position.x = Math.sin(midAngle) * radialDistance;
    labelMesh.position.y = 0.22;
    labelMesh.position.z = Math.cos(midAngle) * radialDistance;

    labelMesh.rotation.x = -Math.PI / 2;
    labelMesh.rotation.z = -midAngle + Math.PI;

    wheelGroup.add(labelMesh);
  }

  const rimGeo = new THREE.TorusGeometry(3.6, 0.15, 16, 64);
  const rimMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.8, roughness: 0.2 });
  const rimMesh = new THREE.Mesh(rimGeo, rimMat);
  rimMesh.rotation.x = Math.PI / 2;
  wheelGroup.add(rimMesh);

  spinGroup.add(wheelGroup);

  buttonGroup.position.set(0, 0.3, 0);

  const btnGeo = new THREE.CylinderGeometry(0.85, 0.85, 0.5, 32);
  const btnMat = new THREE.MeshStandardMaterial({ color: 0xef4444, metalness: 0.2, roughness: 0.3 });
  spinButtonMesh = new THREE.Mesh(btnGeo, btnMat);
  buttonGroup.add(spinButtonMesh);

  const btnCanvas = document.createElement('canvas');
  btnCanvas.width = 256;
  btnCanvas.height = 256;
  const bCtx = btnCanvas.getContext('2d');
  bCtx.fillStyle = '#ef4444';
  bCtx.fillRect(0, 0, 256, 256);
  bCtx.fillStyle = '#ffffff';
  bCtx.font = '900 64px sans-serif';
  bCtx.textAlign = 'center';
  bCtx.textBaseline = 'middle';
  bCtx.fillText('SPIN', 128, 128);

  const btnTex = new THREE.CanvasTexture(btnCanvas);
  const capGeo = new THREE.CircleGeometry(0.8, 32);
  const capMat = new THREE.MeshBasicMaterial({ map: btnTex });
  const capMesh = new THREE.Mesh(capGeo, capMat);
  capMesh.rotation.x = -Math.PI / 2;
  capMesh.position.y = 0.26;
  buttonGroup.add(capMesh);

  spinGroup.add(buttonGroup);

  const pointerGeo = new THREE.ConeGeometry(0.3, 0.8, 4);
  const pointerMat = new THREE.MeshStandardMaterial({ color: 0xfacc15 });
  const pointerMesh = new THREE.Mesh(pointerGeo, pointerMat);
  pointerMesh.position.set(0, 0.3, -3.8);
  pointerMesh.rotation.x = Math.PI / 2;
  spinGroup.add(pointerMesh);
}
buildSpinScene();

// ==========================================
// 5. 3D BOX OPENING LEVEL (CHESTS & HINGED LIDS)
// ==========================================
function buildBoxOpeningScene() {
  // Pedestal Platform
  const platGeo = new THREE.BoxGeometry(6.8, 0.2, 6.8);
  const platMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.3, metalness: 0.5 });
  const platMesh = new THREE.Mesh(platGeo, platMat);
  platMesh.position.set(0, -0.1, 0);
  boxGroup.add(platMesh);

  // Border Trim
  const borderGeo = new THREE.BoxGeometry(7.0, 0.15, 7.0);
  const borderMat = new THREE.MeshStandardMaterial({ color: 0xfbbf24, metalness: 0.8, roughness: 0.2 });
  const borderMesh = new THREE.Mesh(borderGeo, borderMat);
  borderMesh.position.set(0, -0.2, 0);
  boxGroup.add(borderMesh);

  // 3x3 Chest Grid Placement
  const spacing = 2.0;
  boxObjects = [];

  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      const index = row * 3 + col;
      const x = (col - 1) * spacing;
      const z = (row - 1) * spacing;

      const container = new THREE.Group();
      container.position.set(x, 0, z);

      // Chest Base
      const baseGeo = new THREE.BoxGeometry(1.2, 0.8, 1.2);
      const baseMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.4, metalness: 0.1 });
      const baseMesh = new THREE.Mesh(baseGeo, baseMat);
      baseMesh.position.y = 0.4;
      baseMesh.userData = { boxIndex: index };
      container.add(baseMesh);

      // Gold Trim Band
      const trimGeo = new THREE.BoxGeometry(1.24, 0.15, 1.24);
      const trimMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, metalness: 0.8, roughness: 0.2 });
      const trimMesh = new THREE.Mesh(trimGeo, trimMat);
      trimMesh.position.y = 0.75;
      container.add(trimMesh);

      // Hinged Lid Pivot Group (positioned at back top edge)
      const lidPivot = new THREE.Group();
      lidPivot.position.set(0, 0.8, -0.6);
      container.add(lidPivot);

      const lidGeo = new THREE.BoxGeometry(1.25, 0.25, 1.25);
      const lidMat = new THREE.MeshStandardMaterial({ color: 0x92400e, roughness: 0.4 });
      const lidMesh = new THREE.Mesh(lidGeo, lidMat);
      lidMesh.position.set(0, 0.125, 0.625);
      lidPivot.add(lidMesh);

      // Floating Reward Label Mesh (Canvas Sprite Plane)
      const labelGeo = new THREE.PlaneGeometry(1.8, 0.9);
      const labelMat = new THREE.MeshBasicMaterial({ transparent: true, side: THREE.DoubleSide, visible: false });
      const labelMesh = new THREE.Mesh(labelGeo, labelMat);
      labelMesh.position.set(0, 1.6, 0);
      labelMesh.rotation.x = -Math.PI / 6;
      container.add(labelMesh);

      boxGroup.add(container);

      boxObjects.push({
        baseMesh,
        lidPivot,
        labelMesh,
        labelMat,
        isOpened: false,
        reward: null
      });
    }
  }
}
buildBoxOpeningScene();

function startBoxOpeningLevel() {
  keys = 3;

  // Shuffle 9 rewards
  const rewardsList = [
    { type: 'coin', val: 500,  label: '+500 🪙' },
    { type: 'coin', val: 1000, label: '+1000 🪙' },
    { type: 'coin', val: 1500, label: '+1500 🪙' },
    { type: 'empty', val: 0,   label: 'Empty 💨' },
    { type: 'empty', val: 0,   label: 'Empty 💨' },
    { type: 'empty', val: 0,   label: 'Empty 💨' },
    { type: 'key',  val: 1,   label: '+1 Key 🔑' },
    { type: 'key',  val: 2,   label: '+2 Keys 🔑' },
    { type: 'coin', val: 800,  label: '+800 🪙' },
  ].sort(() => Math.random() - 0.5);

  // Reset 3D Chests
  boxObjects.forEach((box, i) => {
    box.isOpened = false;
    box.reward = rewardsList[i];
    box.lidPivot.rotation.x = 0;
    box.labelMat.visible = false;
  });

  islandGroup.visible = false;
  spinGroup.visible = false;
  mapGroup.visible = false;
  boxGroup.visible = true;

  progressWrapperEl.classList.add('hidden');
  bottomBarEl.classList.add('hidden');
  spinBarEl.classList.add('hidden');

  boxHudOverlayEl.classList.remove('hidden');

  setBoxCamera();
  updateUI();
}

function handleBoxClick(index) {
  const box = boxObjects[index];
  if (keys <= 0 || box.isOpened) return;

  box.isOpened = true;
  keys--;

  // Animate Lid Opening
  const duration = 300;
  const startTime = performance.now();
  function animateLid(now) {
    const elapsed = now - startTime;
    const t = Math.min(elapsed / duration, 1);
    box.lidPivot.rotation.x = THREE.MathUtils.lerp(0, -Math.PI * 0.75, t);
    if (t < 1) requestAnimationFrame(animateLid);
  }
  requestAnimationFrame(animateLid);

  // Reveal Reward Texture above Chest
  const tex = createTextTexture(box.reward.label);
  box.labelMat.map = tex;
  box.labelMat.needsUpdate = true;
  box.labelMat.visible = true;

  // Process Reward
  if (box.reward.type === 'coin') {
    coins += box.reward.val;
  } else if (box.reward.type === 'key') {
    keys += box.reward.val;
  }

  updateUI();

  // Out of Keys -> Return to Spin Scene after brief delay
  if (keys <= 0) {
    setTimeout(() => {
      boxHudOverlayEl.classList.add('hidden');
      switchToSpinScene();
    }, 1500);
  }
}

// ==========================================
// 6. RAYCASTING & SPINNING
// ==========================================
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

function animateButtonPress(onComplete) {
  const startY = 0.3;
  const pressedY = 0.05;
  const pressTime = 100;
  const startTime = performance.now();

  function step(now) {
    const elapsed = now - startTime;
    if (elapsed < pressTime) {
      const t = elapsed / pressTime;
      buttonGroup.position.y = THREE.MathUtils.lerp(startY, pressedY, t);
      requestAnimationFrame(step);
    } else if (elapsed < pressTime * 2) {
      const t = (elapsed - pressTime) / pressTime;
      buttonGroup.position.y = THREE.MathUtils.lerp(pressedY, startY, t);
      requestAnimationFrame(step);
    } else {
      buttonGroup.position.y = startY;
      if (onComplete) onComplete();
    }
  }

  requestAnimationFrame(step);
}

window.addEventListener('click', (event) => {
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);

  if (spinGroup.visible && !isSpinning && spins > 0) {
    const intersects = raycaster.intersectObject(spinButtonMesh);
    if (intersects.length > 0) {
      animateButtonPress(() => {
        triggerWheelSpin();
      });
    }
  } else if (boxGroup.visible && keys > 0) {
    const baseMeshes = boxObjects.map(b => b.baseMesh);
    const intersects = raycaster.intersectObjects(baseMeshes);

    if (intersects.length > 0) {
      const hitMesh = intersects[0].object;
      const boxIndex = hitMesh.userData.boxIndex;
      handleBoxClick(boxIndex);
    }
  }
});

function triggerWheelSpin() {
  isSpinning = true;
  spins--;
  updateUI();

  const winningIndex = Math.floor(Math.random() * SLICE_COUNT);
  const reward = REWARDS[winningIndex];

  const sliceCenterOffset = (winningIndex + 0.5) * SLICE_ANGLE;
  let targetAngle = -sliceCenterOffset;

  const currentRot = wheelGroup.rotation.y;
  const fullSpins = Math.PI * 2 * 5;
  let diff = (targetAngle - currentRot) % (Math.PI * 2);
  if (diff > 0) diff -= Math.PI * 2;

  const finalRotation = currentRot - fullSpins + diff;

  const duration = 4000;
  const startTime = performance.now();
  const startRotation = wheelGroup.rotation.y;

  function animateSpin(currentTime) {
    const elapsed = currentTime - startTime;
    const progressVal = Math.min(elapsed / duration, 1);

    const easeOut = 1 - Math.pow(1 - progressVal, 3);
    wheelGroup.rotation.y = startRotation + (finalRotation - startRotation) * easeOut;

    if (progressVal < 1) {
      requestAnimationFrame(animateSpin);
    } else {
      isSpinning = false;
      
      if (reward.type === 'coin') {
        coins += reward.val;
      } else if (reward.type === 'spin') {
        spins = Math.min(maxSpins, spins + reward.val);
      } else if (reward.type === 'chest') {
        startBoxOpeningLevel();
        return;
      }
      
      updateUI();
    }
  }

  requestAnimationFrame(animateSpin);
}

// ==========================================
// 7. SCENE SWITCHING
// ==========================================
function switchToSpinScene() {
  islandGroup.visible = false;
  mapGroup.visible = false;
  boxGroup.visible = false;
  spinGroup.visible = true;

  spins = 5;

  setSpinCamera();

  boxHudOverlayEl.classList.add('hidden');
  progressWrapperEl.classList.add('hidden');
  bottomBarEl.classList.add('hidden');
  spinBarEl.classList.add('hidden');

  spinEnergyWrapperEl.classList.remove('hidden');
  backIslandBarEl.classList.remove('hidden');

  updateUI();
}

function switchToIslandScene() {
  spinGroup.visible = false;
  mapGroup.visible = false;
  boxGroup.visible = false;
  islandGroup.visible = true;

  setIslandCamera();

  boxHudOverlayEl.classList.add('hidden');
  spinEnergyWrapperEl.classList.add('hidden');
  backIslandBarEl.classList.add('hidden');

  progressWrapperEl.classList.remove('hidden');
  bottomBarEl.classList.remove('hidden');
  updateUI();
}

btnGoSpin.addEventListener('click', () => switchToSpinScene());
btnBackIsland.addEventListener('click', () => switchToIslandScene());

// ==========================================
// 8. UI UPDATES
// ==========================================
function updateUI() {
  coinCountEl.innerText = coins;
  keyCountEl.innerText = keys;
  
  progressTextEl.innerText = `Level ${currentLevel}: ${progress} / ${maxProgress}`;
  progressFillEl.style.width = `${(progress / maxProgress) * 100}%`;

  spinEnergyTextEl.innerText = `⚡ Spins: ${spins} / ${maxSpins}`;
  spinEnergyFillEl.style.width = `${(spins / maxSpins) * 100}%`;

  if (progress >= maxProgress) {
    if (currentLevel < 3) {
      completeTitleEl.innerText = `LEVEL ${currentLevel} COMPLETE!`;
      btnNextIsland.innerText = "Travel to Next Island 🚢";
    } else {
      completeTitleEl.innerText = `ALL LEVELS COMPLETE! 🎉`;
      btnNextIsland.innerText = "Restart Game 🔄";
    }
    levelCompleteModalEl.classList.remove('hidden');
  }

  btnDock.innerHTML = `Dock<br>(${buildingCosts.dock} 🪙)`;
  btnLighthouse.innerHTML = `Lighthouse<br>(${buildingCosts.lighthouse} 🪙)`;
  btnBoat.innerHTML = `Boat<br>(${buildingCosts.boat} 🪙)`;

  btnDock.style.opacity = coins >= buildingCosts.dock && progress < maxProgress ? '1' : '0.5';
  btnLighthouse.style.opacity = coins >= buildingCosts.lighthouse && progress < maxProgress ? '1' : '0.5';
  btnBoat.style.opacity = coins >= buildingCosts.boat && progress < maxProgress ? '1' : '0.5';

  checkSpinButtonTrigger();
}

function checkSpinButtonTrigger() {
  const minBuildingCost = Math.min(buildingCosts.dock, buildingCosts.lighthouse, buildingCosts.boat);
  
  if (coins < minBuildingCost && islandGroup.visible && progress < maxProgress) {
    spinBarEl.classList.remove('hidden');
  } else {
    spinBarEl.classList.add('hidden');
  }
}

updateUI();

// ==========================================
// 9. RENDER LOOP
// ==========================================
function animate() {
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
}
animate();

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});