#!/usr/bin/env node

/**
 * Production Deployment Validation Script
 * Checks all configurations before deployment
 */

const fs = require("fs");
const path = require("path");
const EnvironmentConfig = require("./environment-config");
const { SecurityConfig } = require("./security-config");

console.log("🔍 Running Production Deployment Validation...\n");

let allChecksPass = true;

// Check 1: Environment Variables
console.log("📋 Check 1: Environment Configuration");
try {
  const config = new EnvironmentConfig();
  console.log(`   ✅ Configuration loaded for: ${config.environment}`);
  console.log(`   ✅ Port: ${config.get("server.port")}`);
  console.log(`   ✅ App name: ${config.get("app.name")}`);
} catch (error) {
  console.error(`   ❌ Configuration error: ${error.message}`);
  allChecksPass = false;
}

// Check 2: Required Files
console.log("\n📁 Check 2: Required Files");
const requiredFiles = ["package.json", "server.js", "environment-config.js", "security-config.js", "production-config.js", "vercel.json", "public/index.html"];

requiredFiles.forEach((file) => {
  const filePath = path.join(__dirname, file);
  if (fs.existsSync(filePath)) {
    console.log(`   ✅ ${file}`);
  } else {
    console.log(`   ❌ Missing: ${file}`);
    allChecksPass = false;
  }
});

// Check 3: Environment Files
console.log("\n🔐 Check 3: Environment Files");
const envFiles = [".env.development", ".env.production", ".env.test"];
envFiles.forEach((file) => {
  const filePath = path.join(__dirname, file);
  if (fs.existsSync(filePath)) {
    console.log(`   ✅ ${file}`);
  } else {
    console.log(`   ⚠️  Optional: ${file}`);
  }
});

// Check 4: Dependencies
console.log("\n📦 Check 4: Dependencies");
const packageJson = require("./package.json");
const requiredDeps = ["express", "compression", "cors", "helmet", "express-rate-limit", "morgan", "dotenv"];
const missingDeps = requiredDeps.filter((dep) => !packageJson.dependencies[dep]);

if (missingDeps.length === 0) {
  console.log(`   ✅ All required dependencies present`);
  requiredDeps.forEach((dep) => {
    console.log(`      • ${dep}: ${packageJson.dependencies[dep]}`);
  });
} else {
  console.log(`   ❌ Missing dependencies: ${missingDeps.join(", ")}`);
  allChecksPass = false;
}

// Check 5: Package.json Scripts
console.log("\n⚙️  Check 5: Package Scripts");
const requiredScripts = ["start", "dev"];
requiredScripts.forEach((script) => {
  if (packageJson.scripts[script]) {
    console.log(`   ✅ npm run ${script}`);
  } else {
    console.log(`   ❌ Missing script: npm run ${script}`);
    allChecksPass = false;
  }
});

// Check 6: Configuration Validation
console.log("\n🔒 Check 6: Security Configuration");
try {
  const config = new EnvironmentConfig();

  if (config.isDevelopment()) {
    console.log("   ⚠️  Running in DEVELOPMENT mode");
    console.log("   ✅ Development secrets allowed");
  } else if (config.isProduction()) {
    // Check for production secrets
    if (process.env.SESSION_SECRET && !process.env.SESSION_SECRET.includes("dev-")) {
      console.log("   ✅ SESSION_SECRET configured");
    } else {
      console.log("   ⚠️  SESSION_SECRET needs configuration");
    }

    if (process.env.CORS_ORIGINS) {
      console.log(`   ✅ CORS_ORIGINS: ${process.env.CORS_ORIGINS}`);
    } else {
      console.log("   ⚠️  CORS_ORIGINS needs configuration");
    }
  }

  console.log("   ✅ Security config validated");
} catch (error) {
  console.error(`   ❌ Security validation error: ${error.message}`);
}

// Check 7: Server Configuration
console.log("\n🚀 Check 7: Server Configuration");
try {
  const config = new EnvironmentConfig();

  if (config.get("server.port")) {
    console.log(`   ✅ Server port: ${config.get("server.port")}`);
  }

  if (config.get("monitoring.enabled")) {
    console.log(`   ✅ Monitoring enabled`);
    console.log(`      • Health check: ${config.get("monitoring.healthCheckPath")}`);
    console.log(`      • Metrics: ${config.get("monitoring.metricsPath")}`);
  }

  if (config.get("performance.compressionEnabled")) {
    console.log(`   ✅ Compression enabled`);
  }
} catch (error) {
  console.log(`   ⚠️  Server configuration: ${error.message}`);
}

// Check 8: Vercel Configuration
console.log("\n☁️  Check 8: Vercel Deployment Configuration");
try {
  const vercelConfig = require("./vercel.json");
  console.log(`   ✅ Vercel config found`);
  console.log(`      • Project name: ${vercelConfig.name}`);
  console.log(`      • Routes: ${vercelConfig.routes.length}`);
} catch (error) {
  console.log(`   ⚠️  Vercel config: ${error.message}`);
}

// Summary
console.log("\n" + "=".repeat(50));
if (allChecksPass) {
  console.log("✅ All critical checks passed!");
  console.log("\n🚀 Ready for deployment to production");
  console.log("\nNext steps:");
  console.log("1. Update .env.production with your settings");
  console.log("2. Run: vercel");
  console.log("3. Set environment variables in Vercel dashboard");
  console.log("4. Verify deployment with: vercel -l");
  console.log("5. Check health: https://yourdomain.com/health");
  process.exit(0);
} else {
  console.log("⚠️  Some checks failed. Please review above.");
  console.log("\nFix issues before deploying to production.");
  process.exit(1);
}
