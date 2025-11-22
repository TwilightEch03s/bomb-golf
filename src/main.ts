import * as THREE from "https://esm.sh/three@0.181.2";
import { OrbitControls } from "https://esm.sh/three@0.181.2/examples/jsm/controls/OrbitControls.js";

// Ammo.js is loaded from CDN in index.html
// deno-lint-ignore no-explicit-any
declare const Ammo: any;

// Types
let scene: THREE.Scene;
let camera: THREE.PerspectiveCamera;
let renderer: THREE.WebGLRenderer;
let controls: OrbitControls;
let clock: THREE.Clock;

// Physics variables
// deno-lint-ignore no-explicit-any
let physicsWorld: any;
// deno-lint-ignore no-explicit-any
const rigidBodies: any[] = [];
// deno-lint-ignore no-explicit-any
let tmpTrans: any;

// Constants
const GRAVITY = -9.82;

// Player / power UI state
// deno-lint-ignore no-explicit-any
let playerRigidBody: any = null;
let _playerMesh: THREE.Mesh | null = null;

const POWER_MAX = 100;
const POWER_RATE = 40; // units per second
const OVERPOWER_THRESHOLD = 85; // above this causes left/right random offset
let power = 0;
let isCharging = false;
let overcharged = false;

// Game state
const MAX_TRIES = 3;
let currentTries = MAX_TRIES;
let gameEnded = false;
const HOLE_POSITION = { x: 10, y: 0, z: 10 };

// DOM elements we'll create
let powerFillEl: HTMLElement | null = null;
let triesDisplay: HTMLElement | null = null;

function start() {
  console.log("Start function called");
  initScene();
  console.log("Scene initialized");
  initPhysics();
  console.log("Physics initialized");
  createBodies();
  console.log("Bodies created");
  // Attach input handlers and create UI
  addInputListeners();
  animate();
  console.log("Animation started");
}

function initScene() {
  // Scene setup
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x1a1a1a);
  scene.fog = new THREE.Fog(0x1a1a1a, 50, 100);

  // Camera setup
  const width = globalThis.innerWidth;
  const height = globalThis.innerHeight;
  camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
  camera.position.set(0, 10, 20);
  camera.lookAt(0, 0, 0);

  // Renderer setup
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(width, height);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  document.body.appendChild(renderer.domElement);

  // Lighting
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
  directionalLight.position.set(20, 20, 20);
  directionalLight.castShadow = true;
  directionalLight.shadow.mapSize.width = 2048;
  directionalLight.shadow.mapSize.height = 2048;
  directionalLight.shadow.camera.left = -50;
  directionalLight.shadow.camera.right = 50;
  directionalLight.shadow.camera.top = 50;
  directionalLight.shadow.camera.bottom = -50;
  scene.add(directionalLight);

  // Controls
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;

  // Clock for delta time
  clock = new THREE.Clock();

  // Handle window resize
  globalThis.addEventListener("resize", onWindowResize);
}

function initPhysics() {
  // Physics configuration
  const collisionConfiguration = new Ammo.btDefaultCollisionConfiguration();
  const dispatcher = new Ammo.btCollisionDispatcher(collisionConfiguration);
  const broadphase = new Ammo.btDbvtBroadphase();
  const solver = new Ammo.btSequentialImpulseConstraintSolver();

  // Create physics world
  physicsWorld = new Ammo.btDiscreteDynamicsWorld(
    dispatcher,
    broadphase,
    solver,
    collisionConfiguration,
  );
  physicsWorld.setGravity(new Ammo.btVector3(0, GRAVITY, 0));

  // For transformations
  tmpTrans = new Ammo.btTransform();
}

function createBodies() {
  // --- Ground with hole ---
  const groundY = 0;
  const size = 40; // full ground size
  const holeSize = 4; // size of the hole

  // Create THREE shape with hole
  const shape = new THREE.Shape();
  shape.moveTo(-size / 2, -size / 2);
  shape.lineTo(size / 2, -size / 2);
  shape.lineTo(size / 2, size / 2);
  shape.lineTo(-size / 2, size / 2);
  shape.lineTo(-size / 2, -size / 2);

  const hs = holeSize / 2;

  // define hole position
  const holeX = 10; // move 5 units right
  const holeZ = 10; // move 3 units forward

  // create a new Path for the hole
  const holePath = new THREE.Path();
  holePath.moveTo(-hs + holeX, -hs + holeZ);
  holePath.lineTo(hs + holeX, -hs + holeZ);
  holePath.lineTo(hs + holeX, hs + holeZ);
  holePath.lineTo(-hs + holeX, hs + holeZ);
  holePath.lineTo(-hs + holeX, -hs + holeZ);

  // add the new hole
  shape.holes.push(holePath);

  // Extrude geometry for 3D ground
  const extrudeSettings = { depth: 1, bevelEnabled: false };
  const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
  geometry.rotateX(-Math.PI / 2);
  geometry.translate(0, groundY, 0);

  const material = new THREE.MeshStandardMaterial({ color: 0x3a3a3a });
  const groundMesh = new THREE.Mesh(geometry, material);
  groundMesh.receiveShadow = true;
  scene.add(groundMesh);

  // --- Boundary walls to prevent falling off the map ---
  const wallHeight = 4;
  const wallThickness = 1;
  const halfSize = size / 2;

  // Left wall (along Z)
  const leftWallShape = new Ammo.btBoxShape(
    new Ammo.btVector3(wallThickness / 2, wallHeight / 2, halfSize),
  );
  const leftWall = createRigidBody(leftWallShape, 0, {
    x: -halfSize - wallThickness / 2,
    y: wallHeight / 2,
    z: 0,
  });
  (leftWall.mesh.material as THREE.MeshStandardMaterial).color.set(0x222222);

  // Right wall
  const rightWallShape = new Ammo.btBoxShape(
    new Ammo.btVector3(wallThickness / 2, wallHeight / 2, halfSize),
  );
  const rightWall = createRigidBody(rightWallShape, 0, {
    x: halfSize + wallThickness / 2,
    y: wallHeight / 2,
    z: 0,
  });
  (rightWall.mesh.material as THREE.MeshStandardMaterial).color.set(0x222222);

  // Front wall (along X)
  const frontWallShape = new Ammo.btBoxShape(
    new Ammo.btVector3(halfSize, wallHeight / 2, wallThickness / 2),
  );
  const frontWall = createRigidBody(frontWallShape, 0, {
    x: 0,
    y: wallHeight / 2,
    z: halfSize + wallThickness / 2,
  });
  (frontWall.mesh.material as THREE.MeshStandardMaterial).color.set(0x222222);

  // Back wall
  const backWallShape = new Ammo.btBoxShape(
    new Ammo.btVector3(halfSize, wallHeight / 2, wallThickness / 2),
  );
  const backWall = createRigidBody(backWallShape, 0, {
    x: 0,
    y: wallHeight / 2,
    z: -halfSize - wallThickness / 2,
  });
  (backWall.mesh.material as THREE.MeshStandardMaterial).color.set(0x222222);

  // --- Ammo Physics ---
  const triangleMesh = new Ammo.btTriangleMesh();
  const vertices = geometry.attributes.position.array;
  for (let i = 0; i < vertices.length; i += 9) {
    const v0 = new Ammo.btVector3(
      vertices[i],
      vertices[i + 1],
      vertices[i + 2],
    );
    const v1 = new Ammo.btVector3(
      vertices[i + 3],
      vertices[i + 4],
      vertices[i + 5],
    );
    const v2 = new Ammo.btVector3(
      vertices[i + 6],
      vertices[i + 7],
      vertices[i + 8],
    );
    triangleMesh.addTriangle(v0, v1, v2, true);
  }
  const groundShape = new Ammo.btBvhTriangleMeshShape(triangleMesh, true, true);
  createRigidBody(groundShape, 0, { x: 0, y: 0, z: 0 });

  // --- Player ball ---
  const radius = 1;
  const sphereShape = new Ammo.btSphereShape(radius);
  const sphereBody = createRigidBody(sphereShape, 1, { x: 0, y: 2, z: 6 });

  // Color the ball
  (sphereBody.mesh.material as THREE.MeshStandardMaterial).color.set(0x888888);
  scene.add(sphereBody.mesh);
  playerRigidBody = sphereBody.rigidBody;
  _playerMesh = sphereBody.mesh;

  // Set friction and damping for the ball
  playerRigidBody.setFriction(1.0);
  playerRigidBody.setDamping(0.05, 0.92);

  // --- Hole trigger (invisible collision box) ---
  const holeTriggerSize = 3; // box size for hole trigger
  const holeTriggerShape = new Ammo.btBoxShape(
    new Ammo.btVector3(
      holeTriggerSize / 2,
      holeTriggerSize / 2,
      holeTriggerSize / 2,
    ),
  );
  const holeTriggerBody = createRigidBody(holeTriggerShape, 0, {
    x: HOLE_POSITION.x,
    y: -1,
    z: HOLE_POSITION.z,
  });

  // Make trigger invisible and store reference
  holeTriggerBody.mesh.visible = false;
  holeTriggerBody.rigidBody.setCollisionFlags(
    holeTriggerBody.rigidBody.getCollisionFlags() | 4,
  ); // CF_NO_CONTACT_RESPONSE = 4
  holeTriggerBody.rigidBody.holeTrigger = true; // Mark as hole trigger
}

interface BodyConfig {
  x: number;
  y: number;
  z: number;
}

function createRigidBody(
  // deno-lint-ignore no-explicit-any
  shape: any,
  mass: number,
  position: BodyConfig,
) {
  // Create mesh
  let geometry: THREE.BufferGeometry;
  let material: THREE.Material;

  // If the shape is a box, try to read its half-extents so the visual
  // mesh matches the physics shape. This prevents tiny visual planes while
  // physics uses a large collision box.
  try {
    if (shape instanceof Ammo.btBoxShape) {
      // btBoxShape stores half extents; use them to build the Three mesh
      const halfExt = shape.getHalfExtentsWithMargin();
      const hx = halfExt.x ? halfExt.x() : 1;
      const hy = halfExt.y ? halfExt.y() : 1;
      const hz = halfExt.z ? halfExt.z() : 1;
      geometry = new THREE.BoxGeometry(hx * 2, hy * 2, hz * 2);
      material = new THREE.MeshStandardMaterial({
        color: Math.random() * 0xffffff,
        roughness: 0.7,
      });
    } else if (shape instanceof Ammo.btSphereShape) {
      geometry = new THREE.SphereGeometry(1, 32, 32);
      material = new THREE.MeshStandardMaterial({
        color: Math.random() * 0xffffff,
        roughness: 0.7,
      });
    } else {
      geometry = new THREE.BoxGeometry(2, 2, 2);
      material = new THREE.MeshStandardMaterial({ color: 0x888888 });
    }
  } catch (_err) {
    // Fallback if shape introspection fails
    geometry = new THREE.BoxGeometry(2, 2, 2);
    material = new THREE.MeshStandardMaterial({ color: 0x888888 });
  }

  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.position.set(position.x, position.y, position.z);

  // Create physics body
  const transform = new Ammo.btTransform();
  transform.setIdentity();
  transform.setOrigin(new Ammo.btVector3(position.x, position.y, position.z));

  const motionState = new Ammo.btDefaultMotionState(transform);

  // Calculate local inertia for dynamic bodies
  const localInertia = new Ammo.btVector3(0, 0, 0);
  if (mass > 0) {
    try {
      shape.calculateLocalInertia(mass, localInertia);
    } catch (_e) {
      // ignore if shape doesn't support it
    }
  }

  const rbInfo = new Ammo.btRigidBodyConstructionInfo(
    mass,
    motionState,
    shape,
    localInertia,
  );
  const rigidBody = new Ammo.btRigidBody(rbInfo);

  // Make dynamic bodies active and set some reasonable friction/restitution
  if (mass > 0) {
    try {
      rigidBody.setFriction(0.6);
      rigidBody.setRestitution(0.05);
      if (rigidBody.activate) rigidBody.activate();
    } catch (_e) {
      // ignore
    }
  }

  // Add to physics world
  physicsWorld.addRigidBody(rigidBody);

  // Store reference for updates
  rigidBody.mesh = mesh;
  rigidBodies.push(rigidBody);

  return { mesh, rigidBody };
}

function animate() {
  requestAnimationFrame(animate);

  // Always advance the clock and get delta time
  const deltaTime = clock.getDelta();

  // Update physics only if physicsWorld exists
  if (physicsWorld) {
    physicsWorld.stepSimulation(deltaTime, 10);

    // Update rigid body meshes
    rigidBodies.forEach((rigidBody) => {
      const motionState = rigidBody.getMotionState();
      if (motionState) {
        motionState.getWorldTransform(tmpTrans);
        const origin = tmpTrans.getOrigin();
        const rotation = tmpTrans.getRotation();

        rigidBody.mesh.position.set(origin.x(), origin.y(), origin.z());
        rigidBody.mesh.quaternion.set(
          rotation.x(),
          rotation.y(),
          rotation.z(),
          rotation.w(),
        );
      }
    });

    // If game not ended, run edge checks
    if (_playerMesh && currentTries > 0 && !gameEnded) {
      checkEdge();
    }
  }

  // If player is charging, accumulate power and optionally nudge the ball forward
  if (isCharging) {
    power += POWER_RATE * deltaTime;
    if (power > POWER_MAX) power = POWER_MAX;
    overcharged = power >= OVERPOWER_THRESHOLD;
    updatePowerUI();
  }

  // Stabilize small velocities to avoid jitter when object is effectively stopped
  if (physicsWorld) {
    rigidBodies.forEach((rigidBody) => {
      try {
        const lv = rigidBody.getLinearVelocity();
        if (lv) {
          const vx = lv.x();
          const vy = lv.y();
          const vz = lv.z();
          const speed = Math.sqrt(vx * vx + vy * vy + vz * vz);
          if (speed < 0.03) {
            // zero tiny velocities to prevent drifting
            rigidBody.setLinearVelocity(new Ammo.btVector3(0, 0, 0));
            rigidBody.setAngularVelocity(new Ammo.btVector3(0, 0, 0));
          }
        }
      } catch (_e) {
        // ignore bodies that don't support velocities
      }
    });
  }

  // Update controls
  controls.update();

  // Render
  renderer.render(scene, camera);
}

function onWindowResize() {
  const width = globalThis.innerWidth;
  const height = globalThis.innerHeight;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
}

function createPowerUI() {
  // container
  const container = document.createElement("div");
  container.id = "power-ui";

  const fill = document.createElement("div");
  fill.id = "power-fill";
  container.appendChild(fill);

  const label = document.createElement("div");
  label.id = "power-label";
  label.textContent = "Power";

  document.body.appendChild(container);
  document.body.appendChild(label);

  powerFillEl = fill;
  updatePowerUI();

  // Create tries display
  const triesEl = document.createElement("div");
  triesEl.id = "tries-display";
  triesEl.style.position = "fixed";
  triesEl.style.top = "20px";
  triesEl.style.right = "20px";
  triesEl.style.fontSize = "24px";
  triesEl.style.color = "#fff";
  triesEl.style.fontWeight = "bold";
  triesEl.style.zIndex = "1000";
  document.body.appendChild(triesEl);
  triesDisplay = triesEl;
  updateTriesDisplay();
}

function updatePowerUI() {
  if (!powerFillEl) return;
  const pct = Math.max(0, Math.min(1, power / POWER_MAX));
  powerFillEl.style.height = `${pct * 100}%`;
  if (overcharged) powerFillEl.classList.add("power-over");
  else powerFillEl.classList.remove("power-over");
}

function updateTriesDisplay() {
  if (!triesDisplay) return;
  triesDisplay.textContent = `Tries: ${currentTries}/${MAX_TRIES}`;
}

function checkEdge() {
  if (!_playerMesh) return;

  const playerPos = _playerMesh.position;
  const platformHalf = 20;
  const holeX = HOLE_POSITION.x;
  const holeZ = HOLE_POSITION.z;
  const holeRadius = 2.5;

  // Calculate distance to hole
  const dx = playerPos.x - holeX;
  const dz = playerPos.z - holeZ;
  const distToHole = Math.sqrt(dx * dx + dz * dz);

  const isInHoleArea = distToHole < holeRadius && playerPos.y < -3;
  if (
    !isInHoleArea &&
    (Math.abs(playerPos.x) > platformHalf + 2 ||
      Math.abs(playerPos.z) > platformHalf + 2 ||
      playerPos.y < -5)
  ) {
    resetPlayerPosition();
    showMessage("🎉 SUCCESS! Ball in hole!", 1500);
    // End the game when success occurs so no further input or try logic runs
    gameEnded = true;
    isCharging = false;
  }
}

// Removed checkHoleTrigger and ballInHole — using edge-based win handling instead

function resetPlayerPosition() {
  if (!playerRigidBody || !_playerMesh) return;

  // Reset position
  const newPos = { x: 0, y: 2, z: 6 };
  const transform = new Ammo.btTransform();
  transform.setIdentity();
  transform.setOrigin(new Ammo.btVector3(newPos.x, newPos.y, newPos.z));
  playerRigidBody.setWorldTransform(transform);

  // Reset velocities
  playerRigidBody.setLinearVelocity(new Ammo.btVector3(0, 0, 0));
  playerRigidBody.setAngularVelocity(new Ammo.btVector3(0, 0, 0));

  // Update mesh
  _playerMesh.position.set(newPos.x, newPos.y, newPos.z);
  _playerMesh.quaternion.set(0, 0, 0, 1);

  // Reset game state
  power = 0;
  isCharging = false;
  overcharged = false;
  updatePowerUI();
}

function decrementTries() {
  currentTries--;
  updateTriesDisplay();

  if (currentTries <= 0) {
    // Game over
    gameOver();
  } else {
    // Show message but don't reset position - ball stays where it is
    showMessage(`Try ${MAX_TRIES - currentTries + 1}/${MAX_TRIES}`, 1500);
  }
}

function gameOver() {
  // Disable player control and hide the ball
  if (_playerMesh) {
    _playerMesh.visible = false;
  }
  isCharging = false;
  currentTries = 0;

  showMessage("❌ YOU LOSE! No tries left. Refresh to try again.", 0);
}

function showMessage(message: string, duration: number) {
  const msgEl = document.createElement("div");
  msgEl.textContent = message;
  msgEl.style.position = "fixed";
  msgEl.style.top = "50%";
  msgEl.style.left = "50%";
  msgEl.style.transform = "translate(-50%, -50%)";
  msgEl.style.fontSize = "32px";
  msgEl.style.color = "#fff";
  msgEl.style.backgroundColor = "rgba(0, 0, 0, 0.7)";
  msgEl.style.padding = "30px 60px";
  msgEl.style.borderRadius = "10px";
  msgEl.style.zIndex = "2000";
  msgEl.style.fontWeight = "bold";
  msgEl.style.textAlign = "center";

  document.body.appendChild(msgEl);

  if (duration > 0) {
    setTimeout(() => {
      msgEl.remove();
    }, duration);
  }
}

function startCharging() {
  if (isCharging) return;

  // If game ended, ignore charging input
  if (gameEnded) return;

  // Check if ball is still moving
  if (playerRigidBody) {
    const lv = playerRigidBody.getLinearVelocity();
    const vx = lv.x();
    const vy = lv.y();
    const vz = lv.z();
    const speed = Math.sqrt(vx * vx + vy * vy + vz * vz);
    if (speed > 0.1) {
      // Ball is still moving, can't charge
      return;
    }
  }

  isCharging = true;
  power = 0;
  overcharged = false;
  updatePowerUI();
}

function stopCharging() {
  if (!isCharging) return;
  isCharging = false;
  overcharged = power >= OVERPOWER_THRESHOLD;

  // Apply final impulse based on accumulated power
  if (playerRigidBody && physicsWorld) {
    // Use camera forward direction projected on XZ plane so the shot goes
    // where the camera is looking.
    const camDir = new THREE.Vector3();
    camera.getWorldDirection(camDir);
    camDir.y = 0;
    if (camDir.lengthSq() < 1e-5) camDir.set(0, 0, -1);
    camDir.normalize();

    const forwardScalar = (power / POWER_MAX) * 60.0;

    // Overcharge: add a random lateral component perpendicular to camera dir
    let lateralScalar = 0;
    if (overcharged) {
      lateralScalar = (Math.random() * 2.0) * (Math.random() < 0.5 ? -1 : 1);
    }

    const lateralDir = new THREE.Vector3(-camDir.z, 0, camDir.x).normalize();

    const impulseX = camDir.x * forwardScalar + lateralDir.x * lateralScalar;
    const impulseZ = camDir.z * forwardScalar + lateralDir.z * lateralScalar;
    const impulseY = 0.15 * (power / POWER_MAX);

    const impulseVec = new Ammo.btVector3(impulseX, impulseY, impulseZ);

    // Wake up the body before applying force
    playerRigidBody.activate(true);

    // Now apply the impulse
    playerRigidBody.applyCentralImpulse(impulseVec);
  }

  // Reset power slowly for UI
  setTimeout(() => {
    power = 0;
    overcharged = false;
    updatePowerUI();
  }, 120);

  // Wait for ball to settle and check if it went in the hole
  // If not in hole after settling, decrement tries
  let settleCheckCount = 0;
  const settleCheckInterval = setInterval(() => {
    settleCheckCount++;

    // If game ended, stop checks
    if (gameEnded) {
      clearInterval(settleCheckInterval);
      return;
    }

    // If ball has come to rest (very low speed) we can decide right away
    try {
      if (playerRigidBody) {
        const lv = playerRigidBody.getLinearVelocity();
        const speed = Math.sqrt(
          lv.x() * lv.x() + lv.y() * lv.y() + lv.z() * lv.z(),
        );
        if (speed < 0.05) {
          // ball effectively settled; check whether a shot was actually taken
          clearInterval(settleCheckInterval);
          if (currentTries > 0 && _playerMesh) {
            // Check if player actually left the starting area (shot was taken).
            // Start was at z === 6, x === 0; require a small movement greater than 2 units.
            const distFromStart = Math.sqrt(
              _playerMesh.position.x ** 2 + (_playerMesh.position.z - 6) ** 2,
            );
            if (distFromStart > 2) {
              decrementTries();
            } else {
              // Didn't meaningfully move — do nothing (no try consumed)
            }
          }
          return;
        }
      }
    } catch (_e) {
      // any read error -> fallback to original timeout behavior below
    }

    if (settleCheckCount > 60) {
      // After ~3 seconds of checks (60 * 50ms = 3000ms), if not in hole, decrement tries
      clearInterval(settleCheckInterval);
      if (gameEnded) return;

      if (currentTries > 0 && _playerMesh) {
        const distFromStart = Math.sqrt(
          _playerMesh.position.x ** 2 + (_playerMesh.position.z - 6) ** 2,
        );
        if (distFromStart > 2) {
          decrementTries();
        } else {
          // didn't move much -- do not consume a try
        }
      }
    }
  }, 50);
}

function addInputListeners() {
  // Create UI if not present
  if (!document.getElementById("power-ui")) createPowerUI();

  globalThis.addEventListener("keydown", (e) => {
    if ((e as KeyboardEvent).code === "Space") {
      e.preventDefault();
      if (!isCharging) startCharging();
    }
  });

  globalThis.addEventListener("keyup", (e) => {
    if ((e as KeyboardEvent).code === "Space") {
      e.preventDefault();
      stopCharging();
    }
  });
}

// Start the application
console.log("Main.ts loaded, waiting for Ammo...");

let ammoWaitAttempts = 0;
const maxAmmoWaitAttempts = 100; // ~10 seconds at 100ms intervals

function waitForAmmo() {
  // deno-lint-ignore no-explicit-any
  const AmmoLib = (globalThis as any).Ammo;

  ammoWaitAttempts++;
  console.log(
    `Attempt ${ammoWaitAttempts}: Ammo=${typeof AmmoLib}`,
  );

  if (
    AmmoLib &&
    (typeof AmmoLib === "function" || typeof AmmoLib === "object")
  ) {
    console.log("Ammo found! Type:", typeof AmmoLib);
    if (typeof AmmoLib === "function") {
      console.log("Ammo is a function, calling it...");
      AmmoLib().then(start).catch((err: unknown) => {
        console.error("Failed to initialize Ammo:", err);
      });
    } else {
      // Already initialized
      console.log("Ammo is already an object, starting...");
      start();
    }
  } else if (ammoWaitAttempts < maxAmmoWaitAttempts) {
    setTimeout(waitForAmmo, 100);
  } else {
    console.error("Ammo.js failed to load after timeout");
  }
}

// Wait a bit for the script to load
setTimeout(waitForAmmo, 1000);
