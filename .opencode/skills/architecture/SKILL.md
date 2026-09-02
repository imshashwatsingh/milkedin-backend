---
name: architecture
description: Provides overview of the milk_logs_backend four-layer modular architecture (Route → Middleware → Controller → Service → Database) and feature module structure.
---

# Architecture Skill

Use when understanding or working with the milk_logs_backend modular architecture. This skill covers the four-layer pattern, module structure, and cross-cutting concerns.

## When to Use

- Understanding how requests flow through the system
- Adding new features following existing patterns
- Debugging request lifecycle issues
- Refactoring module boundaries

## Architecture Overview

The application uses a **four-layer pattern** per feature module:

```
Route → Middleware (auth + validate) → Controller → Service → Database (pg)
```

### Feature Module Structure

Each module (e.g., `auth`, `categories`, `records`) lives under `src/modules/` and follows this layout:

```
module/
├── module.routes.js      # Express routes + middleware attachment
├── module.controller.js  # Request parsing, service delegation, ApiResponse
├── module.service.js     # Business logic, database queries (no req/res)
├── dto/                # Joi validation schemas (extend BaseDto)
├── module.model.js     # SQL table schema documentation
└── module.middleware.js # Custom middleware (if needed)
```

### Cross-Cutting Concerns (`src/common/`)

- **`config/db.js`** — shared `pg.Pool` with auto SSL in production
- **`middleware/validate.middleware.js`** — Joi validation using DTOs
- **`middleware/logging.middleware.js`** — request/response logging
- **`utils/api-error.js`** — `ApiError` with HTTP status factories
- **`utils/api-response.js`** — `ApiResponse.ok()` / `ApiResponse.created()`
- **`utils/jwt.utils.js`** — JWT sign/verify for access/refresh tokens
- **`utils/email.js`** — Nodemailer singleton service
- **`dto/base.dto.js`** — base class with `static validate(data)` method

### Request Lifecycle

1. `app.js` applies global middleware: JSON parsing, CORS, request logging
2. Router matches path and runs `authenticate` (where required) + `validate(Dto)`
3. Controller calls service, which executes parameterized SQL against the pool
4. Centralized error handler converts thrown `ApiError` instances to consistent JSON

### Key Conventions

- **DTOs** extend `BaseDto` and override static `schema` (Joi); `validate()` collects all errors (`abortEarly: false`) and strips unknown keys (`stripUnknown: true`)
- **Error handling**: `ApiError` instances carry `statusCode` and `isOperational`; global handler returns `{ success: false, message }`
- **Responses**: Use `ApiResponse.ok(res)` or `ApiResponse.created(res)` for successful responses
- **Authentication**: Dual-token strategy (short-lived access token + longer-lived refresh token); `authenticate()` middleware decodes attachment to `req.user`
- **Database queries**: All queries filter by `user_id` for per-user data scoping
- **CORS**: Allow-list origins + `.vercel.app` wildcard for preview deployments