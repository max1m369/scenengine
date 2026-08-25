import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { computeBoundsTree, disposeBoundsTree, acceleratedRaycast, MeshBVH, StaticGeometryGenerator } from 'three-mesh-bvh';
import { Capsule } from 'three/examples/jsm/math/Capsule.js';

THREE.BufferGeometry.prototype.computeBoundsTree = computeBoundsTree;
THREE.BufferGeometry.prototype.disposeBoundsTree = disposeBoundsTree;
THREE.Mesh.prototype.raycast = acceleratedRaycast;

/* ============================================================
   WEB AUDIO SOUND SYNTHESIS
   ============================================================ */
class SoundFX {
  constructor() {
    this.ctx = null;
  }
  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
  }
  playChirp() {
    if (!this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(580, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, this.ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.1);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.1);
    } catch(e) {}
  }
  playWhoosh() {
    if (!this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(220, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(440, this.ctx.currentTime + 0.25);
      gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.25);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.25);
    } catch(e) {}
  }
  playStep() {
    if (!this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(90, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(40, this.ctx.currentTime + 0.05);
      gain.gain.setValueAtTime(0.04, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.05);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.05);
    } catch(e) {}
  }
}
const sfx = new SoundFX();

/* ============================================================
   SCENE, CAMERA, RENDERER INITIALIZATION
   ============================================================ */
const container = document.getElementById('canvas-container');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x080c14);
scene.fog = new THREE.FogExp2(0x080c14, 0.035);

const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.05, 100);
camera.position.set(0, 1.6, 4.2);

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.25;
renderer.outputColorSpace = THREE.SRGBColorSpace;
container.appendChild(renderer.domElement);

/* ============================================================
   EXHIBITION HALL ENVIRONMENT & LIGHTING
   ============================================================ */
const ambientLight = new THREE.AmbientLight(0x99bbff, 0.85);
scene.add(ambientLight);

const keyLight = new THREE.DirectionalLight(0xffffff, 2.2);
keyLight.position.set(4, 8, 5);
keyLight.castShadow = true;
keyLight.shadow.mapSize.width = 2048;
keyLight.shadow.mapSize.height = 2048;
keyLight.shadow.camera.near = 0.5;
keyLight.shadow.camera.far = 25;
keyLight.shadow.camera.left = -6;
keyLight.shadow.camera.right = 6;
keyLight.shadow.camera.top = 6;
keyLight.shadow.camera.bottom = -4;
keyLight.shadow.bias = -0.0001;
keyLight.shadow.normalBias = 0.02;
scene.add(keyLight);

const fillLight = new THREE.DirectionalLight(0x3a7bd5, 1.3);
fillLight.position.set(-5, 6, -3);
scene.add(fillLight);

function createSpotlight(x, y, z, targetX, targetY, targetZ, color = 0xffffff, intensity = 4.5) {
  const spot = new THREE.SpotLight(color, intensity, 10, Math.PI / 4, 0.4, 1.5);
  spot.position.set(x, y, z);
  spot.target.position.set(targetX, targetY, targetZ);
  scene.add(spot);
  scene.add(spot.target);
  return spot;
}

const spotLeft = createSpotlight(-1.0, 3.2, 0.8, -1.0, 0.85, 0.3, 0xffffff, 6.0);
const spotRight = createSpotlight(1.55, 3.2, 0.8, 1.55, 0.85, 0.3, 0xffffff, 6.0);
const spotLogo = createSpotlight(-1.5, 3.0, 0.2, -1.55, 1.8, 0.74, 0x00d2ff, 4.0);

// Exhibition Hall Floor
const hallFloorGeo = new THREE.PlaneGeometry(60, 60, 60, 60);
const hallFloorMat = new THREE.MeshStandardMaterial({
  color: 0x0c111e,
  roughness: 0.25,
  metalness: 0.5,
});
const hallFloor = new THREE.Mesh(hallFloorGeo, hallFloorMat);
hallFloor.rotation.x = -Math.PI / 2;
hallFloor.position.y = -0.002;
hallFloor.receiveShadow = true;
scene.add(hallFloor);

const gridHelper = new THREE.GridHelper(60, 60, 0x00d2ff, 0x16243b);
gridHelper.position.y = 0.001;
scene.add(gridHelper);

/* ============================================================
   CONTROLS SETUP: POINTER LOCK & ORBIT CONTROLS
   ============================================================ */
let cameraMode = 'fps';
const fpsControls = new PointerLockControls(camera, document.body);
const orbitControls = new OrbitControls(camera, renderer.domElement);
orbitControls.enableDamping = true;
orbitControls.dampingFactor = 0.05;
orbitControls.maxPolarAngle = Math.PI / 2 - 0.02;
orbitControls.minDistance = 0.5;
orbitControls.maxDistance = 18;
orbitControls.enabled = false;

/* ============================================================
   COLLISION PHYSICS ENGINE (three-mesh-bvh + Capsule)
   ============================================================ */
const GRAVITY = 25;
const playerCapsule = new Capsule(
  new THREE.Vector3(0, 0.35, 4.2),
  new THREE.Vector3(0, 1.35, 4.2),
  0.35
);

let playerVelocity = new THREE.Vector3();
let playerDirection = new THREE.Vector3();
let playerOnFloor = false;
let colliderMesh = null;
let bvhCollider = null;

const keyStates = {
  KeyW: false,
  KeyA: false,
  KeyS: false,
  KeyD: false,
  ArrowUp: false,
  ArrowLeft: false,
  ArrowDown: false,
  ArrowRight: false,
  ShiftLeft: false,
  ShiftRight: false,
  Space: false
};

document.addEventListener('keydown', (e) => {
  if (keyStates.hasOwnProperty(e.code)) {
    keyStates[e.code] = true;
  }
  if (e.code === 'KeyE') {
    handleInteractKey();
  }
  if (e.code === 'KeyC') {
    toggleCameraMode();
  }
});

document.addEventListener('keyup', (e) => {
  if (keyStates.hasOwnProperty(e.code)) {
    keyStates[e.code] = false;
  }
});

/* ============================================================
   HOTSPOTS DATA & INTERACTIVE EXHIBIT SYSTEM
   ============================================================ */
const HOTSPOTS_DATA = [
  {
    id: 'exploded',
    title: 'Взрыв-схема электродвигателя',
    category: 'КОНСТРУКЦИЯ И КОМПОНЕНТЫ',
    subtitle: 'Синхронная машина с постоянными магнитами (PMSM)',
    worldPos: new THREE.Vector3(-1.0, 0.85, 0.29),
    cameraPos: new THREE.Vector3(-1.0, 1.3, 1.7),
    lookTarget: new THREE.Vector3(-1.0, 0.85, 0.29),
    metrics: [
      { val: '150 кВт', lbl: 'Пиковая мощность' },
      { val: '320 Н·м', lbl: 'Макс. момент' },
      { val: '97.8%', lbl: 'КПД системы' }
    ],
    desc: 'Детальная взрыв-схема демонстрирует послойную архитектуру тягового электродвигателя: ротор с неодимовыми магнитами высокой коэрцитивной силы, шихтованный статор с распределенной обмоткой, подшипниковые щиты и систему непосредственного жидкостного охлаждения.',
    features: [
      'Оптимизированное синусоидальное распределение магнитного потока',
      'Защищенная герметичная рубашка охлаждения (IP67 / IP6K9K)',
      'Интегрированные датчики положения ротора высокой точности (Resolver)'
    ]
  },
  {
    id: 'assembled',
    title: 'Собранный тяговый электропривод',
    category: 'ТЯГОВЫЙ СИЛОВОЙ МОДУЛЬ',
    subtitle: 'Компактный агрегат 3-в-1 для легкового и коммерческого транспорта',
    worldPos: new THREE.Vector3(1.55, 0.85, 0.29),
    cameraPos: new THREE.Vector3(1.55, 1.3, 1.7),
    lookTarget: new THREE.Vector3(1.55, 0.85, 0.29),
    metrics: [
      { val: '16 000', lbl: 'Об/мин макс.' },
      { val: '78 кг', lbl: 'Сухая масса' },
      { val: '100%', lbl: 'Локализация РФ' }
    ],
    desc: 'Готовый серийный электросиловой агрегат объединяет в едином алюминиевом картере электродвигатель, одноступенчатый редуктор с дифференциалом и систему термостатирования. Создан для российских электромобилей нового поколения.',
    features: [
      'Высокая удельная мощность свыше 2.2 кВт/кг',
      'Низкий уровень шума и вибронагруженности (NVH стандарты)',
      'Ресурс эксплуатации более 300 000 км пробега'
    ]
  },
  {
    id: 'inverter',
    title: 'Силовой инвертор на карбиде кремния (SiC)',
    category: 'СИЛОВАЯ ЭЛЕКТРОНИКА',
    subtitle: 'Блок управления тяговым приводом высокой частоты',
    worldPos: new THREE.Vector3(-1.28, 1.45, 0.72),
    cameraPos: new THREE.Vector3(-1.28, 1.6, 1.8),
    lookTarget: new THREE.Vector3(-1.28, 1.45, 0.72),
    metrics: [
      { val: '800 В', lbl: 'Напряжение сети' },
      { val: '450 А', lbl: 'Макс. ток' },
      { val: '99.2%', lbl: 'КПД инвертора' }
    ],
    desc: 'Инвертор на базе полупроводников SiC (карбид кремния) обеспечивает рекордный КПД и способность работать на высоких частотах коммутации (до 40 кГц), существенно снижая тепловые потери и габариты радиаторов.',
    features: [
      'Векторное управление с алгоритмами бездатчикового позиционирования',
      'Аппаратная защита от перенапряжений и коротких замыканий',
      'Поддержка стандартов AUTOSAR и шины CAN-FD'
    ]
  },
  {
    id: 'infoboard',
    title: 'Информационный комплекс стенда',
    category: 'ЭКОСИСТЕМА РОСАТОМ',
    subtitle: 'Стратегия развития электрического движения в РФ',
    worldPos: new THREE.Vector3(0.85, 1.6, 0.72),
    cameraPos: new THREE.Vector3(0.85, 1.6, 2.3),
    lookTarget: new THREE.Vector3(0.85, 1.6, 0.72),
    metrics: [
      { val: 'Гигафабрика', lbl: 'Калининград' },
      { val: '4 ГВт·ч', lbl: 'Емкость/год' },
      { val: 'Полный цикл', lbl: 'От ячейки до авто' }
    ],
    desc: 'Единая экосистема Росатома в сфере электротранспорта включает производство литий-ионных батарей на гигафабриках, разработку тяговых электродвигателей, зарядной инфраструктуры и систем управления движением.',
    features: [
      'Собственная сырьевая и технологическая независимость',
      'Интеграция с крупнейшими автопроизводителями России',
      'Зеленая чистая энергия на всех этапах жизненного цикла'
    ]
  },
  {
    id: 'gearbox',
    title: 'Редукторная группа с дифференциалом',
    category: 'МЕХАНИЧЕСКАЯ ТРАНСМИССИЯ',
    subtitle: 'Интегрированный цилиндрический косозубый редуктор',
    worldPos: new THREE.Vector3(-0.60, 0.85, 0.15),
    cameraPos: new THREE.Vector3(-0.60, 1.3, 1.4),
    lookTarget: new THREE.Vector3(-0.60, 0.85, 0.15),
    metrics: [
      { val: '9.2:1', lbl: 'Передаточное число' },
      { val: '2800 Н·м', lbl: 'Момент на колесах' },
      { val: '98.5%', lbl: 'Мех. КПД' }
    ],
    desc: 'Высокоточная косозубая передача с шлифованными зубьями снижает акустический шум на высоких оборотах. Встроенный дифференциал передает крутящий момент на приводные валы колес.',
    features: [
      'Высокая контактная прочность и износостойкость зубьев',
      'Система принудительного разбрызгивания смазки',
      'Интегрированный механизм парковочной блокировки (Park Lock)'
    ]
  }
];

// Create 3D Hotspot DOM Elements
const hotspotElements = [];
HOTSPOTS_DATA.forEach(data => {
  const el = document.createElement('div');
  el.className = 'hotspot-marker';
  el.innerHTML = `
    <div class="hotspot-icon">⚡</div>
    <div class="hotspot-label">${data.title}</div>
  `;
  el.addEventListener('click', (e) => {
    e.stopPropagation();
    openExhibitDrawer(data);
  });
  document.body.appendChild(el);
  hotspotElements.push({ el, data });
});

/* ============================================================
   UI & DOM CONTROLS
   ============================================================ */
const blocker = document.getElementById('blocker');
const startBtn = document.getElementById('start-button');
const loadingScreen = document.getElementById('loading-screen');
const progressBar = document.getElementById('progress-bar');
const loadingPercent = document.getElementById('loading-percent');
const loadingStatus = document.getElementById('loading-status');
const reticle = document.getElementById('reticle');
const interactHint = document.getElementById('interact-hint');
const interactText = document.getElementById('interact-text');
const fpsCounter = document.getElementById('fps-counter');

const detailDrawer = document.getElementById('detail-drawer');
const closeDrawerBtn = document.getElementById('close-drawer-btn');
const drawerCategory = document.getElementById('drawer-category');
const drawerTitle = document.getElementById('drawer-title');
const drawerSubtitle = document.getElementById('drawer-subtitle');
const drawerDesc = document.getElementById('drawer-description');
const drawerFeatures = document.getElementById('drawer-features');
const metric1Val = document.getElementById('metric-1-val');
const metric1Lbl = document.getElementById('metric-1-lbl');
const metric2Val = document.getElementById('metric-2-val');
const metric2Lbl = document.getElementById('metric-2-lbl');
const metric3Val = document.getElementById('metric-3-val');
const metric3Lbl = document.getElementById('metric-3-lbl');
const focusExhibitBtn = document.getElementById('focus-exhibit-btn');

let activeHotspot = null;
let currentFocusedExhibit = null;

startBtn.addEventListener('click', () => {
  sfx.init();
  sfx.playWhoosh();
  if (cameraMode === 'fps') {
    fpsControls.lock();
  } else {
    blocker.classList.add('hidden');
  }
});

fpsControls.addEventListener('lock', () => {
  blocker.classList.add('hidden');
  reticle.classList.remove('hidden');
  detailDrawer.classList.add('hidden');
});

fpsControls.addEventListener('unlock', () => {
  if (cameraMode === 'fps' && detailDrawer.classList.contains('hidden')) {
    blocker.classList.remove('hidden');
  }
  reticle.classList.add('hidden');
});

closeDrawerBtn.addEventListener('click', () => {
  detailDrawer.classList.add('hidden');
  if (cameraMode === 'fps') {
    fpsControls.lock();
  }
});

focusExhibitBtn.addEventListener('click', () => {
  if (currentFocusedExhibit) {
    smoothTeleport(currentFocusedExhibit.cameraPos, currentFocusedExhibit.lookTarget);
    detailDrawer.classList.add('hidden');
  }
});

function openExhibitDrawer(data) {
  currentFocusedExhibit = data;
  sfx.playChirp();
  
  drawerCategory.textContent = data.category;
  drawerTitle.textContent = data.title;
  drawerSubtitle.textContent = data.subtitle;
  drawerDesc.textContent = data.desc;
  
  if (data.metrics && data.metrics.length >= 3) {
    metric1Val.textContent = data.metrics[0].val;
    metric1Lbl.textContent = data.metrics[0].lbl;
    metric2Val.textContent = data.metrics[1].val;
    metric2Lbl.textContent = data.metrics[1].lbl;
    metric3Val.textContent = data.metrics[2].val;
    metric3Lbl.textContent = data.metrics[2].lbl;
  }
  
  drawerFeatures.innerHTML = data.features.map(f => `<li>${f}</li>`).join('');
  detailDrawer.classList.remove('hidden');
  if (fpsControls.isLocked) {
    fpsControls.unlock();
  }
}

function handleInteractKey() {
  if (activeHotspot) {
    openExhibitDrawer(activeHotspot);
  }
}

// Teleport Chips Navigation
const navChips = document.querySelectorAll('.nav-chip');
const TELEPORT_POINTS = {
  overview: { pos: new THREE.Vector3(0, 1.6, 4.2), look: new THREE.Vector3(0, 1.0, 0.3) },
  exploded: { pos: new THREE.Vector3(-1.0, 1.5, 2.0), look: new THREE.Vector3(-1.0, 0.85, 0.3) },
  assembled: { pos: new THREE.Vector3(1.55, 1.5, 2.0), look: new THREE.Vector3(1.55, 0.85, 0.3) },
  inverter: { pos: new THREE.Vector3(-1.28, 1.6, 2.0), look: new THREE.Vector3(-1.28, 1.45, 0.72) },
  infoboard: { pos: new THREE.Vector3(0.85, 1.6, 2.4), look: new THREE.Vector3(0.85, 1.5, 0.72) }
};

navChips.forEach(chip => {
  chip.addEventListener('click', () => {
    navChips.forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    const pointKey = chip.dataset.point;
    if (TELEPORT_POINTS[pointKey]) {
      const p = TELEPORT_POINTS[pointKey];
      smoothTeleport(p.pos, p.look);
    }
  });
});

let isTeleporting = false;
let teleportStartPos = new THREE.Vector3();
let teleportTargetPos = new THREE.Vector3();
let teleportStartLook = new THREE.Vector3();
let teleportTargetLook = new THREE.Vector3();
let teleportProgress = 0;

function smoothTeleport(targetPos, targetLook) {
  sfx.playWhoosh();
  isTeleporting = true;
  teleportProgress = 0;
  teleportStartPos.copy(camera.position);
  teleportTargetPos.copy(targetPos);
  
  playerCapsule.start.set(targetPos.x, 0.35, targetPos.z);
  playerCapsule.end.set(targetPos.x, 1.35, targetPos.z);
  playerVelocity.set(0, 0, 0);

  const lookVec = new THREE.Vector3();
  camera.getWorldDirection(lookVec);
  teleportStartLook.copy(camera.position).add(lookVec);
  teleportTargetLook.copy(targetLook || targetPos);
}

const cameraModeBtn = document.getElementById('camera-mode-btn');
cameraModeBtn.addEventListener('click', toggleCameraMode);

function toggleCameraMode() {
  if (cameraMode === 'fps') {
    cameraMode = 'orbit';
    cameraModeBtn.innerHTML = '<span class="btn-emoji">🪐</span> <span class="btn-label">Орбита</span>';
    if (fpsControls.isLocked) fpsControls.unlock();
    fpsControls.enabled = false;
    orbitControls.enabled = true;
    orbitControls.target.set(0, 1.0, 0.3);
    reticle.classList.add('hidden');
    blocker.classList.add('hidden');
  } else {
    cameraMode = 'fps';
    cameraModeBtn.innerHTML = '<span class="btn-emoji">🚶</span> <span class="btn-label">1-е лицо</span>';
    orbitControls.enabled = false;
    fpsControls.enabled = true;
    reticle.classList.remove('hidden');
    fpsControls.lock();
  }
}

let isShowcaseNight = false;
const lightingModeBtn = document.getElementById('lighting-mode-btn');
lightingModeBtn.addEventListener('click', () => {
  isShowcaseNight = !isShowcaseNight;
  sfx.playChirp();
  if (isShowcaseNight) {
    scene.background.set(0x030508);
    scene.fog.color.set(0x030508);
    ambientLight.intensity = 0.25;
    keyLight.intensity = 0.8;
    fillLight.intensity = 0.4;
    spotLeft.intensity = 8.0;
    spotRight.intensity = 8.0;
    spotLogo.intensity = 6.0;
  } else {
    scene.background.set(0x080c14);
    scene.fog.color.set(0x080c14);
    ambientLight.intensity = 0.85;
    keyLight.intensity = 2.2;
    fillLight.intensity = 1.3;
    spotLeft.intensity = 6.0;
    spotRight.intensity = 6.0;
    spotLogo.intensity = 4.0;
  }
});

const fullscreenBtn = document.getElementById('fullscreen-btn');
fullscreenBtn.addEventListener('click', () => {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch(() => {});
  } else {
    document.exitFullscreen().catch(() => {});
  }
});

/* ============================================================
   MULTI-PATH ROBUST GLTF LOADER
   ============================================================ */
const gltfLoader = new GLTFLoader();

function hideLoadingScreen() {
  progressBar.style.width = '100%';
  loadingPercent.textContent = '100%';
  loadingStatus.textContent = 'Готово к просмотру!';

  setTimeout(() => {
    loadingScreen.style.opacity = '0';
    setTimeout(() => {
      loadingScreen.classList.add('hidden');
    }, 600);
  }, 300);
}

// Candidates for GLB model URL
const candidateUrls = [
  './booth.glb',
  'booth.glb',
  '/scenengine/booth.glb',
  './dist/booth.glb'
];

let loadAttemptIndex = 0;

function tryLoadModel() {
  if (loadAttemptIndex >= candidateUrls.length) {
    console.warn('All candidate URLs exhausted. Proceeding with procedural stage fallback.');
    hideLoadingScreen();
    return;
  }

  const currentUrl = candidateUrls[loadAttemptIndex];
  console.log(`[GLTF] Attempting to load model from: ${currentUrl}`);
  loadingStatus.textContent = `Загрузка 3D-модели (${loadAttemptIndex + 1}/${candidateUrls.length})...`;

  gltfLoader.load(
    currentUrl,
    (gltf) => {
      console.log(`[GLTF] Successfully loaded model from ${currentUrl}`);
      const model = gltf.scene;
      scene.add(model);

      const colliderMeshes = [];

      model.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;

          if (child.material) {
            child.material.roughness = Math.max(0.2, child.material.roughness || 0.4);
            const matName = (child.material.name || '').toLowerCase();
            const objName = (child.name || '').toLowerCase();
            if (
              matName.includes('led') || 
              matName.includes('underglow') || 
              objName.includes('led') || 
              objName.includes('glow') ||
              matName.includes('graphic') ||
              objName.includes('graphic')
            ) {
              child.material.emissiveIntensity = 2.0;
            }
          }
          colliderMeshes.push(child);
        }
      });

      try {
        if (colliderMeshes.length > 0) {
          const staticGen = new StaticGeometryGenerator(colliderMeshes);
          staticGen.attributes = ['position'];
          const mergedGeometry = staticGen.generate();
          mergedGeometry.computeBoundsTree();
          
          colliderMesh = new THREE.Mesh(mergedGeometry);
          bvhCollider = mergedGeometry.boundsTree;
          console.log('[BVH] Collision tree successfully built.');
        }
      } catch(err) {
        console.warn('[BVH] Fallback collider notice:', err);
      }

      hideLoadingScreen();
    },
    (xhr) => {
      if (xhr.lengthComputable && xhr.total > 0) {
        const percent = Math.min(99, Math.round((xhr.loaded / xhr.total) * 100));
        progressBar.style.width = percent + '%';
        loadingPercent.textContent = percent + '%';
      }
    },
    (error) => {
      console.warn(`[GLTF] Failed to load from ${currentUrl}:`, error);
      loadAttemptIndex++;
      tryLoadModel();
    }
  );
}

// Start loading
tryLoadModel();

// Fail-safe: if network hangs for 8s, always dismiss loading overlay
setTimeout(() => {
  if (!loadingScreen.classList.contains('hidden')) {
    console.log('[FailSafe] Dismissing loading screen.');
    hideLoadingScreen();
  }
}, 8000);

/* ============================================================
   COLLISION & MOVEMENT UPDATE LOOP
   ============================================================ */
function updatePlayer(delta) {
  if (cameraMode !== 'fps' || isTeleporting) return;

  let moveSpeed = keyStates.ShiftLeft || keyStates.ShiftRight ? 5.2 : 2.9;

  const damping = Math.exp(-4 * delta) - 1;
  playerVelocity.addScaledVector(playerVelocity, damping);

  if (!playerOnFloor) {
    playerVelocity.y -= GRAVITY * delta;
  }

  playerDirection.set(0, 0, 0);
  const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
  forward.y = 0;
  forward.normalize();

  const side = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
  side.y = 0;
  side.normalize();

  if (keyStates.KeyW || keyStates.ArrowUp) playerDirection.add(forward);
  if (keyStates.KeyS || keyStates.ArrowDown) playerDirection.sub(forward);
  if (keyStates.KeyD || keyStates.ArrowRight) playerDirection.add(side);
  if (keyStates.KeyA || keyStates.ArrowLeft) playerDirection.sub(side);

  if (playerDirection.lengthSq() > 0.001) {
    playerDirection.normalize();
    playerVelocity.addScaledVector(playerDirection, moveSpeed * delta * 20);
    
    if (playerOnFloor && Math.random() < 0.05) {
      sfx.playStep();
    }
  }

  if (playerOnFloor && keyStates.Space) {
    playerVelocity.y = 7.5;
    playerOnFloor = false;
  }

  const deltaVector = playerVelocity.clone().multiplyScalar(delta);
  playerCapsule.translate(deltaVector);

  playerOnFloor = false;
  if (colliderMesh && bvhCollider) {
    const tempBox = new THREE.Box3();

    bvhCollider.shapecast({
      intersectsBounds: box => box.intersectsBox(tempBox.setFromCenterAndSize(
        playerCapsule.getCenter(new THREE.Vector3()),
        new THREE.Vector3(playerCapsule.radius * 2, playerCapsule.radius * 2 + 1.0, playerCapsule.radius * 2)
      )),
      intersectsTriangle: tri => {
        const triPoint = new THREE.Vector3();
        const capsulePoint = new THREE.Vector3();

        const distanceSq = tri.closestPointToSegment(playerCapsule, capsulePoint, triPoint);
        const radius = playerCapsule.radius;

        if (distanceSq < radius * radius) {
          const depth = radius - Math.sqrt(distanceSq);
          const normal = capsulePoint.clone().sub(triPoint).normalize();

          if (normal.y > 0.55) {
            playerOnFloor = true;
          }

          playerCapsule.translate(normal.multiplyScalar(depth));
        }
      }
    });
  }

  if (playerCapsule.start.y < 0.35) {
    playerCapsule.start.y = 0.35;
    playerCapsule.end.y = 1.35;
    playerVelocity.y = 0;
    playerOnFloor = true;
  }

  playerCapsule.start.x = THREE.MathUtils.clamp(playerCapsule.start.x, -15, 15);
  playerCapsule.end.x = THREE.MathUtils.clamp(playerCapsule.end.x, -15, 15);
  playerCapsule.start.z = THREE.MathUtils.clamp(playerCapsule.start.z, -10, 15);
  playerCapsule.end.z = THREE.MathUtils.clamp(playerCapsule.end.z, -10, 15);

  camera.position.copy(playerCapsule.end).add(new THREE.Vector3(0, 0.25, 0));
}

/* ============================================================
   HOTSPOT PROJECTION & INTERACTION RAYCASTING
   ============================================================ */
const screenPos = new THREE.Vector3();

function updateHotspots() {
  let closestDist = Infinity;
  let hoveredHotspot = null;

  hotspotElements.forEach(({ el, data }) => {
    screenPos.copy(data.worldPos);
    
    const dist = camera.position.distanceTo(data.worldPos);
    screenPos.project(camera);

    const isBehind = screenPos.z > 1.0;
    const isOutOfView = Math.abs(screenPos.x) > 1.1 || Math.abs(screenPos.y) > 1.1;

    if (isBehind || isOutOfView || dist > 12.0) {
      el.style.display = 'none';
    } else {
      el.style.display = 'flex';
      const x = (screenPos.x * 0.5 + 0.5) * window.innerWidth;
      const y = (-(screenPos.y * 0.5) + 0.5) * window.innerHeight;
      el.style.left = `${x}px`;
      el.style.top = `${y}px`;

      const scale = THREE.MathUtils.clamp(1.0 - (dist - 1.5) * 0.08, 0.65, 1.1);
      el.style.transform = `translate(-50%, -50%) scale(${scale})`;

      const distFromCenter = Math.hypot(screenPos.x, screenPos.y);
      if (distFromCenter < 0.22 && dist < 5.0 && dist < closestDist) {
        closestDist = dist;
        hoveredHotspot = data;
      }
    }
  });

  activeHotspot = hoveredHotspot;
  if (activeHotspot) {
    reticle.classList.add('active');
    interactHint.classList.remove('hidden');
    interactText.textContent = activeHotspot.title;
  } else {
    reticle.classList.remove('active');
    interactHint.classList.add('hidden');
  }
}

/* ============================================================
   ANIMATION & RENDER LOOP
   ============================================================ */
const clock = new THREE.Clock();
let frameCount = 0;
let lastFpsTime = performance.now();

function animate() {
  requestAnimationFrame(animate);

  const delta = Math.min(clock.getDelta(), 0.1);
  const now = performance.now();

  frameCount++;
  if (now - lastFpsTime >= 1000) {
    fpsCounter.textContent = `${frameCount} FPS`;
    frameCount = 0;
    lastFpsTime = now;
  }

  if (isTeleporting) {
    teleportProgress += delta * 2.2;
    const t = THREE.MathUtils.smoothstep(teleportProgress, 0, 1);
    camera.position.lerpVectors(teleportStartPos, teleportTargetPos, t);
    
    const currentLook = new THREE.Vector3().lerpVectors(teleportStartLook, teleportTargetLook, t);
    camera.lookAt(currentLook);

    if (teleportProgress >= 1) {
      isTeleporting = false;
      camera.position.copy(teleportTargetPos);
      if (cameraMode === 'orbit') {
        orbitControls.target.copy(teleportTargetLook);
      }
    }
  } else {
    updatePlayer(delta);
    if (cameraMode === 'orbit') {
      orbitControls.update();
    }
  }

  updateHotspots();

  const time = clock.getElapsedTime();
  spotLeft.position.y = 3.2 + Math.sin(time * 0.8) * 0.05;
  spotRight.position.y = 3.2 + Math.cos(time * 0.8) * 0.05;

  renderer.render(scene, camera);
}
animate();

/* ============================================================
   WINDOW RESIZE HANDLER
   ============================================================ */
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});
