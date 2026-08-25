import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

/* ============================================================
   SCENE, CAMERA, RENDERER INITIALIZATION
   ============================================================ */
const container = document.getElementById('canvas-container');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0f1d);
scene.fog = new THREE.FogExp2(0x0a0f1d, 0.018);

// Standard Human Eye Height = 1.6m
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.05, 100);

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.45;
renderer.outputColorSpace = THREE.SRGBColorSpace;
container.appendChild(renderer.domElement);

/* ============================================================
   EXHIBITION HALL LIGHTING & ENVIRONMENT
   ============================================================ */
const ambientLight = new THREE.AmbientLight(0xffffff, 1.5);
scene.add(ambientLight);

const keyLight = new THREE.DirectionalLight(0xffffff, 3.0);
keyLight.position.set(6, 12, 8);
keyLight.castShadow = true;
keyLight.shadow.mapSize.width = 2048;
keyLight.shadow.mapSize.height = 2048;
keyLight.shadow.camera.near = 0.5;
keyLight.shadow.camera.far = 35;
keyLight.shadow.camera.left = -9;
keyLight.shadow.camera.right = 9;
keyLight.shadow.camera.top = 9;
keyLight.shadow.camera.bottom = -7;
keyLight.shadow.bias = -0.0001;
keyLight.shadow.normalBias = 0.02;
scene.add(keyLight);

const fillLight = new THREE.DirectionalLight(0x5599ff, 2.0);
fillLight.position.set(-7, 9, -4);
scene.add(fillLight);

// Truss Spotlights
function createSpotlight(x, y, z, targetX, targetY, targetZ, color = 0xffffff, intensity = 9.0) {
  const spot = new THREE.SpotLight(color, intensity, 16, Math.PI / 3, 0.35, 1.2);
  spot.position.set(x, y, z);
  spot.target.position.set(targetX, targetY, targetZ);
  scene.add(spot);
  scene.add(spot.target);
  return spot;
}

const spotLeft = createSpotlight(-1.0, 3.5, 0.5, -1.0, 0.85, -0.29, 0xffffff, 9.0);
const spotRight = createSpotlight(1.55, 3.5, 0.5, 1.55, 0.85, -0.29, 0xffffff, 9.0);
const spotLogo = createSpotlight(-1.5, 3.0, 0.5, -1.55, 1.8, -0.74, 0x00d2ff, 7.0);

// Point lights
const pointLeft = new THREE.PointLight(0x00d2ff, 2.5, 5);
pointLeft.position.set(-1.0, 1.2, 0.5);
scene.add(pointLeft);

const pointRight = new THREE.PointLight(0x00d2ff, 2.5, 5);
pointRight.position.set(1.55, 1.2, 0.5);
scene.add(pointRight);

// Exhibition Hall Floor
const hallFloorGeo = new THREE.PlaneGeometry(100, 100, 100, 100);
const hallFloorMat = new THREE.MeshStandardMaterial({
  color: 0x0d1322,
  roughness: 0.25,
  metalness: 0.5,
});
const hallFloor = new THREE.Mesh(hallFloorGeo, hallFloorMat);
hallFloor.rotation.x = -Math.PI / 2;
hallFloor.position.y = -0.001;
hallFloor.receiveShadow = true;
scene.add(hallFloor);

const gridHelper = new THREE.GridHelper(100, 100, 0x00d2ff, 0x182438);
gridHelper.position.y = 0.001;
scene.add(gridHelper);

/* ============================================================
   FIRST-PERSON CONTROLLER & MOVEMENT
   ============================================================ */
const player = {
  pos: new THREE.Vector3(0, 1.6, 4.8),
  velocity: new THREE.Vector3(0, 0, 0),
  pitch: -0.04,
  yaw: 0.0,
  radius: 0.35,
  height: 1.6,
  onGround: true
};

function updateCamera() {
  if (isNaN(player.pos.x) || isNaN(player.pos.y) || isNaN(player.pos.z)) {
    player.pos.set(0, 1.6, 4.8);
  }
  if (isNaN(player.pitch)) player.pitch = 0;
  if (isNaN(player.yaw)) player.yaw = 0;

  const euler = new THREE.Euler(player.pitch, player.yaw, 0, 'YXZ');
  camera.quaternion.setFromEuler(euler);
  camera.position.copy(player.pos);
}

function resetPlayerView() {
  player.pos.set(0, 1.6, 4.8);
  player.velocity.set(0, 0, 0);
  player.pitch = -0.04;
  player.yaw = 0.0;
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
    player.yaw -= e.movementX * 0.0025;
    player.pitch -= e.movementY * 0.0025;
    player.pitch = Math.max(-Math.PI / 2 + 0.05, Math.min(Math.PI / 2 - 0.05, player.pitch));
    updateCamera();
  } else if (isDragging) {
    const deltaX = e.clientX - mouseStartX;
    const deltaY = e.clientY - mouseStartY;
    mouseStartX = e.clientX;
    mouseStartY = e.clientY;

    player.yaw -= deltaX * 0.0035;
    player.pitch -= deltaY * 0.0035;
    player.pitch = Math.max(-Math.PI / 2 + 0.05, Math.min(Math.PI / 2 - 0.05, player.pitch));
    updateCamera();
  }
});

renderer.domElement.addEventListener('dblclick', () => {
  renderer.domElement.requestPointerLock().catch(() => {});
});

document.addEventListener('pointerlockchange', () => {
  isPointerLocked = (document.pointerLockElement === renderer.domElement);
});

// Touch controls for mobile
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

    player.yaw -= deltaX * 0.004;
    player.pitch -= deltaY * 0.004;
    player.pitch = Math.max(-Math.PI / 2 + 0.05, Math.min(Math.PI / 2 - 0.05, player.pitch));
    updateCamera();
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
   COLLISION BOXES (PODIUMS & BACKDROP WALL)
   ============================================================ */
const obstacles = [
  { minX: -2.15, maxX: 0.15, minZ: -0.80, maxZ: 0.35, minY: 0, maxY: 1.0 },
  { minX: 0.95, maxX: 2.15, minZ: -0.80, maxZ: 0.35, minY: 0, maxY: 1.0 },
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
  }, 600);
}

/* ============================================================
   LOAD 3D GLTF MODEL
   ============================================================ */
const gltfLoader = new GLTFLoader();
const candidateUrls = [
  './booth.glb',
  'booth.glb',
  '/scenengine/booth.glb'
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
          child.castShadow = true;
          child.receiveShadow = true;

          if (child.material) {
            child.material.side = THREE.DoubleSide;
            child.material.roughness = Math.max(0.15, child.material.roughness || 0.35);
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
              child.material.emissiveIntensity = 2.5;
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
   PHYSICS & MOVEMENT LOOP
   ============================================================ */
const moveDir = new THREE.Vector3();
const forwardVec = new THREE.Vector3();
const sideVec = new THREE.Vector3();

function updatePlayerPhysics(delta) {
  const speed = keys.sprint ? 5.5 : 3.0;

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
    player.velocity.y = 7.0;
    player.onGround = false;
  }

  player.pos.x += player.velocity.x * delta;
  player.pos.y += player.velocity.y * delta;
  player.pos.z += player.velocity.z * delta;

  if (player.pos.y <= 1.6) {
    player.pos.y = 1.6;
    player.velocity.y = 0;
    player.onGround = true;
  }

  resolveCollisions(player.pos, player.radius);

  player.pos.x = THREE.MathUtils.clamp(player.pos.x, -30, 30);
  player.pos.z = THREE.MathUtils.clamp(player.pos.z, -15, 30);

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

  const time = clock.getElapsedTime();
  spotLeft.position.y = 3.5 + Math.sin(time * 0.8) * 0.05;
  spotRight.position.y = 3.5 + Math.cos(time * 0.8) * 0.05;

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
