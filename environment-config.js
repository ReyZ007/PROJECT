/**
 * Day 5: Environment Configuration Management
 * Centralized configuration for different deployment environments
 */

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

/**
 * Environment Configuration Manager
 */
class EnvironmentConfig {
  constructor(environment = null) {
    this.environment = environment || process.env.NODE_ENV || "development";
    this.config = this.loadConfiguration();
    this.validateConfiguration();
  }

  /**
   * Load configuration based on environment
   */
  loadConfiguration() {
    const baseConfig = this.getBaseConfiguration();
    const envConfig = this.getEnvironmentConfiguration();

    return this.mergeConfigurations(baseConfig, envConfig);
  }

  /**
   * Get base configuration (common to all environments)
   */
  getBaseConfiguration() {
    return {
      app: {
        name: "Task Management System",
        version: process.env.npm_package_version || "1.0.0",
        description: "A production-ready task management application",
      },

      server: {
        host: "0.0.0.0",
        port: parseInt(process.env.PORT) || 3000,
        timeout: 30000,
        keepAliveTimeout: 5000,
      },

      security: {
        bcryptRounds: 12,
        jwtExpiresIn: "24h",
        sessionMaxAge: 24 * 60 * 60 * 1000, // 24 hours
        rateLimitWindow: 15 * 60 * 1000, // 15 minutes
        rateLimitMax: 100,
        corsOrigins: [],
        trustedProxies: 1,
      },

      logging: {
        level: "info",
        format: "combined",
        enableConsole: true,
        enableFile: true,
        maxFiles: 5,
        maxSize: "10m",
      },

      monitoring: {
        enabled: true,
        healthCheckPath: "/health",
        metricsPath: "/metrics",
        readinessPath: "/ready",
        livenessPath: "/live",
      },

      performance: {
        compressionEnabled: true,
        compressionLevel: 6,
        cacheMaxAge: 86400, // 1 day
        staticCacheMaxAge: 31536000, // 1 year
        etag: true,
        lastModified: true,
      },

      database: {
        type: "memory", // In production, use 'postgresql', 'mysql', etc.
        connectionTimeout: 10000,
        queryTimeout: 30000,
        maxConnections: 10,
      },

      redis: {
        enabled: false,
        host: "localhost",
        port: 6379,
        password: null,
        db: 0,
        keyPrefix: "task-manager:",
        connectTimeout: 10000,
      },

      email: {
        enabled: false,
        provider: "smtp",
        from: "noreply@taskmanager.com",
      },

      storage: {
        type: "local",
        maxFileSize: "10mb",
        allowedTypes: ["image/jpeg", "image/png", "image/gif", "application/pdf"],
      },

      features: {
        registration: true,
        emailVerification: false,
        passwordReset: true,
        fileUpload: false,
        notifications: false,
        analytics: false,
      },
    };
  }

  /**
   * Get environment-specific configuration
   */
  getEnvironmentConfiguration() {
    const configurations = {
      development: this.getDevelopmentConfig(),
      test: this.getTestConfig(),
      staging: this.getStagingConfig(),
      production: this.getProductionConfig(),
    };

    return configurations[this.environment] || {};
  }

  /**
   * Development environment configuration
   */
  getDevelopmentConfig() {
    return {
      server: {
        port: 3000,
      },

      security: {
        corsOrigins: ["http://localhost:3000", "http://localhost:8080", "http://127.0.0.1:3000"],
        rateLimitMax: 1000, // More lenient for development
        sessionSecret: "dev-session-secret-change-in-production",
        jwtSecret: "dev-jwt-secret-change-in-production",
      },

      logging: {
        level: "debug",
        format: "dev",
        enableConsole: true,
        enableFile: false,
      },

      performance: {
        cacheMaxAge: 0, // No caching in development
        compressionEnabled: false,
      },

      database: {
        type: "memory",
        logging: true,
      },

      features: {
        registration: true,
        emailVerification: false,
        analytics: false,
      },

      // Development-specific settings
      hotReload: true,
      debugMode: true,
      mockExternalServices: true,
    };
  }

  /**
   * Test environment configuration
   */
  getTestConfig() {
    return {
      server: {
        port: 0, // Random port for testing
      },

      security: {
        corsOrigins: ["http://localhost"],
        rateLimitMax: 10000, // No rate limiting in tests
        sessionSecret: "test-session-secret",
        jwtSecret: "test-jwt-secret",
        bcryptRounds: 4, // Faster hashing for tests
      },

      logging: {
        level: "error", // Minimal logging during tests
        enableConsole: false,
        enableFile: false,
      },

      performance: {
        compressionEnabled: false,
        cacheMaxAge: 0,
      },

      database: {
        type: "memory",
        logging: false,
      },

      monitoring: {
        enabled: false,
      },

      features: {
        registration: true,
        emailVerification: false,
        analytics: false,
      },

      // Test-specific settings
      testTimeout: 30000,
      mockExternalServices: true,
      seedTestData: true,
    };
  }

  /**
   * Staging environment configuration
   */
  getStagingConfig() {
    return {
      security: {
        corsOrigins: this.getEnvArray("CORS_ORIGINS", ["https://staging.taskmanager.com"]),
        sessionSecret: process.env.SESSION_SECRET || this.generateSecureSecret(),
        jwtSecret: process.env.JWT_SECRET || this.generateSecureSecret(),
        rateLimitMax: 200, // Moderate rate limiting
      },

      logging: {
        level: "info",
        format: "combined",
        enableFile: true,
      },

      performance: {
        compressionEnabled: true,
        cacheMaxAge: 3600, // 1 hour
      },

      database: {
        type: process.env.DATABASE_TYPE || "postgresql",
        url: process.env.DATABASE_URL,
        ssl: process.env.DATABASE_SSL === "true",
        logging: false,
      },

      redis: {
        enabled: process.env.REDIS_URL ? true : false,
        url: process.env.REDIS_URL,
      },

      email: {
        enabled: true,
        provider: process.env.EMAIL_PROVIDER || "smtp",
        apiKey: process.env.EMAIL_API_KEY,
        from: process.env.EMAIL_FROM || "staging@taskmanager.com",
      },

      monitoring: {
        enabled: true,
        alerting: false, // No alerting in staging
      },

      features: {
        registration: true,
        emailVerification: true,
        analytics: true,
      },

      // Staging-specific settings
      debugHeaders: true,
      performanceLogging: true,
    };
  }

  /**
   * Production environment configuration
   */
  getProductionConfig() {
    return {
      security: {
        corsOrigins: this.getEnvArray("CORS_ORIGINS", ["https://taskmanager.com"]),
        sessionSecret: this.requireEnv("SESSION_SECRET"),
        jwtSecret: this.requireEnv("JWT_SECRET"),
        rateLimitMax: 50, // Strict rate limiting
        trustedProxies: parseInt(process.env.TRUSTED_PROXIES) || 1,
      },

      logging: {
        level: process.env.LOG_LEVEL || "warn",
        format: "combined",
        enableFile: true,
        enableConsole: process.env.ENABLE_CONSOLE_LOGGING === "true",
      },

      performance: {
        compressionEnabled: true,
        compressionLevel: 9, // Maximum compression
        cacheMaxAge: 86400, // 1 day
      },

      database: {
        type: process.env.DATABASE_TYPE || "postgresql",
        url: this.requireEnv("DATABASE_URL"),
        ssl: process.env.DATABASE_SSL !== "false",
        maxConnections: parseInt(process.env.DB_MAX_CONNECTIONS) || 20,
        logging: false,
      },

      redis: {
        enabled: process.env.REDIS_URL ? true : false,
        url: process.env.REDIS_URL,
        password: process.env.REDIS_PASSWORD,
        tls: process.env.REDIS_TLS === "true",
      },

      email: {
        enabled: true,
        provider: process.env.EMAIL_PROVIDER || "sendgrid",
        apiKey: this.requireEnv("EMAIL_API_KEY"),
        from: process.env.EMAIL_FROM || "noreply@taskmanager.com",
      },

      storage: {
        type: process.env.STORAGE_TYPE || "s3",
        bucket: process.env.S3_BUCKET,
        region: process.env.AWS_REGION || "us-east-1",
      },

      monitoring: {
        enabled: true,
        alerting: true,
        metricsEndpoint: process.env.METRICS_ENDPOINT,
        alertWebhook: process.env.ALERT_WEBHOOK_URL,
      },

      features: {
        registration: process.env.ENABLE_REGISTRATION !== "false",
        emailVerification: true,
        analytics: true,
        notifications: true,
      },

      // Production-specific settings
      gracefulShutdownTimeout: 30000,
      healthCheckTimeout: 5000,
      enableMetrics: true,
      enableTracing: process.env.ENABLE_TRACING === "true",
    };
  }

  /**
   * Merge configurations with deep merge
   */
  mergeConfigurations(base, override) {
    const result = { ...base };

    for (const key in override) {
      if (override[key] && typeof override[key] === "object" && !Array.isArray(override[key])) {
        result[key] = this.mergeConfigurations(base[key] || {}, override[key]);
      } else {
        result[key] = override[key];
      }
    }

    return result;
  }

  /**
   * Get environment variable as array
   */
  getEnvArray(envVar, defaultValue = []) {
    const value = process.env[envVar];
    if (!value) return defaultValue;

    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  /**
   * Require environment variable (throw if missing in production)
   */
  requireEnv(envVar) {
    const value = process.env[envVar];
    if (!value && process.env.NODE_ENV === "production") {
      throw new Error(`Required environment variable ${envVar} is not set`);
    }
    return value || "not-set";
  }

  /**
   * Generate secure secret
   */
  generateSecureSecret(length = 64) {
    return crypto.randomBytes(length).toString("hex");
  }

  /**
   * Validate configuration
   */
  validateConfiguration() {
    const errors = [];

    // Validate required fields for production
    if (this.environment === "production") {
      if (!this.config.security.sessionSecret || this.config.security.sessionSecret.includes("dev-")) {
        errors.push("Production requires a secure SESSION_SECRET");
      }

      if (!this.config.security.jwtSecret || this.config.security.jwtSecret.includes("dev-")) {
        errors.push("Production requires a secure JWT_SECRET");
      }

      if (this.config.security.corsOrigins.length === 0) {
        errors.push("Production requires CORS_ORIGINS to be configured");
      }
    }

    // Validate port range
    const port = this.config.server.port;
    if (port && (port < 1 || port > 65535)) {
      errors.push(`Invalid port number: ${port}`);
    }

    // Validate database configuration
    if (this.config.database.type !== "memory" && !this.config.database.url) {
      errors.push("Database URL is required for non-memory databases");
    }

    // Validate email configuration
    if (this.config.email.enabled && !this.config.email.apiKey && this.environment === "production") {
      errors.push("Email API key is required when email is enabled in production");
    }

    if (errors.length > 0) {
      throw new Error("Configuration validation failed:\n" + errors.join("\n"));
    }
  }

  /**
   * Get configuration value by path
   */
  get(path) {
    return path.split(".").reduce((obj, key) => obj?.[key], this.config);
  }

  /**
   * Set configuration value by path
   */
  set(path, value) {
    const keys = path.split(".");
    const lastKey = keys.pop();
    const target = keys.reduce((obj, key) => {
      if (!obj[key]) obj[key] = {};
      return obj[key];
    }, this.config);

    target[lastKey] = value;
  }

  /**
   * Check if feature is enabled
   */
  isFeatureEnabled(feature) {
    return this.get(`features.${feature}`) === true;
  }

  /**
   * Get all configuration
   */
  getAll() {
    return { ...this.config };
  }

  /**
   * Get configuration summary (safe for logging)
   */
  getSummary() {
    const summary = { ...this.config };

    // Remove sensitive information
    if (summary.security) {
      delete summary.security.sessionSecret;
      delete summary.security.jwtSecret;
    }

    if (summary.database) {
      delete summary.database.url;
      delete summary.database.password;
    }

    if (summary.redis) {
      delete summary.redis.password;
      delete summary.redis.url;
    }

    if (summary.email) {
      delete summary.email.apiKey;
    }

    return summary;
  }

  /**
   * Load configuration from file
   */
  static loadFromFile(filePath) {
    try {
      const configFile = path.resolve(filePath);
      if (fs.existsSync(configFile)) {
        const fileConfig = require(configFile);
        return new EnvironmentConfig(fileConfig.environment);
      }
    } catch (error) {
      console.warn(`Failed to load configuration from ${filePath}:`, error.message);
    }

    return new EnvironmentConfig();
  }

  /**
   * Save configuration to file
   */
  saveToFile(filePath) {
    try {
      const configToSave = {
        environment: this.environment,
        timestamp: new Date().toISOString(),
        config: this.getSummary(),
      };

      fs.writeFileSync(filePath, JSON.stringify(configToSave, null, 2));
      return true;
    } catch (error) {
      console.error(`Failed to save configuration to ${filePath}:`, error.message);
      return false;
    }
  }

  /**
   * Create environment-specific .env file
   */
  generateEnvFile(targetEnvironment = null) {
    const env = targetEnvironment || this.environment;
    const envVars = [];

    envVars.push(`# Environment Configuration for ${env}`);
    envVars.push(`# Generated on ${new Date().toISOString()}`);
    envVars.push("");

    envVars.push("# Application");
    envVars.push(`NODE_ENV=${env}`);
    envVars.push(`PORT=${this.config.server.port}`);
    envVars.push("");

    envVars.push("# Security");
    envVars.push("SESSION_SECRET=your-secure-session-secret-here");
    envVars.push("JWT_SECRET=your-secure-jwt-secret-here");
    envVars.push(`CORS_ORIGINS=${this.config.security.corsOrigins.join(",")}`);
    envVars.push("");

    if (env !== "development") {
      envVars.push("# Database");
      envVars.push("DATABASE_URL=your-database-url-here");
      envVars.push("DATABASE_SSL=true");
      envVars.push("");

      envVars.push("# Redis (optional)");
      envVars.push("REDIS_URL=your-redis-url-here");
      envVars.push("");

      envVars.push("# Email");
      envVars.push("EMAIL_PROVIDER=sendgrid");
      envVars.push("EMAIL_API_KEY=your-email-api-key-here");
      envVars.push("EMAIL_FROM=noreply@yourdomain.com");
      envVars.push("");
    }

    if (env === "production") {
      envVars.push("# Monitoring");
      envVars.push("METRICS_ENDPOINT=your-metrics-endpoint");
      envVars.push("ALERT_WEBHOOK_URL=your-alert-webhook-url");
      envVars.push("");

      envVars.push("# Storage");
      envVars.push("STORAGE_TYPE=s3");
      envVars.push("S3_BUCKET=your-s3-bucket");
      envVars.push("AWS_REGION=us-east-1");
      envVars.push("");
    }

    return envVars.join("\n");
  }
}

module.exports = EnvironmentConfig;
