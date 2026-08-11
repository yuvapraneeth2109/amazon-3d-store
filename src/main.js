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

// 7 Fabric Material Types (Different surface textures/sheen, same color)
const fabricOptions = [
  { id: 'fab1', name: 'Standard Smooth Leather', roughness: 0.55, normalScale: 1.0, clearcoat: 0.1 },
  { id: 'fab2', name: 'Heavy Woven Tweed / Cloth', roughness: 0.95, normalScale: 2.8, clearcoat: 0.0 },
  { id: 'fab3', name: 'Soft Matte Velvet', roughness: 0.98, normalScale: 0.3, clearcoat: 0.0 },
  { id: 'fab4', name: 'Fine Woven Linen', roughness: 0.88, normalScale: 1.6, clearcoat: 0.0 },
  { id: 'fab5', name: 'Microfiber Suede', roughness: 0.99, normalScale: 0.2, clearcoat: 0.0 },
  { id: 'fab6', name: 'Coarse Canvas Fabric', roughness: 0.90, normalScale: 2.2, clearcoat: 0.0 },
  { id: 'fab7', name: 'Pebbled Heavy Grain Leather', roughness: 0.40, normalScale: 2.0, clearcoat: 0.3 },
];

const grid = document.getElementById('product-grid');
const textureLoader = new THREE.TextureLoader();

products.forEach((prod) => {
  const card = document.createElement('div');
  card.className = 'card';

  const swatchesHTML = fabricOptions
    .map((opt, index) => `
      <button 
        class="swatch ${index === 0 ? 'active' : ''}" 
        style="background-image: url('/textures/fabric1/Fabric_Mat_A_BaseColor.jpg'); background-size: cover;" 
        data-id="${opt.id}"
        title="${opt.name}">
      </button>`)
    .join('');

  card.innerHTML = `
    <div class="canvas-box" id="canvas-${prod.id}"></div>
    <div class="details">
      <div class="title">${prod.name}</div>
      <div class="price">${prod.price}</div>
      <div class="color-section">
        <span>Fabric Material Options</span>
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

  // Studio HDRI Lighting
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

  const fabricMaterials = [];

  function prepTexture(tex, isColor = false) {
    tex.flipY = false;
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    if (isColor) {
      tex.colorSpace = THREE.SRGBColorSpace;
    }
    return tex;
  }

  async function loadSlotTexture(material, slotName) {
    try {
      const basePath = `/textures/fabric1/${slotName}`;
      const [baseColorMap, normalMap, roughnessMap, metallicMap] = await Promise.all([
        textureLoader.loadAsync(`${basePath}_BaseColor.jpg`),
        textureLoader.loadAsync(`${basePath}_Normal.jpg`),
        textureLoader.loadAsync(`${basePath}_Roughness.jpg`),
        textureLoader.loadAsync(`${basePath}_Metallic.jpg`),
      ]);

      prepTexture(baseColorMap, true);
      prepTexture(normalMap, false);
      prepTexture(roughnessMap, false);
      prepTexture(metallicMap, false);

      // Preserve original base color map and color tint
      material.color.setHex(0xffffff);
      material.map = baseColorMap;
      material.normalMap = normalMap;
      material.roughnessMap = roughnessMap;

      // Slot G is metallic handle/frame; slots A-F are fabric body
      if (slotName === 'Fabric_Mat_G') {
        material.metalnessMap = metallicMap;
        material.metalness = 1.0;
        material.roughness = 0.25;
      } else {
        material.metalnessMap = null;
        material.metalness = 0.0;
        material.roughness = 0.55;
        fabricMaterials.push(material);
      }

      material.needsUpdate = true;
    } catch (err) {
      console.error(`Failed loading slot ${slotName}:`, err);
    }
  }

  // Load GLB Model
  const loader = new GLTFLoader();
  loader.load(
    modelPath,
    (gltf) => {
      const loadedModel = gltf.scene;

      loadedModel.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;

          const materials = Array.isArray(child.material) ? child.material : [child.material];

          materials.forEach((mat, idx) => {
            const clonedMat = mat.clone();
            if (Array.isArray(child.material)) {
              child.material[idx] = clonedMat;
            } else {
              child.material = clonedMat;
            }

            const rawMatName = clonedMat.name || '';
            if (rawMatName.startsWith('Fabric_Mat_')) {
              loadSlotTexture(clonedMat, rawMatName);
            }
          });
        }
      });

      // Auto-center and fit model
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

  // Swatch Click: Change Fabric Material Structure (Same Color)
  const swatchContainer = document.getElementById(`swatches-${id}`);
  swatchContainer.addEventListener('click', (e) => {
    const target = e.target.closest('.swatch');
    if (!target) return;

    swatchContainer.querySelectorAll('.swatch').forEach((btn) => btn.classList.remove('active'));
    target.classList.add('active');

    const fabId = target.getAttribute('data-id');
    const preset = fabricOptions.find((opt) => opt.id === fabId);

    if (preset) {
      fabricMaterials.forEach((mat) => {
        // Keep color untouched (#ffffff over base color texture)
        mat.color.setHex(0xffffff);
        mat.roughness = preset.roughness;

        if (mat.normalMap) {
          mat.normalScale.set(preset.normalScale, preset.normalScale);
        }

        if ('clearcoat' in mat) {
          mat.clearcoat = preset.clearcoat;
        }

        mat.needsUpdate = true;
      });
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