#!/usr/bin/env node

/**
 * Post-build script to fix relative paths in dist/package.json
 * ng-packagr copies the root package.json to dist/, but paths need adjustment
 * since the dist package.json is one level deeper in the published package
 */

const fs = require('fs');
const path = require('path');

const distPackagePath = path.join(__dirname, 'dist', 'package.json');

try {
  const pkg = JSON.parse(fs.readFileSync(distPackagePath, 'utf-8'));

  // Fix main field - remove ./dist/ prefix since we're already in dist
  if (pkg.main && pkg.main.includes('./dist/')) {
    pkg.main = pkg.main.replace('./dist/', './');
  }

  // Fix module field - remove ./dist/ prefix
  if (pkg.module && pkg.module.includes('./dist/')) {
    pkg.module = pkg.module.replace('./dist/', './');
  }

  // Fix types field - remove ./dist/ prefix
  if (pkg.types && pkg.types.includes('./dist/')) {
    pkg.types = pkg.types.replace('./dist/', './');
  }

  // Fix exports field recursively
  if (pkg.exports) {
    const fixExports = (obj) => {
      for (const key in obj) {
        if (typeof obj[key] === 'string' && obj[key].includes('./dist/')) {
          obj[key] = obj[key].replace('./dist/', './');
        } else if (typeof obj[key] === 'object' && obj[key] !== null) {
          fixExports(obj[key]);
        }
      }
    };
    fixExports(pkg.exports);
  }

  fs.writeFileSync(distPackagePath, JSON.stringify(pkg, null, 2) + '\n');
  console.log('✓ Fixed dist/package.json paths');
} catch (error) {
  console.error('Error fixing dist/package.json:', error.message);
  process.exit(1);
}
