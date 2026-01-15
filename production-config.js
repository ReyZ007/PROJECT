/**
 * Day 5: Production Configuration
 * Configuration management for production deployment
 */

/**
 * Environment Configuration Manager
 */
class ConfigManager {
  constructor() {
    this.environment = process.env.NODE_ENV || "development";
    this.config = this.loadConfig();
  }

  loadConfig() {
    const baseConfig = {
      app: {
        name: "Task Management System",
        version: process.env.npm_package_version || "1.0.0",
        port: parseInt(process.env.PORT) || 3000,
        host: process.env.HOST || "localhost",
      },
      database: {
        type: "localStorage", // For this simple app
        maxSize: 10 * 1024 * 1024, // 10MB
        backupInterval: 24 * 60 * 60 * 1000, // 24 hours
      },
      security: {
        corsOrigins: process.env.CORS_ORIGINS?.split(",") || ["http://localhost:3000"],
        rateLimitWindow: 15 * 60 * 1000, // 15 minutes
        rateLimitMax: 100, // requests per window
        sessionSecret: process.env.SESSION_SECRET || "dev-secret-change-in-production",
        bcryptRounds: 12,
      },
      logging: {
        level: "info",
        format: "combined",
        maxFiles: 5,
        maxSize: "10m",
      },
      monitoring: {
        enabled: true,
        healthCheckPath: "/health",
        metricsPath: "/metrics",
      },
      performance: {
        compressionEnabled: true,
        cacheMaxAge: 86400, // 1 day in seconds
        staticCacheMaxAge: 31536000, // 1 year in seconds
      },
    };

    // Environment-specific overrides
    const envConfigs = {
      development: {
        logging: {
          level: "debug",
          format: "dev",
        },
        security: {
          corsOrigins: ["http://localhost:3000", "http://localhost:8080"],
          rateLimitMax: 1000, // More lenient for development
        },
        performance: {
          cacheMaxAge: 0, // No caching in development
        },
      },
      test: {
        app: {
          port: 0, // Random port for testing
        },
        logging: {
          level: "error", // Minimal logging during tests
        },
        database: {
          type: "memory",
        },
        security: {
          rateLimitMax: 10000, // No rate limiting in tests
        },
      },
      production: {
        logging: {
          level: "warn",
          format: "combined",
        },
        security: {
          corsOrigins: process.env.CORS_ORIGINS?.split(",") || [],
          rateLimitMax: 50, // Stricter rate limiting
        },
        monitoring: {
          enabled: true,
          alerting: true,
        },
      },
    };

    return this.mergeConfigs(baseConfig, envConfigs[this.environment] || {});
  }

  mergeConfigs(base, override) {
    const result = { ...base };

    for (const key in override) {
      if (typeof override[key] === "object" && !Array.isArray(override[key])) {
        result[key] = this.mergeConfigs(base[key] || {}, override[key]);
      } else {
        result[key] = override[key];
      }
    }

    return result;
  }

  get(path) {
    return path.split(".").reduce((obj, key) => obj?.[key], this.config);
  }

  set(path, value) {
    const keys = path.split(".");
    const lastKey = keys.pop();
    const target = keys.reduce((obj, key) => {
      if (!obj[key]) obj[key] = {};
      return obj[key];
    }, this.config);

    target[lastKey] = value;
  }

  isProduction() {
    return this.environment === "production";
  }

  isDevelopment() {
    return this.environment === "development";
  }

  isTest() {
    return this.environment === "test";
  }

  validate() {
    const errors = [];

    // Validate required production settings
    if (this.isProduction()) {
      if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET === "dev-secret-change-in-production") {
        errors.push("SESSION_SECRET must be set in production");
      }

      if (this.get("security.corsOrigins").length === 0) {
        errors.push("CORS_ORIGINS must be configured in production");
      }

      if (!process.env.PORT) {
        console.warn("PORT not set, using default 3000");
      }
    }

    // Validate port range
    const port = this.get("app.port");
    if (port < 1 || port > 65535) {
      errors.push(`Invalid port number: ${port}`);
    }

    // Validate rate limit settings
    const rateLimitMax = this.get("security.rateLimitMax");
    if (rateLimitMax < 1) {
      errors.push("Rate limit max must be positive");
    }

    if (errors.length > 0) {
      throw new Error("Configuration validation failed:\n" + errors.join("\n"));
    }

    return true;
  }

  getAll() {
    return { ...this.config };
  }
}

// Export configuration and server classes
module.exports = {
  ConfigManager,
};
