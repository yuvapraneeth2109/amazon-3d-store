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

const textureOptions = [
  { id: 'custom', name: 'Custom Finish', path: '/textures/custom' },
];

const grid = document.getElementById('product-grid');
const textureLoader = new THREE.TextureLoader();

products.forEach((prod) => {
  const card = document.createElement('div');
  card.className = 'card';
  
  const swatchesHTML = textureOptions
    .map((opt, index) => `
      <button 
        class="swatch ${index === 0 ? 'active' : ''}" 
        style="background-image: url('${opt.path}/basecolor.jpg')" 
        data-path="${opt.path}"
        title="${opt.name}">
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

  let loadedModel = null;
  const fabricMaterialSlots = [];
  const metalMaterialSlots = [];

  function prepTexture(tex, isColor = false) {
    tex.flipY = false;
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    if (isColor) {
      tex.colorSpace = THREE.SRGBColorSpace;
    }
    return tex;
  }

  async function applyCustomTextures(folderPath) {
    if (!loadedModel) return;

    try {
      const [baseColorMap, fabricNormalMap, roughnessMap, metallicMap] = await Promise.all([
        textureLoader.loadAsync(`${folderPath}/basecolor.jpg`),
        textureLoader.loadAsync(`${folderPath}/fabric.jpg`),
        textureLoader.loadAsync(`${folderPath}/roughness.jpg`),
        textureLoader.loadAsync(`${folderPath}/metallic.jpg`),
      ]);

      prepTexture(baseColorMap, true);
      prepTexture(fabricNormalMap, false);
      prepTexture(roughnessMap, false);
      prepTexture(metallicMap, true);

      // 1. Apply fabric textures to all soft cushion / frame slots (Fabric_Mat_A through F)
      fabricMaterialSlots.forEach((mat) => {
        mat.color.setHex(0xffffff);
        mat.map = baseColorMap;
        mat.normalMap = fabricNormalMap;
        mat.roughnessMap = roughnessMap;
        mat.metalnessMap = null;
        mat.metalness = 0.0;
        mat.roughness = 0.85;
        mat.needsUpdate = true;
      });

      // 2. Apply metallic texture to hardware / mechanism / leg slots (Fabric_Mat_G)
      metalMaterialSlots.forEach((mat) => {
        mat.color.setHex(0xffffff);
        mat.map = metallicMap;
        mat.metalnessMap = metallicMap;
        mat.normalMap = null;
        mat.roughnessMap = roughnessMap;
        mat.metalness = 1.0;
        mat.roughness = 0.25;
        mat.needsUpdate = true;
      });
    } catch (err) {
      console.error('Error applying textures:', err);
    }
  }

  // Load Model with Exact Material Mapping
  const loader = new GLTFLoader();
  loader.load(
    modelPath,
    (gltf) => {
      loadedModel = gltf.scene;

      console.group(`--- DIAGNOSTIC ANALYSIS FOR MODEL: ${modelPath} ---`);
      let meshCount = 0;

      loadedModel.traverse((child) => {
        if (child.isMesh) {
          meshCount++;
          child.castShadow = true;
          child.receiveShadow = true;

          const materials = Array.isArray(child.material) ? child.material : [child.material];

          console.log(`[Mesh #${meshCount}] Name: "${child.name}" | Vertices: ${child.geometry.attributes.position.count} | Materials: ${materials.length}`);

          materials.forEach((mat, idx) => {
            // Clone material to prevent cross-instance leakage
            const clonedMat = mat.clone();
            if (Array.isArray(child.material)) {
              child.material[idx] = clonedMat;
            } else {
              child.material = clonedMat;
            }

            const rawMatName = clonedMat.name || '';
            const matName = rawMatName.toLowerCase();
            const meshName = (child.name || '').toLowerCase();
            const fullIdentifier = `${meshName} ${matName}`;

            console.log(`   └─ [Material Slot ${idx}] Name: "${rawMatName}"`);

            // Check exact glTF slot names first, then fall back to keyword checking
            const isMetal = rawMatName === 'Fabric_Mat_G' ||
                            fullIdentifier.includes('metal') ||
                            fullIdentifier.includes('leg') ||
                            fullIdentifier.includes('frame') ||
                            fullIdentifier.includes('chrome') ||
                            fullIdentifier.includes('mechanism') ||
                            fullIdentifier.includes('handle') ||
                            fullIdentifier.includes('logo') ||
                            clonedMat.metalness > 0.3;

            if (isMetal) {
              console.log(`      ↳ CLASSIFIED AS: METAL / HARDWARE (${rawMatName})`);
              metalMaterialSlots.push(clonedMat);
            } else {
              console.log(`      ↳ CLASSIFIED AS: FABRIC / CUSHION (${rawMatName})`);
              fabricMaterialSlots.push(clonedMat);
            }
          });
        }
      });

      console.log(`Summary: ${fabricMaterialSlots.length} Fabric Slot(s), ${metalMaterialSlots.length} Metal Slot(s) detected.`);
      console.groupEnd();

      // Auto-center and fit model inside canvas bounding box
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

      // Apply uploaded textures upon load
      applyCustomTextures('/textures/custom');
    },
    undefined,
    (err) => console.error(`Error loading GLB ${modelPath}:`, err)
  );

  // Swatch Click Listener
  const swatchContainer = document.getElementById(`swatches-${id}`);
  swatchContainer.addEventListener('click', (e) => {
    const target = e.target.closest('.swatch');
    if (!target) return;

    swatchContainer.querySelectorAll('.swatch').forEach(btn => btn.classList.remove('active'));
    target.classList.add('active');

    const folderPath = target.getAttribute('data-path');
    if (folderPath) {
      applyCustomTextures(folderPath);
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