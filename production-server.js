/**
 * Day 5: Production Server Configuration
 * Enhanced server with security, monitoring, and logging
 */

const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const compression = require("compression");
const fs = require("fs");
const path = require("path");

// Initialize Express app
const app = express();

// Configuration
const config = {
  environment: process.env.NODE_ENV || "development",
  port: parseInt(process.env.PORT) || 3000,
  host: process.env.HOST || "0.0.0.0",
  corsOrigins: (process.env.CORS_ORIGINS || "http://localhost:3000").split(","),
  rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX) || 100,
  rateLimitWindow: parseInt(process.env.RATE_LIMIT_WINDOW) || 15 * 60 * 1000,
  enableLogging: process.env.ENABLE_LOGGING !== "false",
  enableMonitoring: process.env.ENABLE_MONITORING !== "false",
};

// ============================================
// SECURITY MIDDLEWARE
// ============================================

// Helmet.js for security headers
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
      },
    },
    hsts: {
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: true,
    },
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
    xssFilter: true,
    noSniff: true,
    frameGuard: { action: "deny" },
    hidePoweredBy: true,
  })
);

// CORS middleware
app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || config.corsOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    maxAge: 3600,
  })
);

// Rate limiting
const generalLimiter = rateLimit({
  windowMs: config.rateLimitWindow,
  max: config.rateLimitMax,
  message: "Too many requests from this IP, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for health checks
    return req.path === "/health" || req.path === "/ready";
  },
});

// Stricter rate limiting for authentication endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts
  message: "Too many login attempts, please try again later.",
  skipSuccessfulRequests: true,
  standardHeaders: true,
});

app.use(generalLimiter);

// ============================================
// BODY PARSING MIDDLEWARE
// ============================================

app.use(compression());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));

// ============================================
// LOGGING SETUP
// ============================================

const logsDir = path.join(__dirname, "logs");
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

class Logger {
  log(level, message, metadata = {}) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      ...metadata,
    };

    if (config.enableLogging) {
      console.log(`[${timestamp}] [${level.toUpperCase()}] ${message}`, metadata);

      if (config.environment === "production") {
        const logFile = path.join(logsDir, `${level}.log`);
        fs.appendFileSync(logFile, JSON.stringify(logEntry) + "\n");
      }
    }
  }

  info(message, metadata) {
    this.log("info", message, metadata);
  }
  warn(message, metadata) {
    this.log("warn", message, metadata);
  }
  error(message, metadata) {
    this.log("error", message, metadata);
  }
  debug(message, metadata) {
    this.log("debug", message, metadata);
  }
}

const logger = new Logger();

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    logger.info("HTTP Request", {
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
    });

    // Log slow requests
    if (duration > 1000) {
      logger.warn("Slow request detected", {
        method: req.method,
        path: req.path,
        duration: `${duration}ms`,
      });
    }
  });
  next();
});

// ============================================
// MONITORING ENDPOINTS
// ============================================

// Health check endpoint
app.get("/health", (req, res) => {
  const health = {
    status: "OK",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: config.environment,
  };

  res.status(200).json(health);
});

// Readiness check endpoint
app.get("/ready", (req, res) => {
  const ready = {
    ready: true,
    timestamp: new Date().toISOString(),
    checks: {
      memory: process.memoryUsage().heapUsed < process.memoryUsage().heapTotal * 0.9,
      uptime: process.uptime() > 0,
    },
  };

  if (!ready.checks.memory) {
    return res.status(503).json(ready);
  }

  res.status(200).json(ready);
});

// Metrics endpoint (if monitoring enabled)
if (config.enableMonitoring) {
  app.get("/metrics", (req, res) => {
    const metrics = {
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: {
        heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + " MB",
        heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + " MB",
        external: Math.round(process.memoryUsage().external / 1024 / 1024) + " MB",
      },
      cpu: {
        userCPUTime: process.cpuUsage().user,
        systemCPUTime: process.cpuUsage().system,
      },
      environment: config.environment,
    };

    res.status(200).json(metrics);
  });
}

// ============================================
// STATIC FILES
// ============================================

app.use(
  express.static(path.join(__dirname, "public"), {
    maxAge: config.environment === "production" ? "1d" : "0",
  })
);

// ============================================
// API ROUTES (Example)
// ============================================

// Apply auth limiter to login endpoint
app.post("/api/auth/login", authLimiter, (req, res) => {
  try {
    // Login logic here
    res.json({ success: true, message: "Logged in successfully" });
  } catch (error) {
    logger.error("Login error", { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// ERROR HANDLING MIDDLEWARE
// ============================================

// 404 handler
app.use((req, res) => {
  logger.warn("404 Not Found", { path: req.path, method: req.method });
  res.status(404).json({
    success: false,
    error: "Not Found",
    path: req.path,
  });
});

// Global error handler
app.use((err, req, res, next) => {
  logger.error("Unhandled error", {
    message: err.message,
    stack: err.stack,
    path: req.path,
  });

  res.status(err.status || 500).json({
    success: false,
    error: config.environment === "production" ? "Internal Server Error" : err.message,
    timestamp: new Date().toISOString(),
  });
});

// ============================================
// SERVER STARTUP
// ============================================

const server = app.listen(config.port, config.host, () => {
  logger.info("Server started", {
    environment: config.environment,
    port: config.port,
    host: config.host,
    uptime: process.uptime(),
  });
});

// ============================================
// GRACEFUL SHUTDOWN
// ============================================

const gracefulShutdown = (signal) => {
  logger.info(`${signal} signal received, starting graceful shutdown...`);

  server.close(() => {
    logger.info("Server closed");
    process.exit(0);
  });

  // Force shutdown after 30 seconds
  setTimeout(() => {
    logger.error("Forced shutdown due to timeout");
    process.exit(1);
  }, 30000);
};

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

// ============================================
// UNCAUGHT EXCEPTIONS
// ============================================

process.on("uncaughtException", (err) => {
  logger.error("Uncaught Exception", {
    message: err.message,
    stack: err.stack,
  });
  process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  logger.error("Unhandled Rejection", {
    reason: String(reason),
    promise: String(promise),
  });
});

module.exports = app;
