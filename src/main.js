import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';

const products = [
  { id: 'p1', name: 'Product 1', price: '$29.99', file: '/models/model1.glb' },
  { id: 'p2', name: 'Product 2', price: '$49.99', file: '/models/model2.glb' },
  { id: 'p3', name: 'Product 3', price: '$89.99', file: '/models/model3.glb' },
  { id: 'p4', name: 'Product 4', price: '$129.99', file: '/models/model4.glb' },
  { id: 'p5', name: 'Product 5', price: '$199.99', file: '/models/model5.glb' },
];

const textureBatches = [
  { id: 'b1', name: 'Batch 1', path: '/textures/batch1' },
  { id: 'b2', name: 'Batch 2', path: '/textures/batch2' },
  { id: 'b3', name: 'Batch 3', path: '/textures/batch3' },
  { id: 'b4', name: 'Batch 4', path: '/textures/batch4' },
  { id: 'b5', name: 'Batch 5', path: '/textures/batch5' },
  { id: 'b6', name: 'Batch 6', path: '/textures/batch6' },
];

const grid = document.getElementById('product-grid');
const textureLoader = new THREE.TextureLoader();

products.forEach((prod) => {
  const card = document.createElement('div');
  card.className = 'card';
  
  const swatchesHTML = textureBatches
    .map((batch, index) => `
      <button 
        class="swatch ${index === 0 ? 'active' : ''}" 
        style="background-image: url('${batch.path}/Fabric_Mat_F_BaseColor.jpg')" 
        data-path="${batch.path}"
        title="${batch.name}">
      </button>`)
    .join('');

  card.innerHTML = `
    <div class="canvas-box" id="canvas-${prod.id}"></div>
    <div class="details">
      <div class="title">${prod.name}</div>
      <div class="price">${prod.price}</div>
      <div class="color-section">
        <span>Texture Options</span>
        <div class="swatches" id="swatches-${prod.id}">${swatchesHTML}</div>
      </div>
    </div>
  `;
  grid.appendChild(card);

  initThreeViewer(prod.id, prod.file);
});

function initThreeViewer(id, modelPath) {
  const container = document.getElementById(`canvas-${id}`);
  if (!container) return;

  const width = container.clientWidth || 300;
  const height = container.clientHeight || 280;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xf8f9fa);

  const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
  camera.position.set(0, 1.2, 3.2);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  container.appendChild(renderer.domElement);

  // Load Studio Environment
  const rgbeLoader = new RGBELoader();
  rgbeLoader.load(
    'https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/studio_small_09_1k.hdr',
    (texture) => {
      texture.mapping = THREE.EquirectangularReflectionMapping;
      scene.environment = texture;
    }
  );

  // Orbit controls with top-view allowed and under-view blocked
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.minPolarAngle = 0;
  controls.maxPolarAngle = Math.PI / 2;
  controls.enablePan = false;

  let loadedModel = null;

  function applyTextureBatch(batchPath) {
    if (!loadedModel) return;

    textureLoader.load(`${batchPath}/Fabric_Mat_F_BaseColor.jpg`, (baseColorMap) => {
      baseColorMap.colorSpace = THREE.SRGBColorSpace;
      baseColorMap.flipY = false;

      const metallicMap = textureLoader.load(`${batchPath}/Fabric_Mat_F_Metallic.jpg`);
      const normalMap = textureLoader.load(`${batchPath}/Fabric_Mat_F_Normal.jpg`);
      const roughnessMap = textureLoader.load(`${batchPath}/Fabric_Mat_F_Roughness.jpg`);

      [metallicMap, normalMap, roughnessMap].forEach(t => { t.flipY = false; });

      loadedModel.traverse((child) => {
        if (child.isMesh) {
          child.material.map = baseColorMap;
          child.material.normalMap = normalMap;
          child.material.roughnessMap = roughnessMap;
          child.material.metalnessMap = metallicMap;
          
          // Fabric material properties
          child.material.metalness = 0.0;
          child.material.roughness = 0.85;
          child.material.needsUpdate = true;
        }
      });
    });
  }

  // Load GLB
  const loader = new GLTFLoader();
  loader.load(
    modelPath,
    (gltf) => {
      loadedModel = gltf.scene;

      const wrapper = new THREE.Group();
      wrapper.add(loadedModel);

      const box = new THREE.Box3().setFromObject(loadedModel);
      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());

      loadedModel.position.set(-center.x, -center.y, -center.z);

      const maxDim = Math.max(size.x, size.y, size.z);
      if (maxDim > 0) {
        const scale = 1.8 / maxDim;
        wrapper.scale.set(scale, scale, scale);
      }

      scene.add(wrapper);
    },
    undefined,
    (err) => console.error(`Error loading model ${modelPath}:`, err)
  );

  // Swatch click logic
  const swatchContainer = document.getElementById(`swatches-${id}`);
  swatchContainer.addEventListener('click', (e) => {
    const target = e.target.closest('.swatch');
    if (!target) return;

    const batchPath = target.getAttribute('data-path');
    if (batchPath) {
      swatchContainer.querySelectorAll('.swatch').forEach(btn => btn.classList.remove('active'));
      target.classList.add('active');
      applyTextureBatch(batchPath);
    }
  });

  window.addEventListener('resize', () => {
    const w = container.clientWidth;
    const h = container.clientHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  });

  function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
  }
  animate();
}