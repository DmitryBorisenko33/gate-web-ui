#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { gzipSync } from 'zlib';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const distDir = path.join(__dirname, 'dist');

// Check if dist exists
if (!fs.existsSync(distDir)) {
  console.error('Error: dist/ directory not found. Run "npm run build" first.');
  process.exit(1);
}

// Verify required files exist
const htmlFile = path.join(distDir, 'index.html');
if (!fs.existsSync(htmlFile)) {
  console.error('Error: dist/index.html not found. Run "npm run build" first.');
  process.exit(1);
}

// Find JS and CSS files
let html = fs.readFileSync(htmlFile, 'utf-8');

// Extract and verify JS file
const jsMatch = html.match(/<script[^>]+src=["']([^"']+\.js)["']/);
if (!jsMatch) {
  console.error('Error: No JS file found in HTML');
  process.exit(1);
}

const jsPath = jsMatch[1];
let jsFilePath = path.join(distDir, jsPath.replace(/^\//, ''));
if (!fs.existsSync(jsFilePath)) {
  jsFilePath = path.join(path.dirname(htmlFile), jsPath);
}

if (!fs.existsSync(jsFilePath)) {
  console.error(`Error: JS file not found: ${jsPath}`);
  process.exit(1);
}

// Extract and verify CSS file
const cssMatch = html.match(/<link[^>]+href=["']([^"']+\.css)["']/);
if (!cssMatch) {
  console.error('Error: No CSS file found in HTML');
  process.exit(1);
}

const cssPath = cssMatch[1];
let cssFilePath = path.join(distDir, cssPath.replace(/^\//, ''));
if (!fs.existsSync(cssFilePath)) {
  cssFilePath = path.join(path.dirname(htmlFile), cssPath);
}

if (!fs.existsSync(cssFilePath)) {
  console.error(`Error: CSS file not found: ${cssPath}`);
  process.exit(1);
}

// Update HTML to use absolute paths for SPIFFS
html = html.replace(jsPath, '/app.js');
html = html.replace(cssPath, '/app.css');

// Write updated HTML back to dist
fs.writeFileSync(htmlFile, html, 'utf-8');

// Copy JS and CSS to root of dist with fixed names (if they're not already there)
const appJsPath = path.join(distDir, 'app.js');
const appCssPath = path.join(distDir, 'app.css');

if (jsFilePath !== appJsPath) {
  fs.copyFileSync(jsFilePath, appJsPath);
}
if (cssFilePath !== appCssPath) {
  fs.copyFileSync(cssFilePath, appCssPath);
}

// Create gzip versions for better compression
const jsContent = fs.readFileSync(appJsPath);
const cssContent = fs.readFileSync(appCssPath);
const htmlContent = fs.readFileSync(htmlFile);

const jsGzip = gzipSync(jsContent, { level: 9 });
const cssGzip = gzipSync(cssContent, { level: 9 });
const htmlGzip = gzipSync(htmlContent, { level: 9 });

fs.writeFileSync(path.join(distDir, 'app.js.gz'), jsGzip);
fs.writeFileSync(path.join(distDir, 'app.css.gz'), cssGzip);
fs.writeFileSync(path.join(distDir, 'index.html.gz'), htmlGzip);

console.log('✓ Web files prepared for SPIFFS:');
console.log(`  HTML: ${htmlFile} (${fs.statSync(htmlFile).size} bytes, gzip: ${htmlGzip.length} bytes)`);
console.log(`  JS: ${appJsPath} (${fs.statSync(appJsPath).size} bytes, gzip: ${jsGzip.length} bytes)`);
console.log(`  CSS: ${appCssPath} (${fs.statSync(appCssPath).size} bytes, gzip: ${cssGzip.length} bytes)`);
