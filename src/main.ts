import * as THREE from "https://esm.sh/three@0.181.2";
import { OrbitControls } from "https://esm.sh/three@0.181.2/examples/jsm/controls/OrbitControls.js";

// Ammo.js is loaded from CDN in index.html
// deno-lint-ignore no-explicit-any
declare const Ammo: any;

// Types
interface RigidBodyData {
  mesh: THREE.Mesh;
}

// Scene variables
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

function start() {
  console.log("Start function called");
  initScene();
  console.log("Scene initialized");
  initPhysics();
  console.log("Physics initialized");
  createBodies();
  console.log("Bodies created");
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
  // Ground plane
  const groundShape = new Ammo.btBoxShape(new Ammo.btVector3(25, 1, 25));
  const groundBody = createRigidBody(groundShape, 0, {
    x: 0,
    y: -5,
    z: 0,
  });
  scene.add(groundBody.mesh);

  // Add some falling boxes
  for (let i = 0; i < 5; i++) {
    const boxShape = new Ammo.btBoxShape(new Ammo.btVector3(1, 1, 1));
    const boxBody = createRigidBody(boxShape, 1, {
      x: Math.random() * 10 - 5,
      y: 5 + i * 3,
      z: Math.random() * 10 - 5,
    });
    scene.add(boxBody.mesh);
  }
}

function createSimpleBodies() {
  // Ground plane (static)
  const groundGeometry = new THREE.BoxGeometry(50, 2, 50);
  const groundMaterial = new THREE.MeshStandardMaterial({ color: 0x888888 });
  const groundMesh = new THREE.Mesh(groundGeometry, groundMaterial);
  groundMesh.position.y = -5;
  groundMesh.castShadow = true;
  groundMesh.receiveShadow = true;
  scene.add(groundMesh);

  // Add some boxes
  for (let i = 0; i < 5; i++) {
    const geometry = new THREE.BoxGeometry(2, 2, 2);
    const material = new THREE.MeshStandardMaterial({
      color: Math.random() * 0xffffff,
      roughness: 0.7,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(
      Math.random() * 10 - 5,
      5 + i * 3,
      Math.random() * 10 - 5,
    );
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);
  }
}

function startWithoutPhysics() {
  try {
    initScene();
    console.log("Scene initialized without physics");
    createSimpleBodies();
    console.log("Simple bodies created");
    animate();
    console.log("Animation started (no physics)");
  } catch (err) {
    console.error("Failed to initialize scene:", err);
  }
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

  if (shape instanceof Ammo.btBoxShape) {
    geometry = new THREE.BoxGeometry(2, 2, 2);
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

  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.position.set(position.x, position.y, position.z);

  // Create physics body
  const transform = new Ammo.btTransform();
  transform.setIdentity();
  transform.setOrigin(new Ammo.btVector3(position.x, position.y, position.z));

  const motionState = new Ammo.btDefaultMotionState(transform);
  const rbInfo = new Ammo.btRigidBodyConstructionInfo(
    mass,
    motionState,
    shape,
    new Ammo.btVector3(0, 0, 0),
  );
  const rigidBody = new Ammo.btRigidBody(rbInfo);

  // Add to physics world
  physicsWorld.addRigidBody(rigidBody);

  // Store reference for updates
  rigidBody.mesh = mesh;
  rigidBodies.push(rigidBody);

  return { mesh, rigidBody };
}

function animate() {
  requestAnimationFrame(animate);

  // Update physics only if physicsWorld exists
  if (physicsWorld) {
    const deltaTime = clock.getDelta();
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
  } else {
    clock.getDelta(); // Still advance the clock
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
        startWithoutPhysics();
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
    startWithoutPhysics();
  }
}

// Wait a bit for the script to load
setTimeout(waitForAmmo, 1000);
