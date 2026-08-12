import './style.css';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

// Sample product catalog data
const products = [
  {
    id: 'product-1',
    name: 'Product 1',
    price: '$29.99',
    modelPath: '/models/sofa.glb', // Path to your GLB in public/
    colors: [
      { name: 'Dark Red', hex: '#631d22', texture: '/textures/red.jpg' },
      { name: 'Navy Blue', hex: '#2b4162', texture: '/textures/blue.jpg' }
    ]
  },
  {
    id: 'product-2',
    name: 'Product 2',
    price: '$49.99',
    modelPath: '/models/sofa.glb',
    colors: [
      { name: 'Dark Red', hex: '#631d22', texture: '/textures/red.jpg' },
      { name: 'Navy Blue', hex: '#2b4162', texture: '/textures/blue.jpg' }
    ]
  },
  {
    id: 'product-3',
    name: 'Product 3',
    price: '$89.99',
    modelPath: '/models/sofa.glb',
    colors: [
      { name: 'Dark Red', hex: '#631d22', texture: '/textures/red.jpg' },
      { name: 'Navy Blue', hex: '#2b4162', texture: '/textures/blue.jpg' }
    ]
  },
  {
    id: 'product-4',
    name: 'Product 4',
    price: '$129.99',
    modelPath: '/models/sofa.glb',
    colors: [
      { name: 'Dark Red', hex: '#631d22', texture: '/textures/red.jpg' },
      { name: 'Navy Blue', hex: '#2b4162', texture: '/textures/blue.jpg' }
    ]
  }
];

const textureLoader = new THREE.TextureLoader();
const gltfLoader = new GLTFLoader();

// Initialize application
document.addEventListener('DOMContentLoaded', () => {
  renderApp();
  setupModalHandlers();
});

function renderApp() {
  const appContainer = document.querySelector('#app') || document.body;
  
  // Clean container setup
  appContainer.innerHTML = `
    <header class="header">
      <h1>Amazon 3D Showcase</h1>
      <p>Featured 3D Products</p>
    </header>
    <main class="product-grid" id="product-grid"></main>
    
    <!-- AR QR Code Modal -->
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

  const grid = document.querySelector('#product-grid');

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

    // Initialize Three.js scene for this product card
    initCard3DScene(product);
  });
}

function initCard3DScene(product) {
  const container = document.getElementById(`canvas-${product.id}`);
  if (!container) return;

  // Track active texture state
  let selectedTexturePath = product.colors[0]?.texture || '';

  // 1. Three.js Scene Setup
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#f8f9fa');

  // 2. Camera setup with dynamic aspect ratio calculation
  const width = container.clientWidth || 300;
  const height = container.clientHeight || 300;
  const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);

  // 3. WebGL Renderer configuration
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(width, height, false);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  container.appendChild(renderer.domElement);

  // 4. Orbit Controls (Rotation locked to prevent looking under)
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.enablePan = false;
  controls.maxPolarAngle = Math.PI / 2 - 0.05; // Restrict downward movement
  controls.minPolarAngle = Math.PI / 6;

  // 5. Lighting
  const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
  scene.add(ambientLight);

  const dirLight = new THREE.DirectionalLight(0xffffff, 1.5);
  dirLight.position.set(5, 10, 7);
  scene.add(dirLight);

  let loadedMesh = null;

  // 6. Load GLB Model and auto-center to prevent stretching/distortion
  gltfLoader.load(
    product.modelPath,
    (gltf) => {
      loadedMesh = gltf.scene;

      // Auto-center and fit model into view
      const box = new THREE.Box3().setFromObject(loadedMesh);
      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());

      loadedMesh.position.sub(center); // Center model origin
      scene.add(loadedMesh);

      // Adjust camera distance dynamically based on object size
      const maxDim = Math.max(size.x, size.y, size.z);
      const fov = camera.fov * (Math.PI / 180);
      let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2)) * 1.6;

      camera.position.set(0, size.y * 0.4, cameraZ);
      camera.lookAt(0, 0, 0);
      controls.target.set(0, 0, 0);
      controls.update();

      // Apply initial color texture if present
      if (selectedTexturePath) {
        applyTextureToMesh(loadedMesh, selectedTexturePath);
      }
    },
    undefined,
    (err) => console.error(`Error loading model for ${product.id}:`, err)
  );

  // 7. Render Color Swatches
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

        selectedTexturePath = color.texture;
        if (loadedMesh) {
          applyTextureToMesh(loadedMesh, color.texture);
        }
      });

      swatchesContainer.appendChild(swatch);
    });
  }

  // 8. AR Button Event Handler
  const arBtn = document.getElementById(`ar-btn-${product.id}`);
  if (arBtn) {
    arBtn.addEventListener('click', () => {
      openARModal(product.modelPath, selectedTexturePath);
    });
  }

  // 9. Keep aspect ratio in sync when window resizes
  const resizeObserver = new ResizeObserver(() => {
    const w = container.clientWidth;
    const h = container.clientHeight;
    if (w > 0 && h > 0) {
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);
    }
  });
  resizeObserver.observe(container);

  // 10. Animation Loop
  function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
  }
  animate();
}

// Helper to apply textures dynamically
function applyTextureToMesh(mesh, texturePath) {
  textureLoader.load(texturePath, (texture) => {
    texture.flipY = false;
    texture.colorSpace = THREE.SRGBColorSpace;
    mesh.traverse((child) => {
      if (child.isMesh && child.material) {
        child.material.map = texture;
        child.material.needsUpdate = true;
      }
    });
  });
}

// Helper to construct absolute AR URLs and show QR modal
function openARModal(modelRelativePath, textureRelativePath) {
  const modal = document.getElementById('ar-modal');
  const qrImg = document.getElementById('qr-image');

  // Convert relative paths to fully qualified absolute HTTP(S) URLs for mobile devices
  const fullModelUrl = new URL(modelRelativePath, window.location.origin).href;
  const fullTextureUrl = textureRelativePath ? new URL(textureRelativePath, window.location.origin).href : '';

  // Construct target AR page link
  const arPageUrl = new URL(`${window.location.origin}/ar.html`);
  arPageUrl.searchParams.set('model', fullModelUrl);
  if (fullTextureUrl) {
    arPageUrl.searchParams.set('color', fullTextureUrl);
  }

  // Generate QR Code dynamic image endpoint
  const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(arPageUrl.toString())}`;

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