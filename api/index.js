/**
 * Vercel Serverless Function Handler
 * This file serves as the entry point for Vercel's serverless environment
 */

require("dotenv").config({
  path: process.env.NODE_ENV === "production" ? ".env.production" : ".env.development",
});

const express = require("express");
const path = require("path");
const fs = require("fs");
const compression = require("compression");
const cors = require("cors");
const morgan = require("morgan");

const app = express();

// Determine correct path to public directory
const publicPath = path.join(__dirname, "..", "public");
console.log("📁 Public path:", publicPath);
console.log("📁 Public path exists:", fs.existsSync(publicPath));

// === MIDDLEWARE ===

// Compression
app.use(
  compression({
    level: 6,
    threshold: 1024,
  })
);

// CORS
app.use(
  cors({
    origin: "*",
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Request logging
app.use(morgan("combined"));

// Body parsing
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// === STATIC FILES ===

// Serve static files from public directory
app.use(
  express.static(publicPath, {
    maxAge: "1y",
    etag: false,
  })
);

// === ROUTES ===

// Health check
app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "production",
    __dirname: __dirname,
    publicPath: publicPath,
  });
});

// Metrics
app.get("/metrics", (req, res) => {
  res.json({
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
  });
});

// API info
app.get("/api", (req, res) => {
  res.json({
    name: "Task Management System",
    version: "1.0.0",
    environment: process.env.NODE_ENV || "production",
    endpoints: {
      health: "/health",
      metrics: "/metrics",
      tasks: "/api/tasks",
    },
  });
});

// Tasks API
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

// Serve index.html for all non-API routes
app.get("*", (req, res) => {
  // Don't serve index.html for /api routes
  if (req.path.startsWith("/api")) {
    return res.status(404).json({
      error: "Not Found",
      path: req.path,
    });
  }

  const indexPath = path.join(publicPath, "index.html");
  console.log("📄 Serving index.html from:", indexPath);

  if (!fs.existsSync(indexPath)) {
    console.error("❌ index.html not found at:", indexPath);
    return res.status(404).json({
      error: "index.html not found",
      path: indexPath,
    });
  }

  res.sendFile(indexPath);
});

// === ERROR HANDLER ===

app.use((err, req, res, next) => {
  console.error("Error:", err);
  res.status(err.status || 500).json({
    error: err.message || "Internal Server Error",
    timestamp: new Date().toISOString(),
  });
});

// Export for Vercel
module.exports = app;
