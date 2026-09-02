---
name: auth-flow
description: Documents the JWT authentication flow and middleware patterns in milk_logs_backend.
---

# Authentication Flow Skill

Use when working with authentication, authorization, or JWT token handling. This skill covers the dual-token strategy, authenticate middleware, and routes requiring protection.

## When to Use

- Implementing or modifying authentication routes
- Understanding token validation
- Working with protected endpoints
- Debugging authentication issues

## Dual-Token Strategy

The API uses two types of JWT tokens:

| Token | Secret | Lifetime | Purpose |
|-------|--------|----------|---------|
| **Access token** | `JWT_ACCESS_SECRET` | 15 minutes (default) | Sent as Bearer token, verified on every protected request |
| **Refresh token** | `JWT_REFRESH_SECRET` | 7 days (default) | Exchanged for new access token without re-entering credentials |

### Token Storage

- Refresh token: **Hashed** and stored on the `users` table (`refresh_token` column)
- Access token: **Stateless** - just signed JWT, verified on each request

## Authentication Middleware (`auth.middleware.js`)

The `authenticate()` middleware performs these steps:

1. Extracts `Authorization: Bearer <token>` header
2. Verifies the access token using `jwt.utils.verifyAccessToken`
3. Reloads the user from database (checks for disabled/deleted accounts)
4. Attaches `req.user` with user data for downstream handlers

### Protected vs Public Routes

- **Public** (`auth.*` routes): No auth required - register, login, forgot/reset password
- **Protected** (`/api/*` other than auth): All require `authenticate()` middleware

### Example Protected Route Pattern

```js
// auth.routes.js
import authenticate from "../middleware/auth.middleware.js";

router.get("/me", authenticate, async (req, res) => {
  // req.user is available here
  ApiResponse.ok(res, "User data", req.user);
});
```

## Refresh Token Flow

1. Client presents refresh token to `POST /api/auth/refresh-token`
2. Middleware verifies token and checks it matches the stored hash
3. Service generates new access token
4. New access token returned to client

## CORS and Authentication

- CORS is configured in `src/app.js` with allow-listed origins
- Credentials (`cookies`, `authorization` headers) are sent with `credentials: true`
- Preflight OPTIONS requests are handled: `app.options('/{*splat}', cors(corsOptions))`

## User Roles

- Default role: `'user'`
- Middleware can check `req.user.role` for role-based access control
- Currently no role-based route protection beyond authentication, but pattern is established