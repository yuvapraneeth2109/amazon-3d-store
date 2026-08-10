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
  camera.position.set(0, 0.8, 2.8);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.LinearToneMapping; // Clean, natural color rendering
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);

  // Studio Lighting
  const rgbeLoader = new RGBELoader();
  rgbeLoader.load(
    'https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/studio_small_09_1k.hdr',
    (hdrTexture) => {
      hdrTexture.mapping = THREE.EquirectangularReflectionMapping;
      scene.environment = hdrTexture;
    }
  );

  const shadowLight = new THREE.DirectionalLight(0xffffff, 1.2);
  shadowLight.position.set(0, 6, 0.3);
  shadowLight.castShadow = true;
  shadowLight.shadow.mapSize.width = 1024;
  shadowLight.shadow.mapSize.height = 1024;
  shadowLight.shadow.camera.near = 0.5;
  shadowLight.shadow.camera.far = 10;
  shadowLight.shadow.camera.left = -1.5;
  shadowLight.shadow.camera.right = 1.5;
  shadowLight.shadow.camera.top = 1.5;
  shadowLight.shadow.camera.bottom = -1.5;
  shadowLight.shadow.bias = -0.0005;
  scene.add(shadowLight);

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
  scene.add(ambientLight);

  // Ground Shadow Floor
  const shadowPlaneGeo = new THREE.PlaneGeometry(10, 10);
  const shadowPlaneMat = new THREE.ShadowMaterial({ opacity: 0.35 });
  const shadowPlane = new THREE.Mesh(shadowPlaneGeo, shadowPlaneMat);
  shadowPlane.rotation.x = -Math.PI / 2;
  shadowPlane.position.y = 0;
  shadowPlane.receiveShadow = true;
  scene.add(shadowPlane);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.minPolarAngle = 0;
  controls.maxPolarAngle = Math.PI / 2 - 0.01;
  controls.enablePan = false;

  let loadedModel = null;

  function setupPBRTexture(texture, isColor = false) {
    texture.flipY = false;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    if (isColor) {
      texture.colorSpace = THREE.SRGBColorSpace;
    }
    return texture;
  }

  // Load and apply the complete 4-file PBR texture batch together
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
      setupPBRTexture(roughnessMap, false);
      setupPBRTexture(normalMap, false);

      loadedModel.traverse((child) => {
        if (child.isMesh && child.material) {
          const existingRepeat = child.material.map ? child.material.map.repeat : new THREE.Vector2(1, 1);
          
          [baseColorMap, metallicMap, roughnessMap, normalMap].forEach((t) => {
            if (t) t.repeat.copy(existingRepeat);
          });

          // Reset material color to white so JPEG colors render 100% true to source
          child.material.color.setHex(0xffffff);

          child.material.map = baseColorMap;
          child.material.metalnessMap = metallicMap;
          child.material.roughnessMap = roughnessMap;
          child.material.normalMap = normalMap;

          // Set scalars to 1.0 so maps fully drive metalness/roughness values
          child.material.metalness = 1.0;
          child.material.roughness = 1.0;
          child.material.needsUpdate = true;
        }
      });
    } catch (error) {
      console.error(`Error loading PBR batch set from ${batchPath}:`, error);
    }
  }

  // Load Model
  const loader = new GLTFLoader();
  loader.load(
    modelPath,
    (gltf) => {
      loadedModel = gltf.scene;

      loadedModel.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
          
          // Clear GLB base tint
          if (child.material) {
            child.material.color.setHex(0xffffff);
          }
        }
      });

      const box = new THREE.Box3().setFromObject(loadedModel);
      const size = box.getSize(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z);

      const scale = 1.8 / maxDim;
      loadedModel.scale.set(scale, scale, scale);

      const scaledBox = new THREE.Box3().setFromObject(loadedModel);
      const scaledCenter = scaledBox.getCenter(new THREE.Vector3());

      loadedModel.position.x = -scaledCenter.x;
      loadedModel.position.z = -scaledCenter.z;
      loadedModel.position.y = -scaledBox.min.y;

      scene.add(loadedModel);

      const modelHeight = scaledBox.max.y - scaledBox.min.y;
      controls.target.set(0, modelHeight / 2, 0);
      controls.update();
    },
    undefined,
    (err) => console.error(`Error loading GLB ${modelPath}:`, err)
  );

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