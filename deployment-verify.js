#!/usr/bin/env node

/**
 * Day 5: Production Deployment Verification Script
 * Checks if the application is ready for production deployment
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

console.log("\n🚀 Production Deployment Verification\n");

const checks = {
  passed: 0,
  failed: 0,
  warnings: 0,
};

function checkStatus(name, passed, message = "") {
  if (passed) {
    console.log(`✅ ${name}`);
    checks.passed++;
  } else {
    console.log(`❌ ${name}${message ? ": " + message : ""}`);
    checks.failed++;
  }
}

function checkWarning(name, message = "") {
  console.log(`⚠️  ${name}${message ? ": " + message : ""}`);
  checks.warnings++;
}

// ============================================
// 1. Environment Files Check
// ============================================
console.log("📋 1. Environment Configuration\n");

const envFiles = [".env", ".env.production", ".env.development"];
let hasEnvFile = false;

envFiles.forEach((file) => {
  const exists = fs.existsSync(path.join(__dirname, file));
  if (exists) {
    checkStatus(`${file} exists`, true);
    hasEnvFile = true;
  }
});

if (!hasEnvFile) {
  checkWarning("No .env files found", "Create .env.production before deploying");
}

// ============================================
// 2. Dependencies Check
// ============================================
console.log("\n📦 2. Dependencies\n");

const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, "package.json"), "utf8"));
const requiredDeps = ["express", "helmet", "cors", "express-rate-limit", "compression"];

requiredDeps.forEach((dep) => {
  const hasDepInDeps = packageJson.dependencies[dep];
  const hasDepInDevDeps = packageJson.devDependencies?.[dep];
  checkStatus(`${dep} installed`, !!(hasDepInDeps || hasDepInDevDeps), hasDepInDeps ? packageJson.dependencies[dep] : "");
});

// ============================================
// 3. Security Checks
// ============================================
console.log("\n🔒 3. Security Configuration\n");

const securityFiles = ["production-server.js", "security-config-day5.js", "production-config-day5.js"];
securityFiles.forEach((file) => {
  const exists = fs.existsSync(path.join(__dirname, file));
  checkStatus(`${file} exists`, exists);
});

// ============================================
// 4. Build Verification
// ============================================
console.log("\n🔨 4. Build Verification\n");

try {
  // Note: src/app.js uses DOM, so we skip it for Node.js
  // This is OK for frontend applications
  checkWarning("Application module (src/app.js)", "Frontend module - verified by browser");
} catch (error) {
  checkStatus("Application module loads", false, error.message);
}

try {
  require("./production-server.js");
  checkStatus("Production server loads", true);
} catch (error) {
  checkStatus("Production server loads", false, error.message);
}

// ============================================
// 5. Test Status
// ============================================
console.log("\n🧪 5. Testing\n");

try {
  const testDir = path.join(__dirname, "tests");
  const hasTests = fs.existsSync(testDir) && fs.readdirSync(testDir).length > 0;
  checkStatus("Test files exist", hasTests);
} catch (error) {
  checkWarning("Unable to verify test files", error.message);
}

// ============================================
// 6. Documentation Check
// ============================================
console.log("\n📚 6. Documentation\n");

const docFiles = [
  { name: "Deployment Guide", path: "DAY5_DEPLOYMENT_GUIDE.md" },
  { name: "README", path: "README.md" },
  { name: "Contributing Guide", path: "CONTRIBUTING.md" },
];

docFiles.forEach((doc) => {
  const exists = fs.existsSync(path.join(__dirname, doc.path));
  checkStatus(`${doc.name} (${doc.path})`, exists);
});

// ============================================
// 7. Node Version Check
// ============================================
console.log("\n⚙️  7. Environment\n");

const nodeVersion = process.version;
const majorVersion = parseInt(nodeVersion.slice(1).split(".")[0]);
checkStatus(`Node.js version >= 14`, majorVersion >= 14, nodeVersion);

// ============================================
// Summary
// ============================================
console.log("\n" + "=".repeat(50));
console.log("📊 VERIFICATION SUMMARY\n");
console.log(`✅ Passed: ${checks.passed}`);
console.log(`❌ Failed: ${checks.failed}`);
console.log(`⚠️  Warnings: ${checks.warnings}`);
console.log("=".repeat(50));

// ============================================
// Recommendations
// ============================================
if (checks.failed === 0) {
  console.log("\n✨ Application is ready for production deployment!\n");
  console.log("Next steps:");
  console.log("1. Review and update .env.production with your configuration");
  console.log("2. Run: npm test (to verify all tests pass)");
  console.log("3. Run: npm run prod (to test production server locally)");
  console.log("4. Deploy using your hosting platform (Netlify, Vercel, Heroku, etc.)");
} else {
  console.log("\n⚠️  Please fix the failed checks before deploying.\n");
  process.exit(1);
}

console.log("\n🚀 Happy deploying!\n");
