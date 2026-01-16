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

const app = express();

// Determine correct path to public directory
const publicPath = path.join(__dirname, "..", "public");
const indexPath = path.join(publicPath, "index.html");

console.log("[API] __dirname:", __dirname);
console.log("[API] publicPath:", publicPath);
console.log("[API] indexPath:", indexPath);
console.log("[API] Public exists:", fs.existsSync(publicPath));
console.log("[API] Index.html exists:", fs.existsSync(indexPath));

// === MIDDLEWARE ===

// CORS headers - CRITICAL for browser access
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, PATCH, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.header("Access-Control-Max-Age", "86400");

  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

// Security headers (but allow inline scripts for simplicity)
app.use((req, res, next) => {
  res.header("X-Content-Type-Options", "nosniff");
  res.header("X-Frame-Options", "SAMEORIGIN");
  res.header("X-XSS-Protection", "1; mode=block");
  res.header("Referrer-Policy", "strict-origin-when-cross-origin");
  // CSP that allows inline scripts
  res.header("Content-Security-Policy", "default-src 'self' 'unsafe-inline' https:; script-src 'self' 'unsafe-inline' https:; style-src 'self' 'unsafe-inline' https:;");
  next();
});

// Body parsing (before routes)
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// === API ROUTES (defined FIRST, before static/SPA) ===

// Health check
app.get("/health", (req, res) => {
  console.log("[API] /health requested");
  res.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "production",
    version: "1.0.0",
  });
});

// Metrics
app.get("/metrics", (req, res) => {
  console.log("[API] /metrics requested");
  res.json({
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
  });
});

// API info
app.get("/api", (req, res) => {
  console.log("[API] /api requested");
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
  console.log("[API] /api/tasks GET requested");
  res.json({
    message: "Tasks API endpoint",
    tasks: [],
  });
});

app.post("/api/tasks", (req, res) => {
  console.log("[API] /api/tasks POST requested");
  res.status(201).json({
    message: "Task created",
    id: 1,
  });
});

// === STATIC FILES ===

app.use((req, res, next) => {
  // Disable caching for HTML and JS
  if (req.path.endsWith(".html") || req.path.endsWith(".js") || req.path.endsWith(".css")) {
    res.header("Cache-Control", "no-cache, no-store, must-revalidate");
    res.header("Pragma", "no-cache");
    res.header("Expires", "0");
  }
  next();
});

app.use(
  express.static(publicPath, {
    maxAge: "1d",
    etag: true,
  })
);

// === SPA FALLBACK ===

// Serve index.html for all other routes
app.get("*", (req, res) => {
  console.log("[API] * catch-all requested for:", req.path);

  if (!fs.existsSync(indexPath)) {
    console.error("[API] ❌ index.html not found at:", indexPath);
    return res.status(404).json({
      error: "index.html not found",
      path: indexPath,
    });
  }

  console.log("[API] ✅ Serving index.html");
  res.sendFile(indexPath);
});

// === ERROR HANDLER ===

app.use((err, req, res, next) => {
  console.error("[API] Error:", err);
  res.status(err.status || 500).json({
    error: err.message || "Internal Server Error",
    timestamp: new Date().toISOString(),
  });
});

console.log("[API] Express app configured and exported");

// Export for Vercel
module.exports = app;
