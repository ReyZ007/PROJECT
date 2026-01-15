/**
 * Vercel Serverless Function Handler
 * This file serves as the entry point for Vercel's serverless environment
 *
 * Important: Vercel serverless functions expect the app to be exported directly
 * The Express app handles all routing and middleware
 */

const app = require("../server");

// Export the Express app for Vercel
// Vercel will automatically handle converting this to a serverless function
module.exports = app;
