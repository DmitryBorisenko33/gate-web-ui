#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const webDir = __dirname;
const distDir = path.join(webDir, 'dist');
const gateDir = path.join(webDir, '../nrf-esp32-gate-idf');
const spiffsImageDir = path.join(gateDir, 'main/spiffs_image');

console.log('🚀 Deploying web to gate...\n');

// Step 1: Build web project
console.log('📦 Building web project...');
try {
  execSync('npm run build', { 
    cwd: webDir, 
    stdio: 'inherit',
    env: { ...process.env, NODE_ENV: 'production' }
  });
  console.log('✅ Web build completed\n');
} catch (error) {
  console.error('❌ Web build failed:', error.message);
  process.exit(1);
}

// Step 2: Verify dist files exist
const requiredFiles = [
  'index.html.gz',
  'app.js.gz',
  'app.css.gz'
];

console.log('🔍 Verifying build files...');
for (const file of requiredFiles) {
  const filePath = path.join(distDir, file);
  if (!fs.existsSync(filePath)) {
    console.error(`❌ Required file not found: ${file}`);
    process.exit(1);
  }
}
console.log('✅ All required files found\n');

// Step 3: Create spiffs_image directory
console.log('📁 Creating SPIFFS image directory...');
if (!fs.existsSync(spiffsImageDir)) {
  fs.mkdirSync(spiffsImageDir, { recursive: true });
  console.log(`✅ Created directory: ${spiffsImageDir}`);
} else {
  console.log(`✅ Directory exists: ${spiffsImageDir}`);
}
console.log();

// Step 4: Copy files (gzip files with original names)
console.log('📋 Copying files to SPIFFS image directory...');
const filesToCopy = [
  { src: 'index.html.gz', dst: 'index.html' },
  { src: 'app.js.gz', dst: 'app.js' },
  { src: 'app.css.gz', dst: 'app.css' }
];

let totalSize = 0;
for (const { src, dst } of filesToCopy) {
  const srcPath = path.join(distDir, src);
  const dstPath = path.join(spiffsImageDir, dst);
  
  fs.copyFileSync(srcPath, dstPath);
  const srcSize = fs.statSync(srcPath).size;
  totalSize += srcSize;
  console.log(`  ✓ ${src} → ${dst} (${(srcSize / 1024).toFixed(1)} KB)`);
}

console.log('\n✅ Deployment completed!');
console.log(`📦 Files ready in: ${spiffsImageDir}`);
console.log(`📊 Total gzip size: ${(totalSize / 1024).toFixed(1)} KB (${totalSize} bytes)`);
console.log('\n💡 You can now build the ESP32 firmware with: idf.py build');

