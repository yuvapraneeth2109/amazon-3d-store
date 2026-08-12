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
    currentColor: '#ffffff',
    colors: [
      { name: 'Original', hex: '#ffffff' },
      { name: 'Navy Blue', hex: '#2b4162' },
      { name: 'Burgundy', hex: '#631d22' }
    ]
  },
  {
    id: 'product-2',
    name: 'Nordic Accent Sofa',
    price: '$389.99',
    modelPath: '/models/model2.glb',
    currentColor: '#ffffff',
    colors: [
      { name: 'Original', hex: '#ffffff' },
      { name: 'Navy Blue', hex: '#2b4162' },
      { name: 'Burgundy', hex: '#631d22' }
    ]
  },
  {
    id: 'product-3',
    name: 'Minimalist Lounge Sofa',
    price: '$420.00',
    modelPath: '/models/model3.glb',
    currentColor: '#ffffff',
    colors: [
      { name: 'Original', hex: '#ffffff' },
      { name: 'Navy Blue', hex: '#2b4162' },
      { name: 'Charcoal', hex: '#333333' }
    ]
  },
  {
    id: 'product-4',
    name: 'Executive Recliner Sofa',
    price: '$549.99',
    modelPath: '/models/model4.glb',
    currentColor: '#ffffff',
    colors: [
      { name: 'Original', hex: '#ffffff' },
      { name: 'Forest Green', hex: '#1c3b2b' },
      { name: 'Navy Blue', hex: '#2b4162' }
    ]
  },
  {
    id: 'product-5',
    name: 'Luxury Sectional Sofa',
    price: '$699.99',
    modelPath: '/models/model5.glb',
    currentColor: '#ffffff',
    colors: [
      { name: 'Original', hex: '#ffffff' },
      { name: 'Charcoal', hex: '#333333' },
      { name: 'Cream', hex: '#d1c7bd' }
    ]
  }
];

const gltfLoader = new GLTFLoader();

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
          <span>Select Color</span>
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

  // Restricts camera from moving under ground level
  controls.maxPolarAngle = Math.PI / 2 - 0.05;
  controls.minPolarAngle = 0.1;

  // Lighting
  const ambientLight = new THREE.AmbientLight(0xffffff, 2.0);
  scene.add(ambientLight);

  const dirLight = new THREE.DirectionalLight(0xffffff, 2.5);
  dirLight.position.set(5, 10, 7);
  scene.add(dirLight);

  let loadedMesh = null;

  // Load GLB model
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
    },
    undefined,
    (err) => console.error(`Failed to load ${product.modelPath}:`, err)
  );

  // Color Swatch handling
  const swatchesContainer = document.getElementById(`swatches-${product.id}`);
  if (swatchesContainer) {
    product.colors.forEach((color, index) => {
      const swatch = document.createElement('button');
      swatch.className = `swatch ${index === 0 ? 'active' : ''}`;
      swatch.style.backgroundColor = color.hex;

      swatch.addEventListener('click', () => {
        swatchesContainer.querySelectorAll('.swatch').forEach((s) => s.classList.remove('active'));
        swatch.classList.add('active');

        // Update active color tracking on the product
        product.currentColor = color.hex;

        if (loadedMesh) {
          loadedMesh.traverse((child) => {
            if (child.isMesh && child.material) {
              child.material.color.set(color.hex);
            }
          });
        }
      });

      swatchesContainer.appendChild(swatch);
    });
  }

  // Open AR Modal trigger
  const arBtn = document.getElementById(`ar-btn-${product.id}`);
  if (arBtn) {
    arBtn.addEventListener('click', () => {
      openARModal(product.modelPath, product.currentColor);
    });
  }

  function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
  }
  animate();
}

function openARModal(modelRelativePath, selectedColorHex) {
  const modal = document.getElementById('ar-modal');
  const qrImg = document.getElementById('qr-image');

  const absoluteModelUrl = new URL(modelRelativePath, window.location.origin).href;
  const arPageUrl = new URL('/ar.html', window.location.origin);
  arPageUrl.searchParams.set('model', absoluteModelUrl);

  // Pass active color hex to AR page
  if (selectedColorHex) {
    arPageUrl.searchParams.set('color', selectedColorHex);
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