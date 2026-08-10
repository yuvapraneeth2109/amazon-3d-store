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
  { id: 'b1', name: 'Batch 1', path: '/textures/batch1', prefix: 'Fabric_Mat_A' },
  { id: 'b2', name: 'Batch 2', path: '/textures/batch2', prefix: 'Fabric_Mat_B' },
  { id: 'b3', name: 'Batch 3', path: '/textures/batch3', prefix: 'Fabric_Mat_C' },
  { id: 'b4', name: 'Batch 4', path: '/textures/batch4', prefix: 'Fabric_Mat_D' },
  { id: 'b5', name: 'Batch 5', path: '/textures/batch5', prefix: 'Fabric_Mat_E' },
  { id: 'b6', name: 'Batch 6', path: '/textures/batch6', prefix: 'Fabric_Mat_F' },
];

const grid = document.getElementById('product-grid');
const textureLoader = new THREE.TextureLoader();

// Render product cards and swatch buttons
products.forEach((prod) => {
  const card = document.createElement('div');
  card.className = 'card';
  
  const swatchesHTML = textureBatches
    .map((batch, index) => `
      <button 
        class="swatch ${index === 0 ? 'active' : ''}" 
        style="background-image: url('${batch.path}/${batch.prefix}_BaseColor.jpg')" 
        data-path="${batch.path}"
        data-prefix="${batch.prefix}"
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
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);

  // Environment HDRI Lighting
  const rgbeLoader = new RGBELoader();
  rgbeLoader.load(
    'https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/studio_small_09_1k.hdr',
    (hdrTexture) => {
      hdrTexture.mapping = THREE.EquirectangularReflectionMapping;
      scene.environment = hdrTexture;
    }
  );

  // Key Shadow Light
  const shadowLight = new THREE.DirectionalLight(0xffffff, 1.2);
  shadowLight.position.set(2, 4, 2);
  shadowLight.castShadow = true;
  shadowLight.shadow.mapSize.width = 1024;
  shadowLight.shadow.mapSize.height = 1024;
  shadowLight.shadow.bias = -0.0001;
  scene.add(shadowLight);

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambientLight);

  // Ground Contact Shadow Catcher
  const shadowPlaneGeo = new THREE.PlaneGeometry(10, 10);
  const shadowPlaneMat = new THREE.ShadowMaterial({ opacity: 0.25 });
  const shadowPlane = new THREE.Mesh(shadowPlaneGeo, shadowPlaneMat);
  shadowPlane.rotation.x = -Math.PI / 2;
  shadowPlane.position.y = -0.01;
  shadowPlane.receiveShadow = true;
  scene.add(shadowPlane);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.minPolarAngle = 0;
  controls.maxPolarAngle = Math.PI / 2;
  controls.enablePan = false;

  let loadedModel = null;

  // Helper to format texture coordinates for GLTF models
  function setupPBRTexture(texture, isColor = false) {
    texture.flipY = false;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    if (isColor) {
      texture.colorSpace = THREE.SRGBColorSpace;
    }
    return texture;
  }

  // Atomic PBR Texture Loader: Loads all 4 maps together before applying
  async function applyFullPBRBatch(batchPath, prefix) {
    if (!loadedModel) return;

    try {
      const [baseColorMap, metallicMap, normalMap, roughnessMap] = await Promise.all([
        textureLoader.loadAsync(`${batchPath}/${prefix}_BaseColor.jpg`),
        textureLoader.loadAsync(`${batchPath}/${prefix}_Metallic.jpg`),
        textureLoader.loadAsync(`${batchPath}/${prefix}_Normal.jpg`),
        textureLoader.loadAsync(`${batchPath}/${prefix}_Roughness.jpg`),
      ]);

      setupPBRTexture(baseColorMap, true);
      setupPBRTexture(metallicMap, false);
      setupPBRTexture(normalMap, false);
      setupPBRTexture(roughnessMap, false);

      loadedModel.traverse((child) => {
        if (child.isMesh && child.material) {
          child.material.map = baseColorMap;
          child.material.metalnessMap = metallicMap;
          child.material.normalMap = normalMap;
          child.material.roughnessMap = roughnessMap;
          
          // Allow PBR maps to control surface properties
          child.material.metalness = 1.0;
          child.material.roughness = 1.0;
          child.material.needsUpdate = true;
        }
      });
    } catch (error) {
      console.error(`Error loading PBR batch set from ${batchPath}:`, error);
    }
  }

  // Load GLB Model
  const loader = new GLTFLoader();
  loader.load(
    modelPath,
    (gltf) => {
      loadedModel = gltf.scene;

      loadedModel.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });

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

      const updatedBox = new THREE.Box3().setFromObject(wrapper);
      wrapper.position.y = -updatedBox.min.y;

      scene.add(wrapper);
    },
    undefined,
    (err) => console.error(`Error loading GLB ${modelPath}:`, err)
  );

  // Swatch click event listener
  const swatchContainer = document.getElementById(`swatches-${id}`);
  swatchContainer.addEventListener('click', (e) => {
    const target = e.target.closest('.swatch');
    if (!target) return;

    const batchPath = target.getAttribute('data-path');
    const prefix = target.getAttribute('data-prefix');
    if (batchPath && prefix) {
      swatchContainer.querySelectorAll('.swatch').forEach((btn) => btn.classList.remove('active'));
      target.classList.add('active');
      applyFullPBRBatch(batchPath, prefix);
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