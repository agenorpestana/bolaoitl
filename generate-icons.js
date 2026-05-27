import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const svgPath = path.resolve('./public/icon.svg');
const icon192Path = path.resolve('./public/icon-192.png');
const icon512Path = path.resolve('./public/icon-512.png');

async function main() {
  try {
    if (!fs.existsSync(path.resolve('./public'))) {
      fs.mkdirSync(path.resolve('./public'), { recursive: true });
    }
    
    // Generate 192x192 PNG from SVG vector
    await sharp(svgPath)
      .resize(192, 192)
      .png()
      .toFile(icon192Path);
    console.log('Successfully generated public/icon-192.png');

    // Generate 512x512 PNG from SVG vector
    await sharp(svgPath)
      .resize(512, 512)
      .png()
      .toFile(icon512Path);
    console.log('Successfully generated public/icon-512.png');
  } catch (error) {
    console.error('Error generating icons:', error);
    process.exit(1);
  }
}

main();
