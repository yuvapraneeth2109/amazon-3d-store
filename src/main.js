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

  // Lighting
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

  // Shadow Ground
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
  const metalMeshes = [];

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
      prepTexture(metallicMap, false);

      // Apply fabric maps to sofa body
      fabricMeshes.forEach((mesh) => {
        mesh.material.color.setHex(0xffffff);
        mesh.material.map = baseColorMap;
        mesh.material.normalMap = fabricNormalMap;
        mesh.material.roughnessMap = roughnessMap;
        mesh.material.metalness = 0.0;
        mesh.material.roughness = 0.85;
        mesh.material.needsUpdate = true;
      });

      // Apply metallic map strictly to metal frame parts
      metalMeshes.forEach((mesh) => {
        mesh.material.metalnessMap = metallicMap;
        mesh.material.metalness = 1.0;
        mesh.material.roughness = 0.2;
        mesh.material.needsUpdate = true;
      });
    } catch (err) {
      console.error('Error applying textures:', err);
    }
  }

  // Load GLB
  const loader = new GLTFLoader();
  loader.load(
    modelPath,
    (gltf) => {
      loadedModel = gltf.scene;

      loadedModel.traverse((child) => {
        if (child.isMesh && child.material) {
          child.castShadow = true;
          child.receiveShadow = true;
          child.material = child.material.clone();

          // Mesh threshold: Large meshes = Sofa Fabric, Small meshes = Metal Frame/Legs
          if (child.geometry.attributes.position.count > 500) {
            fabricMeshes.push(child);
          } else {
            metalMeshes.push(child);
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

      // Initial texture load
      applyCustomTextures('/textures/custom');
    },
    undefined,
    (err) => console.error(`Error loading GLB ${modelPath}:`, err)
  );

  const swatchContainer = document.getElementById(`swatches-${id}`);
  swatchContainer.addEventListener('click', (e) => {
    const target = e.target.closest('.swatch');
    if (!target) return;

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