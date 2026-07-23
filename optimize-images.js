
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const imagesDir = path.join(__dirname, 'images');

// Supported image extensions
const supportedExtensions = ['.jpg', '.jpeg', '.png'];

// Image size configs based on display size from PageSpeed Insights
const sizeConfigs = [
  { name: 'small', width: 480 },
  { name: 'medium', width: 800 },
  { name: 'large', width: 1200 },
  { name: 'xlarge', width: 1600 }
];

// Recursively process all images in a directory
async function processDirectory(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stats = fs.statSync(fullPath);
    
    if (stats.isDirectory()) {
      await processDirectory(fullPath);
    } else {
      const ext = path.extname(file).toLowerCase();
      if (supportedExtensions.includes(ext)) {
        await optimizeImage(fullPath);
      }
    }
  }
}

async function optimizeImage(filePath) {
  try {
    console.log(`Optimizing: ${filePath}`);
    
    const ext = path.extname(filePath);
    const baseName = path.basename(filePath, ext);
    const dirName = path.dirname(filePath);
    
    // Get image metadata
    const metadata = await sharp(filePath).metadata();
    
    // Create WebP version (original size optimized)
    await sharp(filePath)
      .rotate()
      .webp({ quality: 80 })
      .toFile(path.join(dirName, `${baseName}.webp`));
      
    // Create resized versions
    for (const config of sizeConfigs) {
      if (metadata.width > config.width) {
        await sharp(filePath)
          .rotate()
          .resize(config.width)
          .webp({ quality: 80 })
          .toFile(path.join(dirName, `${baseName}-${config.width}.webp`));
      }
    }
    
    console.log(`Finished optimizing: ${baseName}`);
  } catch (error) {
    console.error(`Error optimizing ${filePath}:`, error);
  }
}

// Start processing
console.log('Starting image optimization...');
processDirectory(imagesDir).then(() => {
  console.log('Image optimization complete!');
});
