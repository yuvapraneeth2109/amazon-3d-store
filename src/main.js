import './style.css';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

const products = [
  {
    id: 'product-1',
    name: 'Modern Velvet Sofa',
    price: '$299.99',
    modelPath: '/models/model1.glb',
    currentColorKey: 'red',
    colors: [
      { name: 'Red Fabric', key: 'red', hex: '#7a1f1d' },
      { name: 'Blue Fabric', key: 'blue', hex: '#213348' }
    ]
  },
  {
    id: 'product-2',
    name: 'Nordic Accent Sofa',
    price: '$389.99',
    modelPath: '/models/model2.glb',
    currentColorKey: 'red',
    colors: [
      { name: 'Red Fabric', key: 'red', hex: '#7a1f1d' },
      { name: 'Blue Fabric', key: 'blue', hex: '#213348' }
    ]
  },
  {
    id: 'product-3',
    name: 'Minimalist Lounge Sofa',
    price: '$420.00',
    modelPath: '/models/model3.glb',
    currentColorKey: 'red',
    colors: [
      { name: 'Red Fabric', key: 'red', hex: '#7a1f1d' },
      { name: 'Blue Fabric', key: 'blue', hex: '#213348' }
    ]
  },
  {
    id: 'product-4',
    name: 'Executive Recliner Sofa',
    price: '$549.99',
    modelPath: '/models/model4.glb',
    currentColorKey: 'red',
    colors: [
      { name: 'Red Fabric', key: 'red', hex: '#7a1f1d' },
      { name: 'Blue Fabric', key: 'blue', hex: '#213348' }
    ]
  },
  {
    id: 'product-5',
    name: 'Luxury Sectional Sofa',
    price: '$699.99',
    modelPath: '/models/model5.glb',
    currentColorKey: 'red',
    colors: [
      { name: 'Red Fabric', key: 'red', hex: '#7a1f1d' },
      { name: 'Blue Fabric', key: 'blue', hex: '#213348' }
    ]
  }
];

const gltfLoader = new GLTFLoader();
const textureLoader = new THREE.TextureLoader();

// Some fabric colors (like navy) photograph much darker than others once lit,
// even with identical scene lighting — this is a property of the texture
// itself, not the lights. This multiplier brightens the BaseColor texture
// per swatch before lighting so dark colors don't render near-black.
// Tune these values (1.0 = no change) if a color still looks off.
const COLOR_BRIGHTNESS = {
  red: 1.0,
  blue: 2.6
};

function applyTextureSet(loadedMesh, colorKey) {
  if (!loadedMesh) return;

  loadedMesh.traverse((child) => {
    if (child.isMesh && child.material) {
      const matName = child.material.name || '';

      const matMatch = matName.match(/Fabric_Mat_[A-G]/i);
      const targetMatName = matMatch ? matMatch[0] : 'Fabric_Mat_A';

      const basePath = `/textures/${colorKey}/${targetMatName}`;

      const baseColorTex = textureLoader.load(`${basePath}_BaseColor.jpg`);
      baseColorTex.colorSpace = THREE.SRGBColorSpace;
      baseColorTex.flipY = false;

      const metallicTex = textureLoader.load(`${basePath}_Metallic.jpg`);
      metallicTex.flipY = false;

      const normalTex = textureLoader.load(`${basePath}_Normal.jpg`);
      normalTex.flipY = false;

      const roughnessTex = textureLoader.load(`${basePath}_Roughness.jpg`);
      roughnessTex.flipY = false;

      child.material.map = baseColorTex;
      child.material.metalnessMap = metallicTex;
      child.material.normalMap = normalTex;
      child.material.roughnessMap = roughnessTex;

      const brightness = COLOR_BRIGHTNESS[colorKey] ?? 1.0;
      child.material.color.setScalar(brightness);

      child.material.needsUpdate = true;
    }
  });
}

function init() {
  const app = document.getElementById('app');
  if (!app) return;

  app.innerHTML = `
    <header class="header">
      <h1>Amazon 3D Showcase</h1>
      <p>Featured 3D Products</p>
    </header>
    <main class="product-grid" id="product-grid"></main>
    
    <div id="ar-modal" class="modal hidden">
      <div class="modal-content">
        <button class="close-btn" id="modal-close">&times;</button>
        <h2>Scan with your phone camera</h2>
        <p>Experience this product in Augmented Reality in your room</p>
        <div class="qr-container">
          <img id="qr-image" src="" alt="AR QR Code" />
        </div>
      </div>
    </div>
  `;

  const grid = document.getElementById('product-grid');

  products.forEach((product) => {
    const card = document.createElement('div');
    card.className = 'product-card';
    card.innerHTML = `
      <div class="canvas-container" id="canvas-${product.id}"></div>
      <div class="product-info">
        <h3>${product.name}</h3>
        <p class="price">${product.price}</p>
        <div class="color-selector">
          <span>Select Texture</span>
          <div class="swatches" id="swatches-${product.id}"></div>
        </div>
        <button class="ar-btn" id="ar-btn-${product.id}">
          👓 View in VR / AR
        </button>
      </div>
    `;
    grid.appendChild(card);

    setTimeout(() => initCard3DScene(product), 0);
  });

  setupModalHandlers();
}

function initCard3DScene(product) {
  const container = document.getElementById(`canvas-${product.id}`);
  if (!container) return;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#fbfbfd');

  const width = container.clientWidth || 280;
  const height = container.clientHeight || 280;

  const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  container.appendChild(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;

  controls.maxPolarAngle = Math.PI / 2 - 0.05;
  controls.minPolarAngle = 0.1;

  // Lighting Setup
  const ambientLight = new THREE.AmbientLight(0xffffff, 2.0);
  scene.add(ambientLight);

  // Reduced North-East directional light intensity from 2.5 to 0.8
  const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
  dirLight.position.set(5, 10, 7);
  scene.add(dirLight);

  let loadedMesh = null;

  gltfLoader.load(
    product.modelPath,
    (gltf) => {
      loadedMesh = gltf.scene;

      const box = new THREE.Box3().setFromObject(loadedMesh);
      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());

      loadedMesh.position.sub(center);
      scene.add(loadedMesh);

      const maxDim = Math.max(size.x, size.y, size.z);
      const fov = camera.fov * (Math.PI / 180);
      let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2)) * 2.2;

      camera.position.set(0, size.y * 0.4, cameraZ);
      camera.lookAt(0, 0, 0);
      controls.target.set(0, 0, 0);
      controls.update();

      applyTextureSet(loadedMesh, product.currentColorKey);
    },
    undefined,
    (err) => console.error(`Failed to load ${product.modelPath}:`, err)
  );

  const swatchesContainer = document.getElementById(`swatches-${product.id}`);
  if (swatchesContainer) {
    product.colors.forEach((color, index) => {
      const swatch = document.createElement('button');
      swatch.className = `swatch ${index === 0 ? 'active' : ''}`;
      swatch.style.backgroundColor = color.hex;
      swatch.title = color.name;

      swatch.addEventListener('click', () => {
        swatchesContainer.querySelectorAll('.swatch').forEach((s) => s.classList.remove('active'));
        swatch.classList.add('active');

        product.currentColorKey = color.key;
        applyTextureSet(loadedMesh, color.key);
      });

      swatchesContainer.appendChild(swatch);
    });
  }

  const arBtn = document.getElementById(`ar-btn-${product.id}`);
  if (arBtn) {
    arBtn.addEventListener('click', () => {
      openARModal(product.modelPath, product.currentColorKey);
    });
  }

  function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
  }
  animate();
}

function openARModal(modelRelativePath, selectedColorKey) {
  const modal = document.getElementById('ar-modal');
  const qrImg = document.getElementById('qr-image');

  const absoluteModelUrl = new URL(modelRelativePath, window.location.origin).href;
  const arPageUrl = new URL('/ar.html', window.location.origin);
  arPageUrl.searchParams.set('model', absoluteModelUrl);

  if (selectedColorKey) {
    arPageUrl.searchParams.set('texture', selectedColorKey);
  }

  const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(
    arPageUrl.toString()
  )}`;

  qrImg.src = qrApiUrl;
  modal.classList.remove('hidden');
}

function setupModalHandlers() {
  const modal = document.getElementById('ar-modal');
  const closeBtn = document.getElementById('modal-close');

  if (closeBtn && modal) {
    closeBtn.addEventListener('click', () => modal.classList.add('hidden'));
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.classList.add('hidden');
    });
  }
}

document.addEventListener('DOMContentLoaded', init);