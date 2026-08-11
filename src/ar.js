import * as THREE from 'three';

const products = [
  { id: 'p1', name: 'Product 1', file: '/models/model1.glb' },
  { id: 'p2', name: 'Product 2', file: '/models/model2.glb' },
  { id: 'p3', name: 'Product 3', file: '/models/model3.glb' },
  { id: 'p4', name: 'Product 4', file: '/models/model4.glb' },
  { id: 'p5', name: 'Product 5', file: '/models/model5.glb' },
];

const params = new URLSearchParams(window.location.search);
const productId = params.get('model') || 'p1';
const colorFolder = params.get('color') || '/textures/red';

const product = products.find((p) => p.id === productId) || products[0];

const titleElem = document.getElementById('product-title');
const viewer = document.getElementById('ar-viewer');

if (titleElem) {
  titleElem.textContent = `${product.name} (AR/VR View)`;
}

if (viewer) {
  viewer.src = product.file;

  viewer.addEventListener('load', async () => {
    const materialSlots = [
      'Fabric_Mat_A',
      'Fabric_Mat_B',
      'Fabric_Mat_C',
      'Fabric_Mat_D',
      'Fabric_Mat_E',
      'Fabric_Mat_F',
      'Fabric_Mat_G',
    ];

    for (const slotName of materialSlots) {
      const mat = viewer.model?.materials.find((m) => m.name === slotName);
      if (!mat) continue;

      const basePath = `${colorFolder}/${slotName}`;
      try {
        const baseColorTex = await viewer.createTexture(`${basePath}_BaseColor.jpg`);
        if (mat.pbrMetallicRoughness.baseColorTexture) {
          mat.pbrMetallicRoughness.baseColorTexture.setTexture(baseColorTex);
        }
      } catch (err) {
        console.warn(`Texture update skipped for ${basePath}:`, err);
      }
    }
  });
}