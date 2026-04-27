import express from "express";

const app = express();

// Mount Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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


export default app;