/**
 * Production-Ready Server for Task Management System
 * Day 5: Deployment & Production Best Practices
 *
 * This server implements security, monitoring, and production configurations
 */

require("dotenv").config({
  path: process.env.NODE_ENV === "production" ? ".env.production" : ".env.development",
});

const express = require("express");
const path = require("path");
const compression = require("compression");
const cors = require("cors");
const morgan = require("morgan");

let config, security, app;

try {
  const EnvironmentConfig = require("./environment-config");
  const { SecurityConfig, SecurityUtils } = require("./security-config");

  // Initialize configuration
  config = new EnvironmentConfig();

  // Validate configuration (warn but don't crash in serverless)
  try {
    config.validateConfiguration();
    console.log(`✅ Configuration validated for ${config.environment} environment`);
  } catch (error) {
    console.warn("⚠️  Configuration validation warning:");
    console.warn(error.message);

    // Only exit in non-serverless environments
    if (process.env.VERCEL === undefined) {
      console.error("❌ Exiting due to validation failure (not in serverless)");
      process.exit(1);
    } else {
      console.warn("⚠️  Continuing in serverless environment despite warnings");
    }
  }

  // Initialize security
  security = new SecurityConfig({
    corsOrigins: config.get("security.corsOrigins"),
    sessionSecret: config.get("security.sessionSecret"),
    rateLimitWindow: config.get("security.rateLimitWindow"),
    rateLimitMax: config.get("security.rateLimitMax"),
  });
} catch (error) {
  console.error("❌ Failed to initialize config/security:", error.message);
  if (process.env.VERCEL === undefined) {
    process.exit(1);
  }
  // In serverless, create minimal config
  config = {
    get: () => undefined,
    isDevelopment: () => false,
    environment: "vercel-error",
    getSummary: () => ({}),
  };
  security = { getMiddleware: () => [] };
}

app = express();
const PORT = config?.get?.("server.port") || 3000;
const HOST = config?.get?.("server.host") || "0.0.0.0";

// === MIDDLEWARE SETUP ===

try {
  // Trust proxy (important for Vercel, Heroku, etc.)
  const trustedProxies = config?.get?.("security.trustedProxies") || 1;
  app.set("trust proxy", trustedProxies);

  // Compression middleware
  const compressionEnabled = config?.get?.("performance.compressionEnabled") !== false;
  if (compressionEnabled) {
    app.use(
      compression({
        level: config?.get?.("performance.compressionLevel") || 6,
        filter: (req, res) => {
          if (req.headers["x-no-compression"]) {
            return false;
          }
          return compression.filter(req, res);
        },
        threshold: 1024, // Only compress > 1KB
      })
    );
  }

  // Security headers
  app.use(security.createSecurityHeadersMiddleware());

  // CORS middleware
  app.use(cors(security.createCorsConfig()));

  // Request logging
  if (config.get("logging.enableConsole")) {
    app.use(morgan(config.get("logging.format")));
  }

  // Body parsing middleware
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true, limit: "10mb" }));

  // Input validation middleware
  app.use(security.createInputValidator());

  // === STATIC FILE SERVING ===

  // Serve static files from public directory with caching
  app.use(
    express.static(path.join(__dirname, "public"), {
      maxAge: config.get("performance.staticCacheMaxAge") * 1000,
      etag: config.get("performance.etag"),
      lastModified: config.get("performance.lastModified"),
    })
  );

  // Serve source files in development
  if (config.isDevelopment()) {
    app.use("/src", express.static(path.join(__dirname, "src")));
  }

  // === API ROUTES ===

  // Health check endpoint
  app.get("/health", (req, res) => {
    const healthCheck = {
      status: "healthy",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: config.environment,
      version: config.get("app.version"),
      memory: process.memoryUsage(),
      cpu: process.cpuUsage(),
    };
    res.status(200).json(healthCheck);
  });

  // Metrics endpoint
  app.get("/metrics", (req, res) => {
    const metrics = {
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      cpu: process.cpuUsage(),
      environment: config.environment,
      version: config.get("app.version"),
    };
    res.status(200).json(metrics);
  });

  // API info endpoint
  app.get("/api", (req, res) => {
    res.json({
      name: config.get("app.name"),
      version: config.get("app.version"),
      environment: config.environment,
      endpoints: {
        health: "/health",
        metrics: "/metrics",
        api: "/api",
      },
      timestamp: new Date().toISOString(),
    });
  });

  // Tasks API endpoints (placeholder)
  app.get("/api/tasks", (req, res) => {
    res.json({
      message: "Tasks API endpoint",
      tasks: [],
    });
  });

  app.post("/api/tasks", (req, res) => {
    res.status(201).json({
      message: "Task created",
      id: 1,
    });
  });

  // === SPA FALLBACK ===

  // Serve index.html for all non-API routes (SPA support)
  app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"), {
      cacheControl: false,
    });
  });

  // === ERROR HANDLING ===

  // 404 handler
  app.use((req, res) => {
    res.status(404).json({
      error: "Not Found",
      message: "The requested resource was not found",
      path: req.path,
      method: req.method,
    });
  });

  // Global error handler
  app.use((err, req, res, next) => {
    console.error("❌ Error:", {
      timestamp: new Date().toISOString(),
      error: err.message,
      stack: err.stack,
      url: req.url,
      method: req.method,
      ip: req.ip,
    });

    // Don't leak error details in production
    const isDev = config.isDevelopment();

    res.status(err.status || 500).json({
      error: err.name || "Internal Server Error",
      message: isDev ? err.message : "Something went wrong",
      ...(isDev && { stack: err.stack }),
    });
  });
} catch (error) {
  console.error("❌ Failed to setup middleware:", error.message);
  if (process.env.VERCEL === undefined) {
    process.exit(1);
  }
}

// Only start listening if not in Vercel serverless environment
let server;
if (process.env.VERCEL === undefined) {
  // Create server for local/traditional deployments
  server = app.listen(PORT, HOST, () => {
    console.log(`\n🚀 ${config.get("app.name")} v${config.get("app.version")}`);
    console.log(`📡 Server running on http://${HOST}:${PORT}`);
    console.log(`🌍 Environment: ${config.environment.toUpperCase()}`);
    console.log(`\n📊 Endpoints:`);
    console.log(`   • Health check: http://${HOST}:${PORT}/health`);
    console.log(`   • Metrics: http://${HOST}:${PORT}/metrics`);
    console.log(`   • API: http://${HOST}:${PORT}/api`);

    if (config.isDevelopment()) {
      console.log(`\n💡 Development Tips:`);
      console.log(`   • Edit files in /public and /src directories`);
      console.log(`   • Check console for morgan request logs`);
      console.log(`   • API responses are logged in detail`);
    }

    console.log(`\n⚙️ Configuration Summary:`);
    const summary = config.getSummary();
    console.log(`   • Compression: ${summary.performance.compressionEnabled}`);
    console.log(`   • CORS Origins: ${summary.security.corsOrigins.join(", ")}`);
    console.log(`   • Rate Limit: ${summary.security.rateLimitMax} requests per ${summary.security.rateLimitWindow / 60000} minutes`);
    console.log(`   • Cache Max Age: ${summary.performance.cacheMaxAge / 86400} days`);

    console.log(`\n🛑 Press Ctrl+C to stop the server\n`);
  });
} else {
  // Vercel serverless environment
  console.log(`✅ Vercel serverless environment detected`);
  console.log(`🚀 ${config.get("app.name")} v${config.get("app.version")}`);
  console.log(`🌍 Environment: ${config.environment.toUpperCase()}`);
}

// === GRACEFUL SHUTDOWN ===

const gracefulShutdown = (signal) => {
  console.log(`\n⚠️  ${signal} received, starting graceful shutdown...`);

  // Only close server if it exists (not in Vercel serverless)
  if (server) {
    // Stop accepting new connections
    server.close(() => {
      console.log("✅ Server closed");
      console.log("👋 Goodbye!");
      process.exit(0);
    });

    // Force close after timeout
    const shutdownTimeout = config.get("gracefulShutdownTimeout") || 30000;
    setTimeout(() => {
      console.error("❌ Forced shutdown after timeout");
      process.exit(1);
    }, shutdownTimeout);
  } else {
    // Vercel serverless - exit immediately
    console.log("✅ Shutting down (serverless environment)");
    process.exit(0);
  }
};

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

// Handle uncaught exceptions
process.on("uncaughtException", (err) => {
  console.error("❌ Uncaught Exception:", {
    timestamp: new Date().toISOString(),
    error: err.message,
    stack: err.stack,
  });
  gracefulShutdown("UNCAUGHT_EXCEPTION");
});

// Handle unhandled promise rejections
process.on("unhandledRejection", (reason, promise) => {
  console.error("❌ Unhandled Rejection:", {
    timestamp: new Date().toISOString(),
    promise,
    reason,
  });
  gracefulShutdown("UNHANDLED_REJECTION");
});

module.exports = app;
