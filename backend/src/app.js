const cors = require("cors");
const express = require("express");
const helmet = require("helmet");
const { rateLimit } = require("express-rate-limit");
const routes = require("./routes");
const errorHandler = require("./middleware/errorHandler");
const requestLogger = require("./middleware/requestLogger");
const openapi = require("./docs/openapi");
const env = require("./config/env");
const { tenantContext } = require("./middleware/tenantContext");

BigInt.prototype.toJSON = function () {
  return this.toString();
};

const app = express();
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      ...helmet.contentSecurityPolicy.getDefaultDirectives(),
      "script-src": ["'self'", "https://unpkg.com"],
      "style-src": ["'self'", "'unsafe-inline'", "https://unpkg.com"],
      "img-src": ["'self'", "data:"],
    },
  },
}));
app.use(cors({
  origin(origin, callback) {
    if (!origin || env.app.corsOrigins.includes(origin.replace(/\/$/, ""))) return callback(null, true);
    const error = new Error("Origin is not allowed by CORS");
    error.status = 403;
    error.code = "CORS_ORIGIN_DENIED";
    return callback(error);
  },
  credentials: true,
}));

app.use(express.json({ limit: env.app.bodyLimit }));
app.use(express.urlencoded({ extended: true, limit: env.app.bodyLimit }));

app.set("trust proxy", 1);

// Generated OpenAPI document and interactive Swagger UI. The UI loads its
// browser bundle from Swagger's official CDN; the API document itself is
// always served locally from the current route catalogue.
app.get("/api-docs/swagger.json", (_req, res) => res.json(openapi));
app.get("/api-docs", (_req, res) => {
  res.type("html").send(`<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>ROOST API Docs</title><link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css"></head>
<body><div id="swagger-ui"></div><script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
<script>window.ui = SwaggerUIBundle({url:'/api-docs/swagger.json',dom_id:'#swagger-ui',persistAuthorization:true});</script></body></html>`);
});

app.use(requestLogger);
app.use("/api/v1", tenantContext);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { success: false, code: "RATE_LIMITED", message: "Too many authentication attempts. Please try again later." },
});
app.use(["/api/v1/auth/login", "/api/v1/auth/admin/login", "/api/v1/auth/register", "/api/v1/auth/forgot-password"], authLimiter);

// Service information. These routes make it easy to confirm that the server is
// reachable without needing to know a feature-specific API endpoint.
app.get("/", (_req, res) => {
  res.json({
    success: true,
    message: "ROOST API is running",
    health: "/api/v1/health",
    basePath: "/api/v1"
  });
});

app.get("/api/v1", (_req, res) => {
  res.json({
    success: true,
    message: "ROOST API is running",
    health: "/api/v1/health"
  });
});

// Health
app.get("/api/v1/health", (_req, res) => {
  res.json({
    success: true,
    status: "ok",
    ts: new Date().toISOString()
  });
});

// API
app.use("/api/v1", routes);

// 404
app.use((_req, res) => {
  res.status(404).json({
    success: false,
    code: "NOT_FOUND",
    message: "Route not found"
  });
});

// Error handler
app.use(errorHandler);

module.exports = app;
