import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

const canvas = document.querySelector("#galaxy-canvas");
const viewport = document.querySelector("#galaxy-viewport");
const dossier = document.querySelector("#planet-dossier");

const scene = new THREE.Scene();
scene.background = new THREE.Color("#03010a");
scene.fog = new THREE.FogExp2("#03010a", 0.008);

const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 200);
camera.position.set(0, 5.4, 22);
camera.lookAt(0, 0, 0);

let renderer;
try {
  renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false,
    failIfMajorPerformanceCaveat: false,
  });
} catch (error) {
  showGalaxyError(error);
  throw error;
}

renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.22;

const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.enablePan = false;
controls.minDistance = 2;
controls.maxDistance = 40;
controls.minPolarAngle = 0.08;
controls.maxPolarAngle = Math.PI * 0.52;
controls.target.set(0, 0, 0);
controls.autoRotate = false;

const fallbackProjects = [
  {
    title: "Bottle Rocket Project",
    year: "2026",
    description:
      "Design and analysis of a small-scale liquid rocket propulsion system.",
    tags: ["Propulsion", "CAD", "Simulation"],
    kind: "lava",
    color: "#e9783d",
    url: "#",
  },
  {
    title: "Satellite Design",
    year: "2025",
    description:
      "A conceptual CubeSat mission and spacecraft subsystem design.",
    tags: ["CubeSat", "Systems", "Orbital Mechanics"],
    kind: "terra",
    color: "#4da6ff",
    url: "#",
    clouds: true,
  },
  {
    title: "Aircraft Structures",
    year: "2025",
    description:
      "Structural analysis and optimization of an aircraft component.",
    tags: ["FEA", "Structures", "Optimization"],
    kind: "ice",
    color: "#b86cff",
    url: "#",
  },
  {
    title: "Wind Tunnel Study",
    year: "2024",
    description:
      "Experimental aerodynamic testing and analysis in a wind tunnel.",
    tags: ["Aerodynamics", "Testing", "Data"],
    kind: "gas",
    color: "#52d8bc",
    url: "#",
    rings: true,
  },
];

const listedProjects = (window.PROJECTS || []).filter(
  (project) =>
    (project.categories || []).includes("aerospace") &&
    project.title !== "Add your first project"
);

const projects =
  window.AEROSPACE_PROJECTS ||
  (listedProjects.length
    ? listedProjects.map((project, index) => ({
        ...fallbackProjects[index % fallbackProjects.length],
        ...project,
      }))
    : fallbackProjects);

scene.add(new THREE.AmbientLight("#2a2438", 0.38));
scene.add(new THREE.HemisphereLight("#8aa0c8", "#1a1020", 0.32));

const sunLight = new THREE.PointLight("#fff1cf", 280, 58, 1.45);
sunLight.position.set(0, 0.12, 0);
scene.add(sunLight);

const sunFill = new THREE.PointLight("#ffb56a", 40, 22, 2);
sunFill.position.set(0, 0.2, 0);
scene.add(sunFill);

const sun = new THREE.Mesh(
  new THREE.SphereGeometry(1.18, 72, 72),
  new THREE.MeshBasicMaterial({ map: makeSunTexture(), color: "#fff4d2" })
);
scene.add(sun);

[
  { scale: 5.4, color: "#fff6c8", tint: "#ffe08a", opacity: 0.95 },
  { scale: 8.6, color: "#ffb347", tint: "#ff8a2a", opacity: 0.38 },
  { scale: 13.5, color: "#ff6a1c", tint: "#ff5a12", opacity: 0.16 },
].forEach((layer) => {
  const glow = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: makeGlowTexture(layer.color),
      color: layer.tint,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      opacity: layer.opacity,
    })
  );
  glow.scale.set(layer.scale, layer.scale, 1);
  sun.add(glow);
});

const sunHalo = new THREE.Mesh(
  new THREE.SphereGeometry(1.42, 48, 48),
  new THREE.MeshBasicMaterial({
    color: "#ffb45a",
    transparent: true,
    opacity: 0.18,
    side: THREE.BackSide,
    depthWrite: false,
  })
);
sun.add(sunHalo);

const planets = [];
const planetGroup = new THREE.Group();
scene.add(planetGroup);
let galaxyRef = null;
const twinkleLayers = [];

addStarfield();
addSpiralGalaxy();
addAsteroidBelt(4.55, 5.2);

const orbitRadii = [1.7, 2.4, 3.15, 3.95, 4.9, 5.85, 7.05, 8.15, 9.2];
orbitRadii.forEach(addOrbit);

const systemSlots = [
  { kind: "rock", size: 0.14, radius: 1.7, angle: 0.55, tilt: 0.04 },
  { kind: "desert", size: 0.23, radius: 2.4, angle: 2.35, tilt: 0.05 },
  { kind: "terra", size: 0.26, radius: 3.15, angle: 5.35, clouds: true, clickable: true, tilt: 0.41, moon: true },
  { kind: "mars", size: 0.18, radius: 3.95, angle: 3.7, clickable: true, tilt: 0.44 },
  { kind: "jupiter", size: 0.78, radius: 5.85, angle: 1.15, tilt: 0.05 },
  { kind: "saturn", size: 0.62, radius: 7.05, angle: 4.45, rings: true, clickable: true, tilt: 0.47 },
  { kind: "ice", size: 0.34, radius: 8.15, angle: 0.28, clickable: true, tilt: 1.35 },
  { kind: "neptune", size: 0.33, radius: 9.2, angle: 2.9, tilt: 0.49 },
];

const clickableSlots = systemSlots.filter((slot) => slot.clickable);
const unusedProjects = [...projects];
clickableSlots.forEach((slot) => {
  const match = unusedProjects.findIndex((project) => {
    if (slot.kind === "saturn") return project.rings || project.kind === "gas";
    if (slot.kind === "mars") return project.kind === "lava" || project.kind === "mars";
    if (slot.kind === "ice") return project.kind === "ice" || project.kind === "neptune";
    return project.kind === slot.kind;
  });
  slot.project =
    match >= 0 ? unusedProjects.splice(match, 1)[0] : unusedProjects.shift() || null;
});

systemSlots.forEach((slot, index) => {
  addBody({
    ...slot,
    seed: hashString((slot.project && slot.project.title) || `body-${index}`),
  });
});


function addBody({ kind, size, radius, angle, rings, clouds, project, seed, tilt = 0.08, moon }) {
  const maps = makePlanetMaps(kind, seed);
  const group = new THREE.Group();
  group.position.set(Math.cos(angle) * radius, 0, Math.sin(angle) * radius);
  group.rotation.z = tilt;

  const gasGiant = kind === "jupiter" || kind === "saturn" || kind === "neptune";
  const material = new THREE.MeshStandardMaterial({
    map: maps.map,
    bumpMap: maps.bumpMap,
    bumpScale: gasGiant ? 0.03 : 0.14,
    roughnessMap: maps.roughnessMap,
    roughness: kind === "ice" ? 0.26 : 0.78,
    metalness: kind === "ice" ? 0.16 : 0.03,
    emissiveMap: maps.emissiveMap || maps.map,
    emissive: maps.emissiveMap
      ? new THREE.Color("#ff6a22")
      : new THREE.Color("#ffffff"),
    emissiveIntensity: maps.emissiveMap ? 0.85 : 0.22,
  });

  const planet = new THREE.Mesh(new THREE.SphereGeometry(size, 64, 64), material);
  planet.userData.project = project || null;
  planet.userData.group = group;
  planet.userData.baseEmissive = material.emissiveIntensity;
  planet.userData.clickable = Boolean(project);
  planet.userData.glowAmount = 0;
  planet.userData.glowTarget = 0;

  group.add(planet);
  group.add(makeAtmosphere(size, maps.atmosphere, kind));

  if (project) {
    const pressGlow = makePressGlow(size, maps.atmosphere);
    planet.userData.pressGlow = pressGlow;
    group.add(pressGlow);
  }

  if (clouds || kind === "terra") {
    group.add(
      new THREE.Mesh(
        new THREE.SphereGeometry(size * 1.018, 48, 48),
        new THREE.MeshLambertMaterial({
          map: makeCloudTexture(seed + 9),
          transparent: true,
          opacity: 0.34,
          depthWrite: false,
        })
      )
    );
  }

  if (rings) {
    group.add(makeRingMesh(size, maps.atmosphere, seed + 3));
  }

  if (moon) {
    const moonMesh = new THREE.Mesh(
      new THREE.SphereGeometry(size * 0.27, 16, 16),
      new THREE.MeshStandardMaterial({
        color: "#c5c0b6",
        roughness: 0.94,
        metalness: 0.02,
      })
    );
    moonMesh.position.set(size * 2.15, size * 0.18, size * 0.55);
    group.add(moonMesh);
  }

  if (project) {
    group.add(makeLabel(project.title, size));
    planets.push(planet);
  }

  planetGroup.add(group);
}

function addOrbit(radius) {
  const orbit = new THREE.LineLoop(
    new THREE.BufferGeometry().setFromPoints(
      Array.from({ length: 128 }, (_, index) => {
        const angle = (index / 128) * Math.PI * 2;
        return new THREE.Vector3(
          Math.cos(angle) * radius,
          0,
          Math.sin(angle) * radius
        );
      })
    ),
    new THREE.LineBasicMaterial({
      color: "#8ea0c8",
      transparent: true,
      opacity: 0.16,
    })
  );

  scene.add(orbit);
}

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
let hoveredPlanet = null;
let selectedPlanet = null;
let pointerDownPosition = null;

canvas.addEventListener("pointerdown", (event) => {
  pointerDownPosition = { x: event.clientX, y: event.clientY };
});

canvas.addEventListener("pointermove", (event) => {
  updatePointer(event);
  raycaster.setFromCamera(pointer, camera);

  const intersection = raycaster.intersectObjects(planets, false)[0];
  const nextPlanet = intersection?.object || null;

  if (hoveredPlanet && hoveredPlanet !== nextPlanet) {
    const baseScale = hoveredPlanet.userData.originalScale || 1;
    hoveredPlanet.userData.group.scale.setScalar(baseScale);
  }

  hoveredPlanet = nextPlanet;

  if (hoveredPlanet) {
    const baseScale = hoveredPlanet.userData.originalScale || 1;
    hoveredPlanet.userData.group.scale.setScalar(baseScale * 1.08);
    canvas.style.cursor = "pointer";
  } else {
    canvas.style.cursor = "grab";
  }
});

canvas.addEventListener("pointerleave", () => {
  if (!hoveredPlanet) return;
  const baseScale = hoveredPlanet.userData.originalScale || 1;
  hoveredPlanet.userData.group.scale.setScalar(baseScale);
  hoveredPlanet = null;
  canvas.style.cursor = "grab";
});

canvas.addEventListener("pointerup", (event) => {
  if (!pointerDownPosition) return;

  const distance = Math.hypot(
    event.clientX - pointerDownPosition.x,
    event.clientY - pointerDownPosition.y
  );

  pointerDownPosition = null;
  if (distance > 6) return;

  updatePointer(event);
  raycaster.setFromCamera(pointer, camera);

  const intersection = raycaster.intersectObjects(planets, false)[0];
  if (intersection) {
    showProject(intersection.object.userData.project);
  }
});

function updatePointer(event) {
  const bounds = canvas.getBoundingClientRect();
  pointer.x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
  pointer.y = -((event.clientY - bounds.top) / bounds.height) * 2 + 1;
}

function showProject(project) {
  if (!dossier) return;

  dossier.querySelector(".project-year").textContent = project.year || "";
  dossier.querySelector("h2").textContent = project.title;
  dossier.querySelector(".planet-dossier-copy").textContent =
    project.description || "";

  const tags = dossier.querySelector(".tags");
  tags.replaceChildren(
    ...(project.tags || []).map((tag) => {
      const item = document.createElement("span");
      item.className = "tag";
      item.textContent = tag;
      return item;
    })
  );

  const links = dossier.querySelector(".project-links");
  links.replaceChildren();

  if (project.url && project.url !== "#") {
    const link = document.createElement("a");
    link.href = project.url;
    link.textContent = "View project";
    links.append(link);
  }

  dossier.hidden = false;
  focusPlanetForProject(project);
  setSelectedPlanet(project);
}

dossier
  ?.querySelector(".planet-dossier-close")
  ?.addEventListener("click", () => {
    dossier.hidden = true;
    setSelectedPlanet(null);
    resetCameraView();
  });

const homeView = {
  position: new THREE.Vector3(0, 5.4, 22),
  target: new THREE.Vector3(0, 0, 0),
};
let camTween = null;

function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}

function startCameraTween(position, target, duration = 1100) {
  camTween = {
    fromPos: camera.position.clone(),
    fromTarget: controls.target.clone(),
    toPos: position.clone(),
    toTarget: target.clone(),
    start: performance.now(),
    duration,
  };
}

function updateCameraTween() {
  if (!camTween) return;
  const t = Math.min(1, (performance.now() - camTween.start) / camTween.duration);
  const e = easeOutCubic(t);
  camera.position.lerpVectors(camTween.fromPos, camTween.toPos, e);
  controls.target.lerpVectors(camTween.fromTarget, camTween.toTarget, e);
  if (t >= 1) camTween = null;
}

function focusPlanetForProject(project) {
  const planet = planets.find(
    (item) =>
      item.userData.project === project ||
      item.userData.project?.title === project?.title
  );
  if (!planet) return;

  const world = new THREE.Vector3();
  planet.getWorldPosition(world);
  const size = planet.geometry.parameters?.radius || 0.3;
  const offset = new THREE.Vector3(size * 3.4, size * 6.8 + 1.15, size * 3.1);
  startCameraTween(world.clone().add(offset), world);
}

function resetCameraView() {
  startCameraTween(homeView.position, homeView.target, 1000);
}

function setSelectedPlanet(project) {
  const nextPlanet = project
    ? planets.find(
        (item) =>
          item.userData.project === project ||
          item.userData.project?.title === project?.title
      )
    : null;

  if (selectedPlanet && selectedPlanet !== nextPlanet) {
    selectedPlanet.userData.glowTarget = 0;
  }

  selectedPlanet = nextPlanet || null;
  if (selectedPlanet) {
    selectedPlanet.userData.glowTarget = 1;
  }
}

function updatePlanetGlows() {
  const pulse = 1 + Math.sin(performance.now() * 0.0022) * 0.1;

  planets.forEach((planet) => {
    const target = planet.userData.glowTarget || 0;
    planet.userData.glowAmount = THREE.MathUtils.lerp(
      planet.userData.glowAmount || 0,
      target,
      0.09
    );
    const amount = planet.userData.glowAmount;
    const glow = planet.userData.pressGlow;

    if (glow) {
      glow.visible = amount > 0.01;
      glow.material.opacity = amount * 0.26 * pulse;
    }

    let extra = 0;
    if (planet === hoveredPlanet) extra += 0.2;
    if (amount > 0.01) extra += 0.18 * amount;
    planet.material.emissiveIntensity = planet.userData.baseEmissive + extra;
  });
}

function makePressGlow(size, color) {
  const glow = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: makeGlowTexture(color),
      color,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      opacity: 0,
    })
  );
  glow.scale.set(size * 3.2, size * 3.2, 1);
  glow.visible = false;
  return glow;
}

function resize() {
  const width = viewport.clientWidth;
  const height = viewport.clientHeight;
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}

function animate() {
  requestAnimationFrame(animate);
  updateCameraTween();
  updatePlanetGlows();
  updateStarTwinkle(performance.now() * 0.001);
  if (galaxyRef) galaxyRef.rotation.y += 0.00045;
  controls.update();
  updateCursorTrail();
  renderer.render(scene, camera);
}

function makeLabel(text, size) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 96;
  const ctx = canvas.getContext("2d");
  ctx.font = "600 28px Outfit, Helvetica, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.shadowColor = "rgba(0,0,0,0.85)";
  ctx.shadowBlur = 8;
  ctx.fillStyle = "#f4f7ff";
  ctx.fillText(text, 256, 48, 480);

  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: canvasTexture(canvas, true),
      transparent: true,
      depthTest: false,
    })
  );
  sprite.position.y = size + 0.42;
  sprite.scale.set(3.1, 0.58, 1);
  return sprite;
}

function addStarfield() {
  addStarLayer(8200, 0.08, 28, 95, 0.82, 0.16);
  addStarLayer(420, 0.16, 24, 70, 1, 0.42);
}

function addStarLayer(starCount, size, minRadius, maxRadius, opacity, twinkleChance = 0) {
  const starPositions = new Float32Array(starCount * 3);
  const starColors = new Float32Array(starCount * 3);

  for (let index = 0; index < starCount; index += 1) {
    const radius = THREE.MathUtils.randFloat(minRadius, maxRadius);
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(THREE.MathUtils.randFloatSpread(2));
    starPositions[index * 3] = radius * Math.sin(phi) * Math.cos(theta);
    starPositions[index * 3 + 1] = radius * Math.cos(phi);
    starPositions[index * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);

    const roll = Math.random();
    const color =
      roll > 0.92
        ? new THREE.Color("#ffc6e8")
        : roll > 0.78
          ? new THREE.Color("#9fd4ff")
          : roll > 0.55
            ? new THREE.Color("#fff4d2")
            : new THREE.Color("#ffffff");
    starColors[index * 3] = color.r;
    starColors[index * 3 + 1] = color.g;
    starColors[index * 3 + 2] = color.b;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(starPositions, 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(starColors, 3));
  scene.add(
    new THREE.Points(
      geometry,
      new THREE.PointsMaterial({
        vertexColors: true,
        size,
        transparent: true,
        opacity,
        sizeAttenuation: true,
        depthWrite: false,
      })
    )
  );

  if (
    twinkleChance <= 0 ||
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  ) {
    return;
  }

  const twinkles = [];
  for (let index = 0; index < starCount; index += 1) {
    if (Math.random() > twinkleChance) continue;
    twinkles.push({
      index,
      phase: Math.random() * Math.PI * 2,
      speed: 0.7 + Math.random() * 1.8,
      floor: 0.28 + Math.random() * 0.18,
    });
  }
  twinkleLayers.push({
    colors: geometry.attributes.color,
    base: starColors.slice(),
    twinkles,
  });
}

function updateStarTwinkle(time) {
  twinkleLayers.forEach((layer) => {
    const live = layer.colors.array;
    layer.twinkles.forEach((star) => {
      const wave = (Math.sin(time * star.speed + star.phase) + 1) * 0.5;
      const flash = Math.pow(wave, 6);
      const bright = star.floor + (1 - star.floor) * (0.35 * wave + 0.65 * flash);
      const i = star.index * 3;
      live[i] = layer.base[i] * bright;
      live[i + 1] = layer.base[i + 1] * bright;
      live[i + 2] = layer.base[i + 2] * bright;
    });
    layer.colors.needsUpdate = true;
  });
}

function addSpiralGalaxy() {
  const galaxy = new THREE.Group();
  galaxy.position.set(-34, 7.2, -29);
  galaxy.rotation.set(1.02, 0.48, -0.28);

  const count = 9200;
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const arms = 3;
  const core = new THREE.Color("#ffe1b0");
  const arm = new THREE.Color("#a8c9ff");
  const dust = new THREE.Color("#ff9adf");

  for (let index = 0; index < count; index += 1) {
    const inBulge = index < count * 0.16;
    let x;
    let y;
    let z;
    const mix = new THREE.Color();

    if (inBulge) {
      const radius = Math.pow(Math.random(), 0.55) * 1.55;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(THREE.MathUtils.randFloatSpread(2));
      x = radius * Math.sin(phi) * Math.cos(theta);
      y = radius * Math.cos(phi) * 0.62;
      z = radius * Math.sin(phi) * Math.sin(theta);
      mix.copy(core);
    } else {
      const t = Math.random();
      const radius = Math.pow(t, 0.62) * 9.4;
      const armIndex = Math.floor(Math.random() * arms);
      const swirl = radius * 1.28;
      const angle =
        (armIndex / arms) * Math.PI * 2 +
        swirl +
        (Math.random() - 0.5) * 0.32;
      x = Math.cos(angle) * radius;
      z = Math.sin(angle) * radius;
      y = (Math.random() - 0.5) * (0.16 + (1 - radius / 9.4) * 0.7);
      mix.lerpColors(arm, dust, Math.random() * 0.35);
      mix.lerp(core, Math.max(0, 1 - radius / 5.5) * 0.55);
    }

    positions[index * 3] = x;
    positions[index * 3 + 1] = y;
    positions[index * 3 + 2] = z;
    colors[index * 3] = mix.r;
    colors[index * 3 + 1] = mix.g;
    colors[index * 3 + 2] = mix.b;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

  const stars = new THREE.Points(
    geometry,
    new THREE.PointsMaterial({
      vertexColors: true,
      size: 0.085,
      transparent: true,
      opacity: 0.92,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
      map: makeGlowTexture("#ffffff"),
    })
  );
  galaxy.add(stars);

  const bulge = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: makeGlowTexture("#ffe6b8"),
      color: "#ffd7a0",
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      opacity: 0.7,
    })
  );
  bulge.scale.set(4.8, 3.4, 1);
  galaxy.add(bulge);

  scene.add(galaxy);
  galaxyRef = galaxy;
}

function addAsteroidBelt(inner, outer) {
  const count = 700;
  const positions = new Float32Array(count * 3);

  for (let index = 0; index < count; index += 1) {
    const radius = THREE.MathUtils.lerp(inner, outer, Math.random());
    const angle = Math.random() * Math.PI * 2;
    positions[index * 3] = Math.cos(angle) * radius;
    positions[index * 3 + 1] = (Math.random() - 0.5) * 0.18;
    positions[index * 3 + 2] = Math.sin(angle) * radius;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  scene.add(
    new THREE.Points(
      geometry,
      new THREE.PointsMaterial({
        color: "#9a8870",
        size: 0.035,
        sizeAttenuation: true,
        transparent: true,
        opacity: 0.9,
      })
    )
  );
}

function hashString(value) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function hash2(x, y) {
  let n = Math.imul(x, 374761393) + Math.imul(y, 668265263);
  n = (n ^ (n >>> 13)) * 1274126177;
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
}

function smoothNoise(x, y) {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const fx = x - x0;
  const fy = y - y0;
  const sx = fx * fx * (3 - 2 * fx);
  const sy = fy * fy * (3 - 2 * fy);
  const n00 = hash2(x0, y0);
  const n10 = hash2(x0 + 1, y0);
  const n01 = hash2(x0, y0 + 1);
  const n11 = hash2(x0 + 1, y0 + 1);
  const nx0 = n00 + (n10 - n00) * sx;
  const nx1 = n01 + (n11 - n01) * sx;
  return nx0 + (nx1 - nx0) * sy;
}

function fbm(x, y, octaves = 5) {
  let value = 0;
  let amp = 0.5;
  let freq = 1;
  for (let index = 0; index < octaves; index += 1) {
    value += amp * smoothNoise(x * freq, y * freq);
    amp *= 0.5;
    freq *= 2;
  }
  return value;
}

function lerpColor(a, b, t) {
  return [
    a[0] + (b[0] - a[0]) * t,
    a[1] + (b[1] - a[1]) * t,
    a[2] + (b[2] - a[2]) * t,
  ];
}

function makePlanetMaps(kind, seed) {
  const width = 512;
  const height = 256;
  const color = document.createElement("canvas");
  const bump = document.createElement("canvas");
  const rough = document.createElement("canvas");
  const glow = document.createElement("canvas");
  color.width = bump.width = rough.width = glow.width = width;
  color.height = bump.height = rough.height = glow.height = height;

  const colorCtx = color.getContext("2d");
  const bumpCtx = bump.getContext("2d");
  const roughCtx = rough.getContext("2d");
  const glowCtx = glow.getContext("2d");
  const colorData = colorCtx.createImageData(width, height);
  const bumpData = bumpCtx.createImageData(width, height);
  const roughData = roughCtx.createImageData(width, height);
  const glowData = glowCtx.createImageData(width, height);

  const offset = (seed % 1000) / 80;
  let atmosphere = "#7ec8ff";
  let useEmissive = false;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const u = x / width;
      const v = y / height;
      const theta = u * Math.PI * 2;
      const nx = Math.cos(theta) * 2 + offset;
      const ny = Math.sin(theta) * 2;
      const nz = (v - 0.5) * 4;
      const n = fbm(nx, ny + nz, 4);
      const n2 = fbm(nx * 1.8 + 12, ny * 1.8 + nz, 3);
      const pole = Math.pow(Math.abs(v - 0.5) * 2, 3.2);

      let rgb = [0, 0, 0];
      let heightValue = n;
      let roughness = 0.72;
      let emit = 0;

      if (kind === "terra") {
        atmosphere = "#6ec8ff";
        const land = n > 0.5;
        rgb = land
          ? lerpColor([34, 82, 42], [128, 112, 58], n2)
          : lerpColor([8, 38, 102], [36, 118, 158], n);
        if (n > 0.5 && n < 0.545) rgb = lerpColor(rgb, [194, 178, 112], 0.55);
        if (pole > 0.7) rgb = lerpColor(rgb, [236, 246, 255], (pole - 0.7) / 0.3);
        roughness = land ? 0.84 : 0.22;
      } else if (kind === "mars") {
        atmosphere = "#ff8a62";
        rgb = lerpColor([96, 42, 28], [186, 92, 52], n);
        if (n2 > 0.66) rgb = lerpColor(rgb, [62, 28, 18], 0.5);
        if (pole > 0.78) rgb = lerpColor(rgb, [232, 228, 220], (pole - 0.78) / 0.22);
        roughness = 0.9;
      } else if (kind === "lava") {
        atmosphere = "#ff6a3a";
        rgb = lerpColor([18, 10, 10], [72, 32, 18], n);
        const crack = Math.abs(n2 - 0.5);
        if (crack < 0.045) {
          rgb = lerpColor([255, 210, 90], [255, 70, 20], crack / 0.045);
          emit = 1 - crack / 0.045;
          roughness = 0.2;
        }
        useEmissive = true;
      } else if (kind === "rock") {
        atmosphere = "#b8b0a6";
        rgb = lerpColor([78, 74, 70], [168, 160, 152], n);
        if (n2 > 0.7) rgb = lerpColor(rgb, [40, 38, 36], 0.6);
        roughness = 0.94;
      } else if (kind === "neptune") {
        atmosphere = "#6ec8ff";
        const band = Math.sin((v + n * 0.05) * Math.PI * 9);
        rgb = lerpColor([18, 52, 148], [72, 168, 210], band * 0.5 + 0.5);
        rgb = lerpColor(rgb, [10, 28, 92], n2 * 0.28);
        roughness = 0.4;
        heightValue = 0.5 + band * 0.05;
      } else if (kind === "ice") {
        atmosphere = "#bfe4ff";
        rgb = lerpColor([128, 196, 198], [210, 236, 232], n);
        if (n2 > 0.62) rgb = lerpColor(rgb, [80, 150, 160], 0.4);
        roughness = 0.24 + n * 0.18;
      } else if (kind === "jupiter" || kind === "gas") {
        atmosphere = "#ffd29a";
        const band = Math.sin((v + n * 0.07) * Math.PI * 16);
        rgb = lerpColor([214, 166, 112], [120, 72, 48], band * 0.5 + 0.5);
        rgb = lerpColor(rgb, [240, 214, 168], n2 * 0.28);
        const spot = Math.hypot((u - 0.68) * 1.6, (v - 0.6) * 3.2);
        if (spot < 0.085) rgb = lerpColor([196, 86, 48], rgb, spot / 0.085);
        roughness = 0.52;
        heightValue = 0.5 + band * 0.07;
      } else if (kind === "saturn") {
        atmosphere = "#ffe0b0";
        const band = Math.sin((v + n * 0.05) * Math.PI * 12);
        rgb = lerpColor([232, 206, 150], [176, 142, 88], band * 0.5 + 0.5);
        rgb = lerpColor(rgb, [248, 232, 196], n2 * 0.22);
        roughness = 0.5;
        heightValue = 0.5 + band * 0.05;
      } else {
        atmosphere = "#ffe0b8";
        rgb = lerpColor([168, 126, 72], [232, 198, 132], n);
        if (n2 > 0.7) rgb = lerpColor(rgb, [120, 86, 48], 0.45);
        roughness = 0.7;
      }

      const i = (y * width + x) * 4;
      colorData.data[i] = rgb[0];
      colorData.data[i + 1] = rgb[1];
      colorData.data[i + 2] = rgb[2];
      colorData.data[i + 3] = 255;

      const bumpTone = Math.round(heightValue * 255);
      bumpData.data[i] = bumpData.data[i + 1] = bumpData.data[i + 2] = bumpTone;
      bumpData.data[i + 3] = 255;

      const roughTone = Math.round(roughness * 255);
      roughData.data[i] = roughData.data[i + 1] = roughData.data[i + 2] = roughTone;
      roughData.data[i + 3] = 255;

      const emitTone = Math.round(emit * 255);
      glowData.data[i] = emitTone;
      glowData.data[i + 1] = Math.round(emit * 140);
      glowData.data[i + 2] = Math.round(emit * 40);
      glowData.data[i + 3] = 255;
    }
  }

  colorCtx.putImageData(colorData, 0, 0);
  bumpCtx.putImageData(bumpData, 0, 0);
  roughCtx.putImageData(roughData, 0, 0);
  glowCtx.putImageData(glowData, 0, 0);

  const map = canvasTexture(color, true);
  const bumpMap = canvasTexture(bump, false);
  const roughnessMap = canvasTexture(rough, false);
  const emissiveMap = useEmissive ? canvasTexture(glow, false) : null;

  return { map, bumpMap, roughnessMap, emissiveMap, atmosphere };
}

function makeCloudTexture(seed) {
  const width = 256;
  const height = 128;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  const image = ctx.createImageData(width, height);
  const offset = (seed % 800) / 90;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const u = x / width;
      const v = y / height;
      const theta = u * Math.PI * 2;
      const n = fbm(Math.cos(theta) * 3 + offset, Math.sin(theta) * 3 + (v - 0.5) * 5, 4);
      const alpha = Math.max(0, n - 0.55) / 0.45;
      const i = (y * width + x) * 4;
      image.data[i] = image.data[i + 1] = image.data[i + 2] = 255;
      image.data[i + 3] = Math.round(alpha * 220);
    }
  }

  ctx.putImageData(image, 0, 0);
  return canvasTexture(canvas, false);
}

function makeAtmosphere(size, color, kind) {
  const group = new THREE.Group();
  const thick = kind === "terra" || kind === "desert";
  const shell = new THREE.Mesh(
    new THREE.SphereGeometry(size * (thick ? 1.085 : 1.055), 32, 32),
    new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: thick ? 0.2 : kind === "rock" || kind === "mars" ? 0.05 : 0.11,
      side: THREE.BackSide,
      depthWrite: false,
    })
  );
  group.add(shell);
  if (thick || kind === "neptune" || kind === "ice") {
    const glow = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: makeGlowTexture(color),
        color,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        opacity: kind === "terra" ? 0.28 : 0.18,
      })
    );
    glow.scale.set(size * 2.35, size * 2.35, 1);
    group.add(glow);
  }
  return group;
}

function makeRingMesh(size, color, seed) {
  const inner = size * 1.38;
  const outer = size * 2.55;
  const geometry = new THREE.RingGeometry(inner, outer, 96);
  const uv = geometry.attributes.uv;
  const pos = geometry.attributes.position;

  for (let index = 0; index < pos.count; index += 1) {
    const x = pos.getX(index);
    const y = pos.getY(index);
    const radius = Math.hypot(x, y);
    const t = (radius - inner) / (outer - inner);
    uv.setXY(index, 0.5, t);
  }
  uv.needsUpdate = true;
  geometry.rotateX(-Math.PI / 2);
  geometry.rotateZ(0.35);

  const material = new THREE.MeshStandardMaterial({
    map: makeRingTexture(color, seed),
    transparent: true,
    side: THREE.DoubleSide,
    depthWrite: false,
    roughness: 0.62,
    metalness: 0.04,
  });

  return new THREE.Mesh(geometry, material);
}

function makeRingTexture(color, seed) {
  const width = 8;
  const height = 256;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  const image = ctx.createImageData(width, height);
  const base = new THREE.Color(color);

  for (let y = 0; y < height; y += 1) {
    const t = y / height;
    const band = Math.pow(Math.sin(t * 34 + (seed % 7)) * 0.5 + 0.5, 1.35);
    const gap = Math.abs(t - 0.42) < 0.035 ? 0 : 1;
    const edge = Math.min(t, 1 - t) < 0.04 ? Math.min(t, 1 - t) / 0.04 : 1;
    const alpha = band * gap * edge * 0.82;
    for (let x = 0; x < width; x += 1) {
      const i = (y * width + x) * 4;
      image.data[i] = Math.round(base.r * 255);
      image.data[i + 1] = Math.round(base.g * 255);
      image.data[i + 2] = Math.round(base.b * 255);
      image.data[i + 3] = Math.round(alpha * 255);
    }
  }

  ctx.putImageData(image, 0, 0);
  const texture = canvasTexture(canvas, false);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  return texture;
}

function canvasTexture(canvas, srgb = true) {
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = srgb
    ? THREE.SRGBColorSpace
    : THREE.NoColorSpace ?? THREE.LinearSRGBColorSpace;
  texture.anisotropy = 4;
  texture.needsUpdate = true;
  return texture;
}

function showGalaxyError(error) {
  const note = document.createElement("p");
  note.className = "planet-hint";
  note.style.color = "#ff6b8a";
  note.textContent = `3D galaxy failed to load: ${error?.message || error}`;
  viewport?.insertAdjacentElement("afterend", note);
}

function makeSunTexture() {
  const width = 256;
  const height = 128;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  const image = ctx.createImageData(width, height);

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const u = x / width;
      const v = y / height;
      const theta = u * Math.PI * 2;
      const n = fbm(Math.cos(theta) * 3, Math.sin(theta) * 3 + (v - 0.5) * 4, 5);
      const n2 = fbm(Math.cos(theta) * 8 + 9, Math.sin(theta) * 8 + v * 6, 3);
      const rgb = lerpColor([255, 176, 64], [255, 236, 170], n * 0.65 + n2 * 0.35);
      const i = (y * width + x) * 4;
      image.data[i] = rgb[0];
      image.data[i + 1] = rgb[1];
      image.data[i + 2] = rgb[2];
      image.data[i + 3] = 255;
    }
  }

  ctx.putImageData(image, 0, 0);
  return canvasTexture(canvas, true);
}

function makeGlowTexture(color = "#ffd28a") {
  const glowCanvas = document.createElement("canvas");
  glowCanvas.width = 128;
  glowCanvas.height = 128;
  const context = glowCanvas.getContext("2d");
  const tint = new THREE.Color(color);
  const gradient = context.createRadialGradient(64, 64, 0, 64, 64, 64);

  gradient.addColorStop(0, "rgba(255,255,255,1)");
  gradient.addColorStop(
    0.18,
    `rgba(${Math.round(tint.r * 255)},${Math.round(tint.g * 255)},${Math.round(tint.b * 255)},0.85)`
  );
  gradient.addColorStop(
    0.48,
    `rgba(${Math.round(tint.r * 255)},${Math.round(tint.g * 255)},${Math.round(tint.b * 255)},0.22)`
  );
  gradient.addColorStop(1, "rgba(0,0,0,0)");

  context.fillStyle = gradient;
  context.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(glowCanvas);
}

function setupCursorTrail() {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    updateCursorTrail = () => {};
    return;
  }

  const trailCanvas = document.createElement("canvas");
  trailCanvas.className = "cursor-trail";
  trailCanvas.setAttribute("aria-hidden", "true");
  document.body.append(trailCanvas);

  const trailCtx = trailCanvas.getContext("2d");
  const sparks = [];
  let lastPoint = null;

  function fitTrail() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    trailCanvas.width = Math.floor(window.innerWidth * dpr);
    trailCanvas.height = Math.floor(window.innerHeight * dpr);
    trailCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function addSpark(x, y, strength) {
    sparks.push({
      x: x + (Math.random() - 0.5) * 2,
      y: y + (Math.random() - 0.5) * 2,
      life: 1,
      decay: 0.08 + Math.random() * 0.04,
      size: (1.6 + Math.random() * 1.8) * strength,
    });
  }

  window.addEventListener("pointermove", (event) => {
    const x = event.clientX;
    const y = event.clientY;

    if (lastPoint) {
      const dx = x - lastPoint.x;
      const dy = y - lastPoint.y;
      const distance = Math.hypot(dx, dy);
      const steps = Math.min(3, Math.floor(distance / 14));
      for (let index = 1; index <= steps; index += 1) {
        addSpark(
          lastPoint.x + (dx * index) / (steps + 1),
          lastPoint.y + (dy * index) / (steps + 1),
          0.35
        );
      }
    }

    addSpark(x, y, 0.7);
    lastPoint = { x, y };
    if (sparks.length > 28) sparks.splice(0, sparks.length - 28);
  });

  window.addEventListener("pointerleave", () => {
    lastPoint = null;
  });

  window.addEventListener("resize", fitTrail);
  fitTrail();

  updateCursorTrail = () => {
    trailCtx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    trailCtx.globalCompositeOperation = "lighter";

    for (let index = sparks.length - 1; index >= 0; index -= 1) {
      const spark = sparks[index];
      spark.life -= spark.decay;
      if (spark.life <= 0) {
        sparks.splice(index, 1);
        continue;
      }

      const radius = spark.size * (0.4 + spark.life * 0.6);
      const glow = trailCtx.createRadialGradient(
        spark.x,
        spark.y,
        0,
        spark.x,
        spark.y,
        radius * 2.2
      );
      glow.addColorStop(0, `rgba(255, 248, 230, ${0.28 * spark.life})`);
      glow.addColorStop(0.4, `rgba(255, 196, 92, ${0.12 * spark.life})`);
      glow.addColorStop(1, "rgba(255, 140, 60, 0)");
      trailCtx.fillStyle = glow;
      trailCtx.beginPath();
      trailCtx.arc(spark.x, spark.y, radius * 2.2, 0, Math.PI * 2);
      trailCtx.fill();
    }

    trailCtx.globalCompositeOperation = "source-over";
  };
}

let updateCursorTrail = () => {};
let startRockyIntro = () => {};

function setupRockyChat() {
  const chat = document.getElementById("rocky-chat");
  const greeting = document.getElementById("rocky-greeting");
  const speakCaret = document.getElementById("rocky-speak-caret");
  if (!chat || !greeting) return;

  const greetingText =
    "Hello, press on the projects button and choose what project you want to see";
  const reducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;
  let started = false;

  function finishSpeaking() {
    if (speakCaret) speakCaret.hidden = true;
  }

  function typeInto(el, text, done) {
    let index = 0;
    const typeNext = () => {
      if (index >= text.length) {
        done();
        return;
      }
      el.textContent += text[index];
      const letter = text[index];
      index += 1;
      const pause = letter === "," ? 260 : 72;
      window.setTimeout(typeNext, pause);
    };
    typeNext();
  }

  startRockyIntro = () => {
    if (started) return;
    started = true;
    chat.hidden = false;

    if (reducedMotion) {
      greeting.textContent = greetingText;
      finishSpeaking();
      return;
    }

    if (speakCaret) speakCaret.hidden = false;
    typeInto(greeting, greetingText, finishSpeaking);
  };

  startRockyIntro();
}

function setupProjectMenu() {
  const menu = document.getElementById("planet-menu");
  const label = menu?.querySelector(".planet-menu-label");
  const list = menu?.querySelector(".planet-menu-list");
  if (!menu || !label || !list) return;

  const items = projects.filter((project) => project?.title);
  if (!items.length) {
    menu.hidden = true;
    return;
  }

  list.replaceChildren(
    ...items.map((project) => {
      const item = document.createElement("li");
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = project.title;
      button.addEventListener("click", () => {
        showProject(project);
        closeMenu();
      });
      item.append(button);
      return item;
    })
  );

  function closeMenu() {
    list.hidden = true;
    label.setAttribute("aria-expanded", "false");
  }

  function toggleMenu() {
    const open = list.hidden;
    list.hidden = !open;
    label.setAttribute("aria-expanded", String(open));
  }

  label.addEventListener("click", (event) => {
    event.stopPropagation();
    toggleMenu();
  });

  menu.addEventListener("pointerdown", (event) => {
    event.stopPropagation();
  });

  document.addEventListener("click", (event) => {
    if (!menu.contains(event.target)) closeMenu();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeMenu();
  });
}

window.addEventListener("resize", resize);
resize();
setupCursorTrail();
setupRockyChat();
setupProjectMenu();
animate();
