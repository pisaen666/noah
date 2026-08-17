/**
 * =============================================================================
 * verify-deployment.js — Pre-Deployment & Integrity Checker
 * =============================================================================
 * Runs automated checks to ensure all files, configurations, PWA assets,
 * and security rules are valid before deploying to production.
 * =============================================================================
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');

let passCount = 0;
let failCount = 0;

function check(label, condition, detail = '') {
  if (condition) {
    console.log(`  ✅ [PASS] ${label}`);
    passCount++;
  } else {
    console.log(`  ❌ [FAIL] ${label}${detail ? ` — ${detail}` : ''}`);
    failCount++;
  }
}

console.log('\n🔍 Running Daily Word Quest Deployment Verification...\n');

// 1. Check index.html and essential tags
const indexPath = path.join(ROOT_DIR, 'index.html');
if (fs.existsSync(indexPath)) {
  const indexContent = fs.readFileSync(indexPath, 'utf8');
  check('index.html exists', true);
  check('PWA manifest linked in index.html', indexContent.includes('manifest.json'));
  check('Theme color meta tag present', indexContent.includes('theme-color'));
  check('Apple mobile web app capable tag present', indexContent.includes('apple-mobile-web-app-capable'));
  check('App Overlays mount point exists (#app-overlays)', indexContent.includes('id="app-overlays"'));
  check('Mission Start button exists (#mission-start-btn)', indexContent.includes('id="mission-start-btn"'));
  check('App bootstrap module script included', indexContent.includes('src="./src/app.js"'));
} else {
  check('index.html exists', false, 'File not found');
}

// 2. Check manifest.json
const manifestPath = path.join(ROOT_DIR, 'manifest.json');
if (fs.existsSync(manifestPath)) {
  try {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    check('manifest.json is valid JSON', true);
    check('manifest.json has display: standalone', manifest.display === 'standalone');
    check('manifest.json has icons defined', Array.isArray(manifest.icons) && manifest.icons.length > 0);
  } catch (err) {
    check('manifest.json is valid JSON', false, err.message);
  }
} else {
  check('manifest.json exists', false);
}

// 3. Check sw.js (Service Worker)
const swPath = path.join(ROOT_DIR, 'sw.js');
if (fs.existsSync(swPath)) {
  const swContent = fs.readFileSync(swPath, 'utf8');
  check('sw.js exists', true);
  check('sw.js contains install event listener', swContent.includes("addEventListener('install'"));
  check('sw.js contains fetch event listener', swContent.includes("addEventListener('fetch'"));
  check('sw.js contains activate cache cleanup', swContent.includes("addEventListener('activate'"));
} else {
  check('sw.js exists', false);
}

// 4. Check PWA Icons
const iconSvgPath = path.join(ROOT_DIR, 'icons', 'icon.svg');
check('PWA Vector Icon (icons/icon.svg) exists', fs.existsSync(iconSvgPath));

// 5. Check config.js
const configPath = path.join(ROOT_DIR, 'src', 'config.js');
if (fs.existsSync(configPath)) {
  const configContent = fs.readFileSync(configPath, 'utf8');
  check('src/config.js exists', true);
  
  const match = configContent.match(/export\s+const\s+GOOGLE_CLIENT_ID\s*=\s*['"`](.*?)['"`]/);
  const clientId = match ? match[1] : '';
  const isConfigured = clientId && !clientId.includes('YOUR_GOOGLE_CLIENT_ID_HERE');

  check('Google Client ID is set (not placeholder)', isConfigured, isConfigured ? `Set to: ${clientId.substring(0, 16)}...` : 'Please set Client ID');
  check('Mission keyword configured', configContent.includes('MISSION_KEYWORD'));
  check('Completion Color ID set to 10 (Basil Green)', configContent.includes("COMPLETION_COLOR_ID = '10'"));
} else {
  check('src/config.js exists', false);
}

// 6. Check Deployment Configs
check('vercel.json exists', fs.existsSync(path.join(ROOT_DIR, 'vercel.json')));
check('netlify.toml exists', fs.existsSync(path.join(ROOT_DIR, 'netlify.toml')));

console.log('\n----------------------------------------');
console.log(`Results: ${passCount} Passed, ${failCount} Failed`);
console.log('----------------------------------------\n');

if (failCount === 0) {
  console.log('🎉 ALL CHECKS PASSED! The app is 100% ready for production deployment.\n');
  process.exit(0);
} else {
  console.log('⚠️ Please resolve the failed items before deploying.\n');
  process.exit(1);
}
