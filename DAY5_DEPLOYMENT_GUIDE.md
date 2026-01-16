# Day 5: Deployment & Production Setup Guide

## Overview

This guide walks you through deploying the Task Management System to production with proper security, monitoring, and best practices.

## Prerequisites

- ✅ Completed Days 1-4
- ✅ Node.js installed
- ✅ Git configured
- ✅ npm packages installed (`npm install`)
- ✅ GitHub account
- Optional: Netlify/Vercel/Heroku accounts

## Part 1: Production Environment Setup

### 1.1 Update Environment Configuration

Create `.env.production` file:

```bash
# Server Configuration
NODE_ENV=production
PORT=3000
HOST=0.0.0.0

# Security
SESSION_SECRET=your-secure-random-secret-here
CORS_ORIGINS=https://yourdomain.com,https://www.yourdomain.com

# Database
DATABASE_URL=your-production-db-url

# Logging
LOG_LEVEL=info

# Monitoring
ENABLE_MONITORING=true
ENABLE_METRICS=true

# Third-party Services (if any)
API_KEY=your-api-key
WEBHOOK_SECRET=your-webhook-secret
```

### 1.2 Verify Configuration

Run configuration validation:

```bash
# Check if all required env variables are set
node -c "
const config = require('./production-config-day5');
console.log('✅ Production configuration loaded successfully');
"
```

### 1.3 Environment Variables Setup

Set secure environment variables on your server:

```bash
# For local testing
cp .env.production .env.production.local
# Edit with your actual values
```

**Important:** Never commit `.env.production.local` to git!

## Part 2: Security Hardening

### 2.1 Install Security Dependencies

```bash
npm install helmet express-rate-limit cors
```

### 2.2 Security Middleware Implementation

Update `server.js` to use security middleware:

```javascript
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const cors = require("cors");

// Security headers
app.use(helmet());

// CORS configuration
app.use(
  cors({
    origin: process.env.CORS_ORIGINS?.split(",") || ["http://localhost:3000"],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: "Too many requests from this IP, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(limiter);

// Apply stricter rate limiting to login endpoint
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5, // 5 attempts per 15 minutes
  skipSuccessfulRequests: true,
});

app.post("/api/login", loginLimiter, (req, res) => {
  // Login logic
});
```

### 2.3 Input Validation

Implement input sanitization:

```javascript
const sanitizeHtml = require("sanitize-html");

// Sanitize user input
function sanitizeInput(input) {
  return sanitizeHtml(input, {
    allowedTags: [],
    allowedAttributes: {},
  });
}

// Use in route handlers
app.post("/api/tasks", (req, res) => {
  const sanitizedTitle = sanitizeInput(req.body.title);
  // Process sanitized input
});
```

### 2.4 HTTPS Configuration

For production deployment, enable HTTPS:

```javascript
const https = require("https");
const fs = require("fs");

// Load SSL certificates (provided by hosting platform)
const privateKey = fs.readFileSync(process.env.SSL_KEY_PATH, "utf8");
const certificate = fs.readFileSync(process.env.SSL_CERT_PATH, "utf8");
const credentials = { key: privateKey, cert: certificate };

// Create HTTPS server in production
if (process.env.NODE_ENV === "production") {
  https.createServer(credentials, app).listen(443);
} else {
  app.listen(3000);
}
```

## Part 3: Monitoring & Logging

### 3.1 Setup Logging

Create `monitoring-setup.js`:

```javascript
const fs = require("fs");
const path = require("path");

class Logger {
  constructor(options = {}) {
    this.level = options.level || "info";
    this.logDir = path.join(__dirname, "logs");
    this.ensureLogDirectory();
  }

  ensureLogDirectory() {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  log(level, message, data = {}) {
    const timestamp = new Date().toISOString();
    const logEntry = JSON.stringify({
      timestamp,
      level,
      message,
      ...data,
    });

    console.log(logEntry);

    // Write to file for production
    if (process.env.NODE_ENV === "production") {
      const logFile = path.join(this.logDir, `${level}.log`);
      fs.appendFileSync(logFile, logEntry + "\n");
    }
  }

  info(message, data) {
    this.log("info", message, data);
  }
  warn(message, data) {
    this.log("warn", message, data);
  }
  error(message, data) {
    this.log("error", message, data);
  }
  debug(message, data) {
    this.log("debug", message, data);
  }

  middleware() {
    return (req, res, next) => {
      const start = Date.now();
      res.on("finish", () => {
        const duration = Date.now() - start;
        this.info("HTTP Request", {
          method: req.method,
          path: req.path,
          status: res.statusCode,
          duration: `${duration}ms`,
        });
      });
      next();
    };
  }
}

module.exports = Logger;
```

### 3.2 Health Check Endpoint

Add health check endpoint:

```javascript
app.get("/health", (req, res) => {
  const health = {
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    status: "OK",
    checks: {
      memory: process.memoryUsage(),
      uptime: process.uptime(),
    },
  };

  res.status(200).json(health);
});

// Readiness check for load balancers
app.get("/ready", (req, res) => {
  // Check if all services are ready
  const isReady = true; // Add your checks here

  if (isReady) {
    res.status(200).json({ ready: true });
  } else {
    res.status(503).json({ ready: false });
  }
});
```

### 3.3 Performance Monitoring

Add basic performance monitoring:

```javascript
const compression = require("compression");

// Enable compression
app.use(compression());

// Request timing middleware
app.use((req, res, next) => {
  res.locals.startTime = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - res.locals.startTime;
    if (duration > 1000) {
      // Log slow requests
      logger.warn("Slow request detected", {
        method: req.method,
        path: req.path,
        duration: `${duration}ms`,
      });
    }
  });
  next();
});
```

## Part 4: Testing for Production

### 4.1 Security Testing

```bash
# Run security audit
npm audit

# Check dependencies for vulnerabilities
npm list

# Test security headers
curl -I https://yourdomain.com/
```

### 4.2 Load Testing

Create simple load test script:

```javascript
// load-test.js
const http = require("http");

function loadTest(url, requests = 100) {
  let completed = 0;
  let errors = 0;

  for (let i = 0; i < requests; i++) {
    http
      .get(url, (res) => {
        completed++;
        console.log(`Request ${completed}: ${res.statusCode}`);
      })
      .on("error", (err) => {
        errors++;
        console.error("Error:", err.message);
      });
  }

  console.log(`Test complete. Completed: ${completed}, Errors: ${errors}`);
}

loadTest("http://localhost:3000/health", 100);
```

## Part 5: Deployment Checklist

Before deploying, verify:

### Pre-Deployment

- [ ] All tests pass: `npm test`
- [ ] No console errors: `npm start`
- [ ] Security audit clean: `npm audit`
- [ ] Environment variables set
- [ ] Database backed up
- [ ] SSL certificate ready

### Deployment

- [ ] Push latest code to GitHub: `git push origin main`
- [ ] Build succeeds without errors
- [ ] Environment variables configured on platform
- [ ] Application starts successfully
- [ ] Health check endpoint working

### Post-Deployment

- [ ] Application accessible at domain
- [ ] HTTPS working correctly
- [ ] Database connections working
- [ ] Monitoring/logging active
- [ ] All features functional
- [ ] Performance acceptable

## Part 6: Common Issues & Solutions

### Issue: "Cannot find module" error

**Solution:**

```bash
# Install dependencies
npm install

# Check node_modules
ls -la node_modules/
```

### Issue: Environment variables not loaded

**Solution:**

```bash
# Verify env variables are set
printenv NODE_ENV
printenv DATABASE_URL

# Set manually if needed
export NODE_ENV=production
export DATABASE_URL=your_database_url
```

### Issue: Port already in use

**Solution:**

```bash
# Kill process using port
lsof -i :3000
kill -9 <PID>

# Or use different port
PORT=8000 npm start
```

### Issue: CORS errors in production

**Solution:**
Update `CORS_ORIGINS` environment variable to include your domain:

```bash
CORS_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
```

## Part 7: Monitoring Setup

### 7.1 Check Application Health

```bash
# Test health endpoint
curl https://yourdomain.com/health

# Check logs
tail -f logs/info.log
tail -f logs/error.log
```

### 7.2 Set Up Alerts

Configure alerts for:

- [ ] High error rate (>1% of requests)
- [ ] Slow response times (>3s average)
- [ ] High memory usage (>80%)
- [ ] Uptime < 99%

### 7.3 Create Monitoring Dashboard

View real-time metrics:

- Request rate
- Error rate
- Response times
- Server resources
- User activities

## Part 8: Maintenance

### Regular Tasks

**Daily:**

- Monitor error logs
- Check application performance
- Review security logs

**Weekly:**

- Run npm audit
- Review performance metrics
- Check server resources

**Monthly:**

- Update dependencies
- Security review
- Backup verification
- Performance optimization

## Next Steps

1. ✅ Set up production configuration
2. ✅ Implement security measures
3. ✅ Add monitoring and logging
4. ✅ Test thoroughly
5. ✅ Deploy to production platform
6. ✅ Monitor and maintain

## Resources

- [Helmet.js Documentation](https://helmetjs.github.io/)
- [Express Rate Limiting](https://github.com/nfriedly/express-rate-limit)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/nodejs-security/)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)

---

**Ready to deploy? Let's go! 🚀**
