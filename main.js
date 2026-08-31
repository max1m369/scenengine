import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

/* ============================================================
   SCENE, CAMERA, RENDERER INITIALIZATION
   ============================================================ */
const container = document.getElementById('canvas-container');
const scene = new THREE.Scene();

// Exact studio neutral gray background from Blender Cycles viewport
const STUDIO_BG_COLOR = 0x888d94;
const STUDIO_FLOOR_COLOR = 0x9ea3ab;

scene.background = new THREE.Color(STUDIO_BG_COLOR);
scene.fog = new THREE.FogExp2(STUDIO_BG_COLOR, 0.012);

// Standard Human Eye Height = 1.6m, architectural FOV 48
const camera = new THREE.PerspectiveCamera(48, window.innerWidth / window.innerHeight, 0.05, 100);

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.outputColorSpace = THREE.SRGBColorSpace;
container.appendChild(renderer.domElement);

/* ============================================================
   STUDIO LIGHTING SETUP (OPTIMIZED BLENDER 2-SOFTBOX SETUP)
   ============================================================ */
// Soft ambient illumination
const ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
scene.add(ambientLight);

// Left Studio Softbox (Primary Key Shadow Light)
const leftSoftbox = new THREE.DirectionalLight(0xfffaee, 1.4);
leftSoftbox.position.set(-5.5, 5.5, 4.5);
leftSoftbox.castShadow = true;
leftSoftbox.shadow.mapSize.width = 1024;
leftSoftbox.shadow.mapSize.height = 1024;
leftSoftbox.shadow.camera.near = 1.0;
leftSoftbox.shadow.camera.far = 20;
leftSoftbox.shadow.camera.left = -5.5;
leftSoftbox.shadow.camera.right = 5.5;
leftSoftbox.shadow.camera.top = 5.5;
leftSoftbox.shadow.camera.bottom = -3.5;
leftSoftbox.shadow.bias = -0.0001;
leftSoftbox.shadow.normalBias = 0.02;
leftSoftbox.shadow.radius = 2.0;
scene.add(leftSoftbox);

// Right Studio Softbox (Fill Light - No redundant shadow pass for maximum FPS)
const rightSoftbox = new THREE.DirectionalLight(0xf0f5ff, 1.4);
rightSoftbox.position.set(5.5, 5.5, 4.5);
rightSoftbox.castShadow = false;
scene.add(rightSoftbox);

// Front Fill Light
const frontLight = new THREE.DirectionalLight(0xffffff, 0.7);
frontLight.position.set(0, 5.0, 6.0);
scene.add(frontLight);

// Top/Back Rim Light
const rimLight = new THREE.DirectionalLight(0xffffff, 0.5);
rimLight.position.set(0, 7.0, -3.0);
scene.add(rimLight);

// 7 Top Conical Spotlights on Truss Beam
const spotPositions = [-1.8, -1.2, -0.6, 0.0, 0.6, 1.2, 1.8];
spotPositions.forEach((x) => {
  const spot = new THREE.SpotLight(0xffffff, 2.4, 7.0, Math.PI / 4, 0.55, 1.2);
  spot.position.set(x, 2.9, 0.35);
  spot.target.position.set(x, 0.85, -0.29);
  scene.add(spot);
  scene.add(spot.target);
});

// Smooth studio showroom floor (NO GRID)
const studioFloorGeo = new THREE.PlaneGeometry(80, 80, 1, 1);
const studioFloorMat = new THREE.MeshStandardMaterial({
  color: STUDIO_FLOOR_COLOR,
  roughness: 0.35,
  metalness: 0.12,
});
const studioFloor = new THREE.Mesh(studioFloorGeo, studioFloorMat);
studioFloor.rotation.x = -Math.PI / 2;
studioFloor.position.y = -0.001;
studioFloor.receiveShadow = true;
scene.add(studioFloor);

/* ============================================================
   FIRST-PERSON CONTROLLER & STRICT VISITOR BOUNDS
   ============================================================ */
const player = {
  pos: new THREE.Vector3(0, 1.55, 4.3),
  velocity: new THREE.Vector3(0, 0, 0),
  pitch: -0.03,
  yaw: 0.0,
  targetPitch: -0.03,
  targetYaw: 0.0,
  radius: 0.35,
  height: 1.55,
  onGround: true
};

function updateCamera() {
  if (isNaN(player.pos.x) || isNaN(player.pos.y) || isNaN(player.pos.z)) {
    player.pos.set(0, 1.55, 4.3);
  }
  if (isNaN(player.pitch)) player.pitch = 0;
  if (isNaN(player.yaw)) player.yaw = 0;

  const euler = new THREE.Euler(player.pitch, player.yaw, 0, 'YXZ');
  camera.quaternion.setFromEuler(euler);
  camera.position.copy(player.pos);
}

function resetPlayerView() {
  player.pos.set(0, 1.55, 4.3);
  player.velocity.set(0, 0, 0);
  player.pitch = -0.03;
  player.yaw = 0.0;
  player.targetPitch = -0.03;
  player.targetYaw = 0.0;
  updateCamera();
}

resetPlayerView();

// Mouse Look (Drag or Pointer Lock)
let isPointerLocked = false;
let isDragging = false;
let mouseStartX = 0;
let mouseStartY = 0;

renderer.domElement.addEventListener('mousedown', (e) => {
  if (e.button === 0) {
    isDragging = true;
    mouseStartX = e.clientX;
    mouseStartY = e.clientY;
  }
});

window.addEventListener('mouseup', () => {
  isDragging = false;
});

window.addEventListener('mousemove', (e) => {
  if (isPointerLocked) {
    player.targetYaw -= e.movementX * 0.0016;
    player.targetPitch -= e.movementY * 0.0016;
    player.targetPitch = Math.max(-Math.PI / 2 + 0.08, Math.min(Math.PI / 2 - 0.08, player.targetPitch));
  } else if (isDragging) {
    const deltaX = e.clientX - mouseStartX;
    const deltaY = e.clientY - mouseStartY;
    mouseStartX = e.clientX;
    mouseStartY = e.clientY;

    player.targetYaw -= deltaX * 0.0020;
    player.targetPitch -= deltaY * 0.0020;
    player.targetPitch = Math.max(-Math.PI / 2 + 0.08, Math.min(Math.PI / 2 - 0.08, player.targetPitch));
  }
});

renderer.domElement.addEventListener('dblclick', () => {
  renderer.domElement.requestPointerLock().catch(() => {});
});

document.addEventListener('pointerlockchange', () => {
  isPointerLocked = (document.pointerLockElement === renderer.domElement);
});

// Touch controls for mobile/tablet
let touchStartX = 0;
let touchStartY = 0;
renderer.domElement.addEventListener('touchstart', (e) => {
  if (e.touches.length === 1) {
    isDragging = true;
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
  }
}, { passive: true });

renderer.domElement.addEventListener('touchmove', (e) => {
  if (isDragging && e.touches.length === 1) {
    const deltaX = e.touches[0].clientX - touchStartX;
    const deltaY = e.touches[0].clientY - touchStartY;
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;

    player.targetYaw -= deltaX * 0.0022;
    player.targetPitch -= deltaY * 0.0022;
    player.targetPitch = Math.max(-Math.PI / 2 + 0.08, Math.min(Math.PI / 2 - 0.08, player.targetPitch));
  }
}, { passive: true });

window.addEventListener('touchend', () => {
  isDragging = false;
});

// Keyboard Input (WASD / ЦФЫВ / Arrows)
const keys = {
  forward: false,
  backward: false,
  left: false,
  right: false,
  sprint: false,
  jump: false
};

window.addEventListener('keydown', (e) => {
  const code = e.code;
  const key = e.key ? e.key.toLowerCase() : '';

  if (code === 'KeyW' || key === 'w' || key === 'ц' || code === 'ArrowUp') keys.forward = true;
  if (code === 'KeyS' || key === 's' || key === 'ы' || code === 'ArrowDown') keys.backward = true;
  if (code === 'KeyA' || key === 'a' || key === 'ф' || code === 'ArrowLeft') keys.left = true;
  if (code === 'KeyD' || key === 'd' || key === 'в' || code === 'ArrowRight') keys.right = true;
  if (code === 'ShiftLeft' || code === 'ShiftRight' || e.shiftKey) keys.sprint = true;
  if (code === 'Space' || key === ' ') keys.jump = true;

  if (code === 'KeyR' || key === 'r' || key === 'к') {
    resetPlayerView();
  }
});

window.addEventListener('keyup', (e) => {
  const code = e.code;
  const key = e.key ? e.key.toLowerCase() : '';

  if (code === 'KeyW' || key === 'w' || key === 'ц' || code === 'ArrowUp') keys.forward = false;
  if (code === 'KeyS' || key === 's' || key === 'ы' || code === 'ArrowDown') keys.backward = false;
  if (code === 'KeyA' || key === 'a' || key === 'ф' || code === 'ArrowLeft') keys.left = false;
  if (code === 'KeyD' || key === 'd' || key === 'в' || code === 'ArrowRight') keys.right = false;
  if (code === 'ShiftLeft' || code === 'ShiftRight' || !e.shiftKey) keys.sprint = false;
  if (code === 'Space' || key === ' ') keys.jump = false;
});

/* ============================================================
   STAND OBSTACLE COLLISION BOXES
   ============================================================ */
const obstacles = [
  // Left Podium
  { minX: -2.15, maxX: 0.15, minZ: -0.80, maxZ: 0.35, minY: 0, maxY: 1.0 },
  // Right Podium
  { minX: 0.95, maxX: 2.15, minZ: -0.80, maxZ: 0.35, minY: 0, maxY: 1.0 },
  // Backdrop Wall
  { minX: -2.80, maxX: 2.80, minZ: -1.20, maxZ: -0.65, minY: 0, maxY: 3.0 }
];

function resolveCollisions(pos, radius) {
  for (const obs of obstacles) {
    if (pos.y - player.height + 0.2 < obs.maxY && pos.y > obs.minY) {
      const expandedMinX = obs.minX - radius;
      const expandedMaxX = obs.maxX + radius;
      const expandedMinZ = obs.minZ - radius;
      const expandedMaxZ = obs.maxZ + radius;

      if (pos.x > expandedMinX && pos.x < expandedMaxX && pos.z > expandedMinZ && pos.z < expandedMaxZ) {
        const dLeft = pos.x - expandedMinX;
        const dRight = expandedMaxX - pos.x;
        const dBack = pos.z - expandedMinZ;
        const dFront = expandedMaxZ - pos.z;

        const minOverlap = Math.min(dLeft, dRight, dBack, dFront);

        if (minOverlap === dLeft) pos.x = expandedMinX;
        else if (minOverlap === dRight) pos.x = expandedMaxX;
        else if (minOverlap === dFront) pos.z = expandedMaxZ;
        else if (minOverlap === dBack) pos.z = expandedMinZ;
      }
    }
  }
}

/* ============================================================
   UI BUTTONS & TOP PROGRESS BAR
   ============================================================ */
const topLoadingBar = document.getElementById('top-loading-bar');
const progressBar = document.getElementById('progress-bar');
const loadingStatus = document.getElementById('loading-status');
const fpsCounter = document.getElementById('fps-counter');
const resetCamBtn = document.getElementById('reset-cam-btn');
const fullscreenBtn = document.getElementById('fullscreen-btn');

if (resetCamBtn) {
  resetCamBtn.addEventListener('click', resetPlayerView);
}

if (fullscreenBtn) {
  fullscreenBtn.addEventListener('click', () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  });
}

function hideLoadingBar() {
  if (progressBar) progressBar.style.width = '100%';
  if (loadingStatus) loadingStatus.textContent = '⚡ Стенд загружен!';

  setTimeout(() => {
    if (topLoadingBar) topLoadingBar.classList.add('hidden');
  }, 400);
}

/* ============================================================
   LOAD 3D GLTF MODEL & REFINE PBR MATERIALS
   ============================================================ */
const gltfLoader = new GLTFLoader();
const cacheBust = Date.now();
const candidateUrls = [
  `./booth.glb?v=${cacheBust}`,
  `booth.glb?v=${cacheBust}`,
  `/scenengine/booth.glb?v=${cacheBust}`
];

let urlIndex = 0;

function tryLoad() {
  if (urlIndex >= candidateUrls.length) {
    console.warn('[GLTF] All URLs exhausted.');
    hideLoadingBar();
    return;
  }

  const currentUrl = candidateUrls[urlIndex];
  console.log(`[GLTF] Loading model from: ${currentUrl}`);

  gltfLoader.load(
    currentUrl,
    (gltf) => {
      console.log('[GLTF] Model successfully loaded!');
      const model = gltf.scene;
      scene.add(model);

      model.traverse((child) => {
        if (child.isMesh) {
          child.frustumCulled = true;
          const objName = (child.name || '').toLowerCase();
          const isMainStructure = objName.includes('podium') || objName.includes('wall') || objName.includes('housing') || objName.includes('cover') || objName.includes('motor') || objName.includes('gearbox') || objName.includes('stator');
          child.castShadow = isMainStructure;
          child.receiveShadow = true;

          if (child.material) {
            const matName = (child.material.name || '').toLowerCase();
            const isThinGraphic = !!child.material.map || objName.includes('graphic') || objName.includes('print') || objName.includes('canvas') || objName.includes('logo') || objName.includes('slogan') || objName.includes('plate') || objName.includes('plaque');
            child.material.side = isThinGraphic ? THREE.DoubleSide : THREE.FrontSide;

            // PBR adjustments strictly matching cycles_render.png
            if (!child.material.map) {
              if (matName.includes('copper')) {
                child.material.metalness = 0.90;
                child.material.roughness = 0.25;
                child.material.color = new THREE.Color(0xd67e48);
              } else if (matName.includes('darksteel') || matName.includes('motordark') || matName.includes('gearboxdark')) {
                child.material.metalness = 0.85;
                child.material.roughness = 0.35;
              } else if (matName.includes('steel') || matName.includes('metallic') || matName.includes('inverter')) {
                child.material.metalness = 0.90;
                child.material.roughness = 0.22;
              } else if (matName.includes('podiumnavy')) {
                child.material.color = new THREE.Color(0x053a78);
                child.material.roughness = 0.38;
                child.material.metalness = 0.08;
              } else if (matName.includes('podiumtop') || matName.includes('floor')) {
                child.material.color = new THREE.Color(0xf4f6f8);
                child.material.roughness = 0.25;
                child.material.metalness = 0.04;
              } else if (matName.includes('wall')) {
                child.material.color = new THREE.Color(0xf0f2f5);
                child.material.roughness = 0.55;
              }
            }

            if (matName.includes('supportglass')) {
              child.material.transparent = true;
              child.material.opacity = 0.35;
              child.material.roughness = 0.05;
              child.material.metalness = 0.1;
            } else if (matName.includes('glowwhite') || objName.includes('led_strip')) {
              child.material.emissive = new THREE.Color(0xffffff);
              child.material.emissiveIntensity = 2.0;
            } else if (matName.includes('glowblue') || objName.includes('underglow')) {
              child.material.emissive = new THREE.Color(0x00d2ff);
              child.material.emissiveIntensity = 1.2;
            }
          }
        }
      });

      hideLoadingBar();
    },
    (xhr) => {
      if (xhr.lengthComputable && xhr.total > 0) {
        const percent = Math.min(99, Math.round((xhr.loaded / xhr.total) * 100));
        if (progressBar) progressBar.style.width = percent + '%';
        if (loadingStatus) loadingStatus.textContent = `⚡ Загрузка стенда (${percent}%)...`;
      } else if (xhr.loaded > 0) {
        const mb = (xhr.loaded / (1024 * 1024)).toFixed(1);
        if (loadingStatus) loadingStatus.textContent = `⚡ Загрузка: ${mb} МБ...`;
        if (progressBar) progressBar.style.width = Math.min(95, Math.round((xhr.loaded / 10474152) * 100)) + '%';
      }
    },
    (error) => {
      console.warn(`[GLTF] Failed loading from ${currentUrl}:`, error);
      urlIndex++;
      tryLoad();
    }
  );
}

tryLoad();

/* ============================================================
   PHYSICS & MOVEMENT LOOP (WITH STRICT VISITATION BOUNDARIES)
   ============================================================ */
const moveDir = new THREE.Vector3();
const forwardVec = new THREE.Vector3();
const sideVec = new THREE.Vector3();

function updatePlayerPhysics(delta) {
  const speed = keys.sprint ? 4.5 : 2.8;

  const damping = Math.exp(-8 * delta) - 1;
  player.velocity.x += player.velocity.x * damping;
  player.velocity.z += player.velocity.z * damping;

  forwardVec.set(-Math.sin(player.yaw), 0, -Math.cos(player.yaw));
  sideVec.set(Math.cos(player.yaw), 0, -Math.sin(player.yaw));

  moveDir.set(0, 0, 0);
  if (keys.forward) moveDir.add(forwardVec);
  if (keys.backward) moveDir.sub(forwardVec);
  if (keys.right) moveDir.add(sideVec);
  if (keys.left) moveDir.sub(sideVec);

  if (moveDir.lengthSq() > 0.001) {
    moveDir.normalize();
    player.velocity.x += moveDir.x * speed * delta * 30;
    player.velocity.z += moveDir.z * speed * delta * 30;
  }

  if (!player.onGround) {
    player.velocity.y -= 25 * delta;
  } else if (keys.jump) {
    player.velocity.y = 6.0;
    player.onGround = false;
  }

  player.pos.x += player.velocity.x * delta;
  player.pos.y += player.velocity.y * delta;
  player.pos.z += player.velocity.z * delta;

  if (player.pos.y <= 1.55) {
    player.pos.y = 1.55;
    player.velocity.y = 0;
    player.onGround = true;
  }

  resolveCollisions(player.pos, player.radius);

  // STRICT VISITOR BOUNDS: No walking off into void or behind wall
  player.pos.x = THREE.MathUtils.clamp(player.pos.x, -3.8, 3.8); // Left/right perimeter
  player.pos.z = THREE.MathUtils.clamp(player.pos.z, 0.8, 5.8);  // In front of stand only

  // Smooth camera rotation interpolation (buttery fluid 60-120fps)
  player.yaw = THREE.MathUtils.lerp(player.yaw, player.targetYaw, 0.25);
  player.pitch = THREE.MathUtils.lerp(player.pitch, player.targetPitch, 0.25);

  updateCamera();
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
    if (fpsCounter) fpsCounter.textContent = `${frameCount} FPS`;
    frameCount = 0;
    lastFpsTime = now;
  }

  updatePlayerPhysics(delta);

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
