#!/usr/bin/env node

/**
 * Development server wrapper that automatically detects and fixes Next.js cache corruption
 * Run with: node scripts/dev-with-cache-fix.js
 *
 * This script:
 * 1. Clears cache on startup if a build was run (prevents 404s)
 * 2. Monitors for webpack/HMR errors and auto-fixes
 * 3. Handles graceful restarts
 */

const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.join(__dirname, '..');
const NEXT_DIR = path.join(ROOT_DIR, '.next');
const CACHE_DIR = path.join(ROOT_DIR, 'node_modules', '.cache');
const BUILD_MARKER = path.join(NEXT_DIR, 'BUILD_ID');
const DEV_MARKER = path.join(NEXT_DIR, '.dev-session');

// Patterns that indicate cache corruption or webpack issues
const ERROR_PATTERNS = [
  /Cannot find module '\.\/.+\.js'/,
  /MODULE_NOT_FOUND/,
  /Invalid or unexpected token/,
  /webpack\.hot-update\.json 404/,
  /ENOENT.*\.next\/server/,
  /Caching failed for pack/,
  /Cannot read properties of undefined \(reading 'call'\)/,
  /__webpack_require__.*undefined/,
  /Failed to load resource.*404.*webpack/,
  /Failed to load resource.*404.*\.js$/,
  /Failed to load resource.*404.*layout/,
  /Failed to load resource.*404.*page/,
  /ChunkLoadError/,
  /Loading chunk \d+ failed/,
  /Unexpected token '<'/,  // HTML returned instead of JS (stale chunks)
];

let devProcess = null;
let restartCount = 0;
let lastRestartTime = 0;
const MAX_RESTARTS = 5;
const RESTART_COOLDOWN = 10000; // 10 seconds

function clearCache(reason = 'manual') {
  console.log(`\n🧹 Clearing Next.js cache (${reason})...`);

  try {
    if (fs.existsSync(NEXT_DIR)) {
      fs.rmSync(NEXT_DIR, { recursive: true, force: true });
      console.log('   ✓ Removed .next directory');
    }

    if (fs.existsSync(CACHE_DIR)) {
      fs.rmSync(CACHE_DIR, { recursive: true, force: true });
      console.log('   ✓ Removed node_modules/.cache');
    }

    return true;
  } catch (err) {
    console.error('   ✗ Failed to clear cache:', err.message);
    return false;
  }
}

function shouldClearOnStartup() {
  // If .next doesn't exist, no need to clear
  if (!fs.existsSync(NEXT_DIR)) {
    return null;
  }

  // If .next exists but was from a production build, clear it
  if (fs.existsSync(BUILD_MARKER) && !fs.existsSync(DEV_MARKER)) {
    return 'production build detected';
  }

  // ALWAYS clear if .next exists - this prevents stale chunk 404s
  // The cost is a few seconds of startup time, but it's worth it for reliability
  return 'fresh start (prevents stale chunks)';
}

function createDevMarker() {
  // Create a marker file to indicate this is a dev session
  try {
    if (!fs.existsSync(NEXT_DIR)) {
      fs.mkdirSync(NEXT_DIR, { recursive: true });
    }
    fs.writeFileSync(DEV_MARKER, Date.now().toString());
  } catch (e) {
    // Ignore errors
  }
}

function startDevServer() {
  console.log('\n🚀 Starting Next.js dev server on port 3001...\n');

  // Create dev marker after a short delay (once .next exists)
  setTimeout(createDevMarker, 3000);

  devProcess = spawn('npx', ['next', 'dev', '-p', '3001'], {
    cwd: ROOT_DIR,
    stdio: ['inherit', 'pipe', 'pipe'],
    shell: true,
    env: {
      ...process.env,
      // Force webpack to rebuild on HMR issues
      WATCHPACK_POLLING: 'true',
    },
  });

  let outputBuffer = '';
  let errorDetected = false;

  const handleOutput = (data) => {
    const text = data.toString();
    process.stdout.write(text);
    outputBuffer += text;

    // Keep buffer from growing too large
    if (outputBuffer.length > 20000) {
      outputBuffer = outputBuffer.slice(-10000);
    }

    // Check for cache corruption errors (debounced)
    if (!errorDetected) {
      for (const pattern of ERROR_PATTERNS) {
        if (pattern.test(text)) {
          errorDetected = true;
          setTimeout(() => {
            handleCacheError(pattern.toString());
            errorDetected = false;
          }, 500);
          break;
        }
      }
    }
  };

  devProcess.stdout.on('data', handleOutput);
  devProcess.stderr.on('data', handleOutput);

  devProcess.on('close', (code) => {
    if (code !== 0 && code !== null) {
      console.log(`\n⚠️  Dev server exited with code ${code}`);

      // If it crashed unexpectedly, try to restart
      if (code !== 0 && restartCount < MAX_RESTARTS) {
        console.log('   Attempting automatic recovery...');
        setTimeout(() => {
          clearCache('crash recovery');
          restartCount++;
          startDevServer();
        }, 2000);
      }
    }
  });

  devProcess.on('error', (err) => {
    console.error('\n❌ Failed to start dev server:', err.message);
  });
}

function handleCacheError(pattern) {
  const now = Date.now();

  // Check cooldown to prevent restart loops
  if (now - lastRestartTime < RESTART_COOLDOWN) {
    console.log('\n⏳ Cooldown active, skipping restart...');
    return;
  }

  // Check max restarts
  if (restartCount >= MAX_RESTARTS) {
    console.log('\n❌ Max restart attempts reached. Please run: npm run clean && npm run dev');
    return;
  }

  console.log('\n⚠️  Cache/webpack error detected!');
  console.log(`   Pattern: ${pattern.slice(0, 50)}...`);
  console.log('   Auto-fixing...');

  // Kill current process
  if (devProcess) {
    devProcess.kill('SIGTERM');
    devProcess = null;
  }

  // Wait a moment for process to die
  setTimeout(() => {
    if (clearCache('error recovery')) {
      restartCount++;
      lastRestartTime = Date.now();
      console.log(`\n🔄 Restarting dev server (attempt ${restartCount}/${MAX_RESTARTS})...`);
      startDevServer();
    }
  }, 1500);
}

// Handle Ctrl+C gracefully
process.on('SIGINT', () => {
  console.log('\n\n👋 Shutting down...');
  if (devProcess) {
    devProcess.kill('SIGTERM');
  }
  process.exit(0);
});

process.on('SIGTERM', () => {
  if (devProcess) {
    devProcess.kill('SIGTERM');
  }
  process.exit(0);
});

// Initial start
console.log('═══════════════════════════════════════════════════════════');
console.log('  Rentokil BI - Development Server with Auto Cache Fix');
console.log('═══════════════════════════════════════════════════════════');
console.log('  Cache errors will be automatically detected and fixed.');
console.log('  Press Ctrl+C to stop.');
console.log('═══════════════════════════════════════════════════════════');

// Check if we need to clear cache before starting
const clearReason = shouldClearOnStartup();
if (clearReason) {
  clearCache(clearReason);
}

startDevServer();
