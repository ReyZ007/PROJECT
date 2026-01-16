/**
 * Vercel Serverless Function Handler
 * This file serves as the entry point for Vercel's serverless environment
 *
 * Important: Vercel serverless functions expect the app to be exported directly
 * The Express app handles all routing and middleware
 */

const express = require("express");

let app;

try {
  // Try to load the full production server
  app = require("../server");
} catch (error) {
  // Fallback: Create minimal Express app if server fails to load
  console.error("⚠️  Failed to load server, using fallback:", error.message);

  app = express();

  // Health endpoint fallback
  app.get("/health", (req, res) => {
    res.json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      environment: "vercel-fallback",
      message: "Fallback mode - check logs for details",
    });
  });

  // Catch-all for other routes
  app.use((req, res) => {
    res.json({
      message: "Task Management System",
      status: "running (fallback mode)",
      error: error.message,
    });
  });
}

// Export the Express app for Vercel
module.exports = app;
