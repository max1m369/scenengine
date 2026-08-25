import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { computeBoundsTree, disposeBoundsTree, acceleratedRaycast, MeshBVH, StaticGeometryGenerator } from 'three-mesh-bvh';
import { Capsule } from 'three/examples/jsm/math/Capsule.js';

// Setup accelerated BVH
THREE.BufferGeometry.prototype.computeBoundsTree = computeBoundsTree;
THREE.BufferGeometry.prototype.disposeBoundsTree = disposeBoundsTree;
THREE.Mesh.prototype.raycast = acceleratedRaycast;

/* ============================================================
   SCENE, CAMERA, RENDERER INITIALIZATION
   ============================================================ */
const container = document.getElementById('canvas-container');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0e1422);
scene.fog = new THREE.FogExp2(0x0e1422, 0.02);

// Standard Human Eye Height = 1.6m
const camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.05, 100);

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.4;
renderer.outputColorSpace = THREE.SRGBColorSpace;
container.appendChild(renderer.domElement);

/* ============================================================
   EXHIBITION HALL ENVIRONMENT & LIGHTING
   ============================================================ */
const ambientLight = new THREE.AmbientLight(0xffffff, 1.4);
scene.add(ambientLight);

const keyLight = new THREE.DirectionalLight(0xffffff, 2.8);
keyLight.position.set(5, 10, 8);
keyLight.castShadow = true;
keyLight.shadow.mapSize.width = 2048;
keyLight.shadow.mapSize.height = 2048;
keyLight.shadow.camera.near = 0.5;
keyLight.shadow.camera.far = 30;
keyLight.shadow.camera.left = -8;
keyLight.shadow.camera.right = 8;
keyLight.shadow.camera.top = 8;
keyLight.shadow.camera.bottom = -6;
keyLight.shadow.bias = -0.0001;
keyLight.shadow.normalBias = 0.02;
scene.add(keyLight);

const fillLight = new THREE.DirectionalLight(0x66aaff, 1.8);
fillLight.position.set(-6, 8, -4);
scene.add(fillLight);

// Truss Spotlights
function createSpotlight(x, y, z, targetX, targetY, targetZ, color = 0xffffff, intensity = 8.0) {
  const spot = new THREE.SpotLight(color, intensity, 15, Math.PI / 3, 0.35, 1.2);
  spot.position.set(x, y, z);
  spot.target.position.set(targetX, targetY, targetZ);
  scene.add(spot);
  scene.add(spot.target);
  return spot;
}

const spotLeft = createSpotlight(-1.0, 3.5, 0.5, -1.0, 0.85, -0.29, 0xffffff, 8.0);
const spotRight = createSpotlight(1.55, 3.5, 0.5, 1.55, 0.85, -0.29, 0xffffff, 8.0);
const spotLogo = createSpotlight(-1.5, 3.0, 0.5, -1.55, 1.8, -0.74, 0x00d2ff, 6.0);

// Point lights
const pointLeft = new THREE.PointLight(0x00d2ff, 2.0, 5);
pointLeft.position.set(-1.0, 1.2, 0.5);
scene.add(pointLeft);

const pointRight = new THREE.PointLight(0x00d2ff, 2.0, 5);
pointRight.position.set(1.55, 1.2, 0.5);
scene.add(pointRight);

// Exhibition Hall Floor
const hallFloorGeo = new THREE.PlaneGeometry(80, 80, 80, 80);
const hallFloorMat = new THREE.MeshStandardMaterial({
  color: 0x111728,
  roughness: 0.2,
  metalness: 0.6,
});
const hallFloor = new THREE.Mesh(hallFloorGeo, hallFloorMat);
hallFloor.rotation.x = -Math.PI / 2;
hallFloor.position.y = -0.001;
hallFloor.receiveShadow = true;
scene.add(hallFloor);

const gridHelper = new THREE.GridHelper(80, 80, 0x00d2ff, 0x1f2b42);
gridHelper.position.y = 0.001;
scene.add(gridHelper);

/* ============================================================
   FIRST-PERSON PLAYER & COLLISION ENGINE
   ============================================================ */
const GRAVITY = 25;
const playerCapsule = new Capsule(
  new THREE.Vector3(0, 0.35, 5.0),
  new THREE.Vector3(0, 1.35, 5.0),
  0.35
);

let playerVelocity = new THREE.Vector3();
let playerDirection = new THREE.Vector3();
let playerOnFloor = false;
let colliderMesh = null;
let bvhCollider = null;

// Camera Orientation (Pitch / Yaw)
let cameraPitch = -0.05;
let cameraYaw = 0.0;

function resetCamera() {
  playerCapsule.start.set(0, 0.35, 5.0);
  playerCapsule.end.set(0, 1.35, 5.0);
  playerVelocity.set(0, 0, 0);
  cameraPitch = -0.05;
  cameraYaw = 0.0;
  updateCameraRotation();
  camera.position.set(0, 1.6, 5.0);
}

function updateCameraRotation() {
  const euler = new THREE.Euler(cameraPitch, cameraYaw, 0, 'YXZ');
  camera.quaternion.setFromEuler(euler);
}

resetCamera();

// Free Mouse Drag Look (Left Click + Drag)
let isDraggingMouse = false;
let mouseStartX = 0;
let mouseStartY = 0;

renderer.domElement.addEventListener('mousedown', (e) => {
  isDraggingMouse = true;
  mouseStartX = e.clientX;
  mouseStartY = e.clientY;
});

window.addEventListener('mouseup', () => {
  isDraggingMouse = false;
});

window.addEventListener('mousemove', (e) => {
  if (isDraggingMouse) {
    const deltaX = e.clientX - mouseStartX;
    const deltaY = e.clientY - mouseStartY;
    mouseStartX = e.clientX;
    mouseStartY = e.clientY;

    cameraYaw -= deltaX * 0.0035;
    cameraPitch -= deltaY * 0.0035;
    cameraPitch = Math.max(-Math.PI / 2 + 0.05, Math.min(Math.PI / 2 - 0.05, cameraPitch));

    updateCameraRotation();
  }
});

// Touch controls for mobile/tablet
let touchStartX = 0;
let touchStartY = 0;
renderer.domElement.addEventListener('touchstart', (e) => {
  if (e.touches.length === 1) {
    isDraggingMouse = true;
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
  }
}, { passive: true });

renderer.domElement.addEventListener('touchmove', (e) => {
  if (isDraggingMouse && e.touches.length === 1) {
    const deltaX = e.touches[0].clientX - touchStartX;
    const deltaY = e.touches[0].clientY - touchStartY;
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;

    cameraYaw -= deltaX * 0.004;
    cameraPitch -= deltaY * 0.004;
    cameraPitch = Math.max(-Math.PI / 2 + 0.05, Math.min(Math.PI / 2 - 0.05, cameraPitch));

    updateCameraRotation();
  }
}, { passive: true });

window.addEventListener('touchend', () => {
  isDraggingMouse = false;
});

// Keyboard Input (English + Russian layout + Arrow keys)
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
   UI & BUTTON HANDLERS
   ============================================================ */
const loadingScreen = document.getElementById('loading-screen');
const progressBar = document.getElementById('progress-bar');
const loadingPercent = document.getElementById('loading-percent');
const loadingStatus = document.getElementById('loading-status');
const fpsCounter = document.getElementById('fps-counter');
const resetCamBtn = document.getElementById('reset-cam-btn');
const fullscreenBtn = document.getElementById('fullscreen-btn');

if (resetCamBtn) {
  resetCamBtn.addEventListener('click', () => {
    resetCamera();
  });
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

function hideLoadingScreen() {
  progressBar.style.width = '100%';
  loadingPercent.textContent = '100%';
  loadingStatus.textContent = 'Готово!';

  setTimeout(() => {
    loadingScreen.style.opacity = '0';
    setTimeout(() => {
      loadingScreen.classList.add('hidden');
    }, 400);
  }, 200);
}

/* ============================================================
   LOAD 3D GLTF MODEL & BUILD BVH COLLIDER
   ============================================================ */
const gltfLoader = new GLTFLoader();
const modelPath = './booth.glb';
console.log(`[GLTF] Loading exhibition model from: ${modelPath}`);

gltfLoader.load(
  modelPath,
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

    try {
      const staticGen = new StaticGeometryGenerator(model);
      staticGen.attributes = ['position'];
      const mergedGeometry = staticGen.generate();
      mergedGeometry.computeBoundsTree = computeBoundsTree;
      mergedGeometry.disposeBoundsTree = disposeBoundsTree;
      mergedGeometry.computeBoundsTree();
      
      colliderMesh = new THREE.Mesh(mergedGeometry);
      bvhCollider = mergedGeometry.boundsTree;
      console.log('[BVH] Collision tree successfully built.');
    } catch(err) {
      console.warn('[BVH] Collision tree notice:', err);
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
    console.error('[GLTF] Error loading model from primary path:', error);
    gltfLoader.load('/scenengine/booth.glb', (gltf2) => {
      scene.add(gltf2.scene);
      hideLoadingScreen();
    }, null, () => {
      hideLoadingScreen();
    });
  }
);

/* ============================================================
   COLLISION & MOVEMENT UPDATE LOOP
   ============================================================ */
function updatePlayer(delta) {
  const moveSpeed = keys.sprint ? 5.5 : 3.2;

  // Damping
  const damping = Math.exp(-7 * delta) - 1;
  playerVelocity.addScaledVector(playerVelocity, damping);

  // Gravity
  if (!playerOnFloor) {
    playerVelocity.y -= GRAVITY * delta;
  }

  // Direction vector from camera view
  playerDirection.set(0, 0, 0);
  const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
  forward.y = 0;
  forward.normalize();

  const side = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
  side.y = 0;
  side.normalize();

  if (keys.forward) playerDirection.add(forward);
  if (keys.backward) playerDirection.sub(forward);
  if (keys.right) playerDirection.add(side);
  if (keys.left) playerDirection.sub(side);

  if (playerDirection.lengthSq() > 0.001) {
    playerDirection.normalize();
    playerVelocity.addScaledVector(playerDirection, moveSpeed * delta * 25);
  }

  if (playerOnFloor && keys.jump) {
    playerVelocity.y = 7.5;
    playerOnFloor = false;
  }

  const deltaVector = playerVelocity.clone().multiplyScalar(delta);
  playerCapsule.translate(deltaVector);

  // BVH Collision Resolution against stand
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

  // Ground level
  if (playerCapsule.start.y < 0.35) {
    playerCapsule.start.y = 0.35;
    playerCapsule.end.y = 1.35;
    playerVelocity.y = 0;
    playerOnFloor = true;
  }

  // Pavilion boundaries
  playerCapsule.start.x = THREE.MathUtils.clamp(playerCapsule.start.x, -25, 25);
  playerCapsule.end.x = THREE.MathUtils.clamp(playerCapsule.end.x, -25, 25);
  playerCapsule.start.z = THREE.MathUtils.clamp(playerCapsule.start.z, -15, 25);
  playerCapsule.end.z = THREE.MathUtils.clamp(playerCapsule.end.z, -15, 25);

  camera.position.copy(playerCapsule.end).add(new THREE.Vector3(0, 0.25, 0));
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

  updatePlayer(delta);

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
