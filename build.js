#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const distDir = path.join(__dirname, 'dist');
const outputFile = path.join(__dirname, '../nrf-esp32-gate-idf/main/web_ui.c');

// Read built files
const htmlFile = path.join(distDir, 'index.html');

if (!fs.existsSync(htmlFile)) {
  console.error('Error: dist/index.html not found. Run "npm run build" first.');
  process.exit(1);
}

let html = fs.readFileSync(htmlFile, 'utf-8');

// Find JS and CSS files from HTML or assets directory
let js = '';
let css = '';

// Extract JS file path from HTML
const jsMatch = html.match(/<script[^>]+src=["']([^"']+\.js)["']/);
if (jsMatch) {
  const jsPath = jsMatch[1];
  // Try absolute path first (from dist root)
  let jsFilePath = path.join(distDir, jsPath.replace(/^\//, ''));
  if (!fs.existsSync(jsFilePath)) {
    // Try relative to HTML file
    jsFilePath = path.join(path.dirname(htmlFile), jsPath);
  }
  if (fs.existsSync(jsFilePath)) {
    js = fs.readFileSync(jsFilePath, 'utf-8');
    // Update HTML to reference /app.js
    html = html.replace(jsPath, '/app.js');
  }
}

// Extract CSS file path from HTML
const cssMatch = html.match(/<link[^>]+href=["']([^"']+\.css)["']/);
if (cssMatch) {
  const cssPath = cssMatch[1];
  // Try absolute path first (from dist root)
  let cssFilePath = path.join(distDir, cssPath.replace(/^\//, ''));
  if (!fs.existsSync(cssFilePath)) {
    // Try relative to HTML file
    cssFilePath = path.join(path.dirname(htmlFile), cssPath);
  }
  if (fs.existsSync(cssFilePath)) {
    css = fs.readFileSync(cssFilePath, 'utf-8');
    // Update HTML to reference /app.css
    html = html.replace(cssPath, '/app.css');
  }
}

// Fallback: try to find app.js and app.css in dist root
if (!js) {
  const jsFile = path.join(distDir, 'app.js');
  if (fs.existsSync(jsFile)) {
    js = fs.readFileSync(jsFile, 'utf-8');
  }
}

if (!css) {
  const cssFile = path.join(distDir, 'app.css');
  if (fs.existsSync(cssFile)) {
    css = fs.readFileSync(cssFile, 'utf-8');
  }
}

if (!js || !css) {
  console.error('Error: JS or CSS files not found in dist. Run "npm run build" first.');
  process.exit(1);
}

// Escape C string
function escapeCString(str) {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t');
}

// Split into chunks to avoid compiler limits
function splitIntoChunks(str, chunkSize = 8000) {
  const chunks = [];
  for (let i = 0; i < str.length; i += chunkSize) {
    chunks.push(str.slice(i, i + chunkSize));
  }
  return chunks;
}

const htmlEscaped = escapeCString(html);
const jsEscaped = escapeCString(js);
const cssEscaped = escapeCString(css);

const htmlChunks = splitIntoChunks(htmlEscaped);
const jsChunks = splitIntoChunks(jsEscaped);
const cssChunks = splitIntoChunks(cssEscaped);

// Generate C code
let cCode = `#include "web_ui.h"

/* Auto-generated from web build - do not edit manually */
/* Generated from: ${new Date().toISOString()} */

`;

// HTML
cCode += `static const char s_html[] = `;
htmlChunks.forEach((chunk, i) => {
  if (i === 0) {
    cCode += `"${chunk}"`;
  } else {
    cCode += `\n    "${chunk}"`;
  }
});
cCode += `;\n\n`;

// JS
cCode += `static const char s_js[] = `;
jsChunks.forEach((chunk, i) => {
  if (i === 0) {
    cCode += `"${chunk}"`;
  } else {
    cCode += `\n    "${chunk}"`;
  }
});
cCode += `;\n\n`;

// CSS
cCode += `static const char s_css[] = `;
cssChunks.forEach((chunk, i) => {
  if (i === 0) {
    cCode += `"${chunk}"`;
  } else {
    cCode += `\n    "${chunk}"`;
  }
});
cCode += `;\n\n`;

// Functions
cCode += `const char *web_ui_get_html(void)
{
    return s_html;
}

const char *web_ui_get_js(void)
{
    return s_js;
}

const char *web_ui_get_css(void)
{
    return s_css;
}
`;

// Write output
fs.writeFileSync(outputFile, cCode, 'utf-8');
console.log(`✓ Generated ${outputFile}`);
console.log(`  HTML: ${html.length} bytes (${htmlChunks.length} chunks)`);
console.log(`  JS: ${js.length} bytes (${jsChunks.length} chunks)`);
console.log(`  CSS: ${css.length} bytes (${cssChunks.length} chunks)`);

