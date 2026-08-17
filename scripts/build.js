/**
 * =============================================================================
 * build.js — Production Build & Bundler Script
 * =============================================================================
 * Creates a clean, self-contained `dist/` directory ready for deployment
 * on any static hosting provider (Vercel, Netlify, Cloudflare Pages, S3, etc.)
 * =============================================================================
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const DIST_DIR = path.resolve(ROOT_DIR, 'dist');

const FILES_TO_COPY = [
  'index.html',
  'manifest.json',
  'sw.js',
  'vercel.json',
  'netlify.toml',
  'README.md',
  'CHECKLIST.md',
];

const DIRS_TO_COPY = [
  'src',
  'icons',
];

function copyFolderSync(from, to) {
  if (!fs.existsSync(to)) fs.mkdirSync(to, { recursive: true });
  fs.readdirSync(from).forEach((element) => {
    const stat = fs.lstatSync(path.join(from, element));
    if (stat.isFile()) {
      fs.copyFileSync(path.join(from, element), path.join(to, element));
    } else if (stat.isDirectory()) {
      copyFolderSync(path.join(from, element), path.join(to, element));
    }
  });
}

function build() {
  console.log('🚀 Building Daily Word Quest for Production...\n');

  // Clean dist directory
  if (fs.existsSync(DIST_DIR)) {
    fs.rmSync(DIST_DIR, { recursive: true, force: true });
  }
  fs.mkdirSync(DIST_DIR, { recursive: true });

  // Copy files
  FILES_TO_COPY.forEach((file) => {
    const srcPath = path.join(ROOT_DIR, file);
    if (fs.existsSync(srcPath)) {
      fs.copyFileSync(srcPath, path.join(DIST_DIR, file));
      console.log(`  ✓ Copied: ${file}`);
    }
  });

  // Copy directories
  DIRS_TO_COPY.forEach((dir) => {
    const srcPath = path.join(ROOT_DIR, dir);
    if (fs.existsSync(srcPath)) {
      copyFolderSync(srcPath, path.join(DIST_DIR, dir));
      console.log(`  ✓ Copied directory: ${dir}/`);
    }
  });

  // Check config validation
  const configPath = path.join(DIST_DIR, 'src', 'config.js');
  if (fs.existsSync(configPath)) {
    const configContent = fs.readFileSync(configPath, 'utf8');
    const match = configContent.match(/export\s+const\s+GOOGLE_CLIENT_ID\s*=\s*['"`](.*?)['"`]/);
    const clientId = match ? match[1] : '';
    if (!clientId || clientId.includes('YOUR_GOOGLE_CLIENT_ID_HERE')) {
      console.warn('\n⚠️ WARNING: GOOGLE_CLIENT_ID in src/config.js is still using the placeholder.');
    } else {
      console.log(`\n  ✓ Google Client ID configured successfully in build output: ${clientId.substring(0, 16)}...`);
    }
  }

  console.log(`\n🎉 Production build complete! Output folder: dist/\n`);
}

build();
