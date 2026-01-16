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

app.use(
  express.static(publicPath, {
    maxAge: "1y",
    etag: false,
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
