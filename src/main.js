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
  renderer.toneMapping = THREE.LinearToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);

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
  shadowLight.shadow.bias = -0.0005;
  scene.add(shadowLight);

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
  scene.add(ambientLight);

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
  const fabricMeshes = [];

  function configureTexture(tex, isColor = false) {
    tex.flipY = false;
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    if (isColor) {
      tex.colorSpace = THREE.SRGBColorSpace;
    }
    return tex;
  }

  async function applyPBRBatch(batchPath, prefix) {
    if (!loadedModel || fabricMeshes.length === 0) return;

    try {
      const baseColorPath = `${batchPath}/${prefix}_BaseColor.jpg`;
      const normalPath = `${batchPath}/${prefix}_Normal.jpg`;
      const ormPath = `${batchPath}/${prefix}_ORM.jpg`; // Uses packed texture if available
      const roughnessPath = `${batchPath}/${prefix}_Roughness.jpg`;
      const metallicPath = `${batchPath}/${prefix}_Metallic.jpg`;

      const baseColorMap = await textureLoader.loadAsync(baseColorPath);
      configureTexture(baseColorMap, true);

      const normalMap = await textureLoader.loadAsync(normalPath);
      configureTexture(normalMap, false);

      let roughnessMap, metallicMap, aoMap;

      // Check if packed ORM texture exists, fallback to individual maps
      try {
        const ormMap = await textureLoader.loadAsync(ormPath);
        configureTexture(ormMap, false);
        aoMap = ormMap;
        roughnessMap = ormMap;
        metallicMap = ormMap;
      } catch {
        roughnessMap = await textureLoader.loadAsync(roughnessPath);
        metallicMap = await textureLoader.loadAsync(metallicPath);
        configureTexture(roughnessMap, false);
        configureTexture(metallicMap, false);
      }

      fabricMeshes.forEach((mesh) => {
        const mat = mesh.material;
        mat.color.setHex(0xffffff); // Clear base color multiplier
        mat.map = baseColorMap;
        mat.normalMap = normalMap;
        mat.roughnessMap = roughnessMap;
        mat.metalnessMap = metallicMap;
        if (aoMap) mat.aoMap = aoMap;

        mat.metalness = 1.0;
        mat.roughness = 1.0;
        mat.needsUpdate = true;
      });
    } catch (err) {
      console.error('Error applying batch texture:', err);
    }
  }

  const loader = new GLTFLoader();
  loader.load(
    modelPath,
    (gltf) => {
      loadedModel = gltf.scene;

      loadedModel.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;

          // Identify fabric surfaces (filter out small metal frame/legs)
          if (child.material && child.geometry.attributes.position.count > 100) {
            child.material = child.material.clone(); // Clone material per mesh
            fabricMeshes.push(child);
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
      applyPBRBatch(batchPath, prefix);
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