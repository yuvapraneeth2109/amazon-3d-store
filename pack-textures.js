import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const batches = [
  { dir: 'public/textures/batch1', prefix: 'Fabric_Mat_A' },
  { dir: 'public/textures/batch2', prefix: 'Fabric_Mat_B' },
  { dir: 'public/textures/batch3', prefix: 'Fabric_Mat_C' },
  { dir: 'public/textures/batch4', prefix: 'Fabric_Mat_D' },
  { dir: 'public/textures/batch5', prefix: 'Fabric_Mat_E' },
  { dir: 'public/textures/batch6', prefix: 'Fabric_Mat_F' },
];

async function packTextures() {
  for (const batch of batches) {
    const roughnessPath = path.join(batch.dir, `${batch.prefix}_Roughness.jpg`);
    const metallicPath = path.join(batch.dir, `${batch.prefix}_Metallic.jpg`);
    const outputPath = path.join(batch.dir, `${batch.prefix}_ORM.jpg`);

    if (fs.existsSync(roughnessPath) && fs.existsSync(metallicPath)) {
      const { width, height } = await sharp(roughnessPath).metadata();

      const greenChannel = await sharp(roughnessPath).grayscale().raw().toBuffer();
      const blueChannel = await sharp(metallicPath).grayscale().raw().toBuffer();

      const combinedBuffer = Buffer.alloc(width * height * 3);
      for (let i = 0; i < width * height; i++) {
        combinedBuffer[i * 3] = 255;                 // R (AO): White / 1.0
        combinedBuffer[i * 3 + 1] = greenChannel[i]; // G: Roughness
        combinedBuffer[i * 3 + 2] = blueChannel[i];  // B: Metallic
      }

      await sharp(combinedBuffer, {
        raw: { width, height, channels: 3 }
      }).jpeg({ quality: 90 }).toFile(outputPath);

      console.log(`Created packed texture: ${outputPath}`);
    }
  }
}

packTextures().catch(console.error);