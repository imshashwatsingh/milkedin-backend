import express from "express";
import cors from "cors";

const app = express();

// Mount Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS configuration - allow frontend origin with credentials
const allowedOrigins = [
  "http://localhost:8081",
  "http://127.0.0.1:8081",
  "https://milkedin-frontend.vercel.app",
];

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));

// Express 5-compatible wildcard
app.options('/{*splat}', cors(corsOptions));

app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
});

// Logging Middleware
import loggingMiddleware from "./common/middleware/logging.middleware.js";
app.use(loggingMiddleware);

// Mount Routes
import authRoutes from "./modules/auth/auth.routes.js";
app.use("/api/auth", authRoutes);

import categoryRoutes from "./modules/categories/category.routes.js";
app.use("/api/categories", categoryRoutes);

import recordsRoutes from "./modules/records/records.routes.js";
app.use("/api/logs", recordsRoutes);

// Global Error Handler (Express 5)
import ApiError from "./common/utils/api-error.js";
app.use((err, req, res, next) => {
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
    });
  }
  console.error("Unhandled error:", err);
  return res.status(500).json({
    success: false,
    message: "Internal server error",
  });
});

export default app;