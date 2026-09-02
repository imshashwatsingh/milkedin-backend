---
name: routes-controllers
description: Documents the Express route patterns, controller conventions, and module structure in milk_logs_backend.
---

# Routes & Controllers Skill

Use when working with Express routes, controller logic, or adding new API endpoints. This skill covers the route registration pattern, controller conventions, and the four-layer architecture flow.

## When to Use

- Adding new API endpoints
- Understanding route structure and organization
- Debugging route handling issues
- Refactoring existing routes

## Route Registration Pattern

Each module registers its routes in its `*.routes.js` file, which are then mounted in `src/app.js`:

```js
// Example: auth.routes.js
import express from "express";
import authenticate from "../middleware/auth.middleware.js";
import { register, login } from "../controller/auth.controller.js";

const router = express.Router();

// Public routes
router.post("/register", register);
router.post("/login", login);

// Protected routes
router.post("/logout", authenticate, logout);
router.get("/me", authenticate, getMe);

export default router;
```

### Mounting in app.js

Routes are mounted with a base path prefix:

```js
// src/app.js
import authRoutes from "./modules/auth/auth.routes.js";
app.use("/api/auth", authRoutes);

import categoryRoutes from "./modules/categories/category.routes.js";
app.use("/api/categories", categoryRoutes);

import recordsRoutes from "./modules/records/records.routes.js";
app.use("/api/logs", recordsRoutes);
```

## Controller Conventions

Controllers follow a consistent pattern: parse request data, delegate to service, shape response with `ApiResponse`.

### Controller Structure (`*.controller.js`)

```js
import ApiResponse from "../../common/utils/api-response.js";
import ApiError from "../../common/utils/api-error.js";
import SomeService from "../some.service.js";

class SomeController {
  async getSomeData(req, res, next) {
    try {
      const result = await SomeService.getData(req.params.id, req.user);
      ApiResponse.ok(res, "Success", result);
    } catch (err) {
      next(err); // Pass to global error handler
    }
  }
}

export const someController = new SomeController();
// Or export functions directly:
export async function someFunction(req, res, next) { ... }
```

### Common Patterns

1. **Successful response**: `ApiResponse.ok(res, "message", data)` → 200
2. **Created response**: `ApiResponse.created(res, "message", data)` → 201
3. **Error delegation**: `next(err)` for ApiError or unexpected errors
4. **Authentication**: `authenticate` middleware attached where needed

### Example: Records Controller

```js
// records.controller.js
import AddRecordDto from "../dto/AddRecord.dto.js";
import recordsService from "../records.service.js";
import ApiResponse from "../../common/utils/api-response.js";
import ApiError from "../../common/utils/api-error.js";

export async function addRecord(req, res, next) {
  // 1. Validate DTO
  const { errors, value } = AddRecordDto.validate(req.body);
  if (errors) {
    throw ApiError.badRequest(errors.join(", "));
  }

  // 2. Call service
  const record = await recordsService.addRecord(value, req.user.id);

  // 3. Return response
  ApiResponse.created(res, "Record added successfully", record);
}
```

## Four-Layer Request Flow

```
1. Route: Router matches path + runs authenticate + validate(Dto)
2. Controller: Parses req, calls service, shapes response
3. Service: Business logic, parameterized SQL queries
4. Database: pg pool executes queries, returns results
```

### Middleware Attachment Order

In routes, middleware is applied in this order:

```js
router.post(
  "/",          // route path
  authenticate, // auth middleware (optional)
  validate(AddRecordDto), // validation middleware
  addRecord     // controller handler
);
```

However, the project uses a different pattern where validation happens inside the controller using `BaseDto.validate()`. Routes typically have minimal middleware (just `authenticate`).

## DTO Validation in Routes (Alternative Pattern)

Some modules validate in the controller rather than using Express middleware:

```js
// In controller:
const { errors, value } = AddRecordDto.validate(req.body);
if (errors) throw ApiError.badRequest(errors.join(", "));
// Proceed with validated 'value'
```

This keeps the Express layer thin and puts validation logic in the controller where the service call follows.

## Module-Specific Routes

### Auth Routes (`/api/auth`)
- POST `/register` - no auth
- POST `/login` - no auth
- POST `/logout` - ✅ auth
- POST `/forgot-password` - no auth
- POST `/reset-password` - no auth
- POST `/refresh-token` - no auth
- GET `/me` - ✅ auth
- PUT `/profile` - ✅ auth

### Categories Routes (`/api/categories`)
- POST `/` - ✅ auth (create)
- GET `/` - ✅ auth (list)
- PUT `/:id` - ✅ auth (update)
- DELETE `/:id` - ✅ auth (soft-delete)

### Records/Logs Routes (`/api/logs`)
- POST `/` - ✅ auth (add entry)
- GET `/` - ✅ auth (list with filters)
- GET `/date` - ✅ auth (date-specific)
- GET `/summary/daily` - ✅ auth (daily summary)
- GET `/summary/monthly` - ✅ auth (monthly summary)
- GET `/export` - ✅ auth (PDF/Excel)
- PUT `/:id` - ✅ auth (update)
- DELETE `/:id` - ✅ auth (delete)