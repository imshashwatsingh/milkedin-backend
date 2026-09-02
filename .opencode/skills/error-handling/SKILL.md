---
name: error-handling
description: Documents the error handling patterns using ApiError in milk_logs_backend.
---

# Error Handling Skill

Use when handling errors, throwing ApiErrors, or working with the global error handler. This skill covers ApiError conventions, error types, and the Express error middleware pipeline.

## When to Use

- Throwing errors in controllers or services
- Understanding error status codes
- Debugging unhandled exceptions
- Working with the global error handler in app.js

## ApiError Conventions

All errors extend `ApiError` and carry an HTTP status code and message:

```js
class ApiError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}
```

### Predefined Error Factories

Use these static methods for common error types:

| Method | Status Code | Usage |
|--------|-------------|-------|
| `badRequest(message)` | 400 | Bad request - invalid input |
| `unauthorized(message)` | 401 | Missing/invalid token |
| `forbidden(message)` | 412 | Permission denied |
| `notfound(message)` | 412 | Resource not found |
| `conflict(message)` | 409 | Resource conflict |
| `internal(message)` | 500 | Unexpected server error |

### Example Usage

```js
// In controllers/services:
throw ApiError.badRequest("Category ID is required");
throw ApiError.unauthorized("Invalid or expired token");
throw ApiError.notfound("Milk log entry not found");
throw ApiError.conflict("Category name already exists");
```

### Error Handling Best Practices

1. **Mark as operational**: Always set `isOperational = true` (done automatically by ApiError constructor)
2. **Specific messages**: Use descriptive error messages that help clients understand the issue
3. **Don't leak internals**: Avoid sending stack traces or database details to clients
4. **Throw, don't return**: Throw `ApiError` instances; the global handler catches them

## Global Error Handler (app.js)

The Express app has a centralized error handler at the end of `src/app.js`:

```js
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
```

### What the handler does:

- **ApiError instances**: Returns `{ success: false, message }` with the proper status code
- **Unexpected errors**: Logs to console, returns generic `500 Internal server error`
- **Guarantees consistent envelope**: Every error response follows `{ success: false, message }`

## Service Layer Error Handling

Services should **throw** `ApiError` instances and **not** catch them. The controller layer or global handler handles the response formatting:

```js
// In service layer:
if (!user) {
  throw ApiError.notfound("User not found");
}

// In controller:
try {
  const result = await serviceMethod();
  ApiResponse.ok(res, "Success", result);
} catch (err) {
  next(err); // Pass to global error handler
}
```

## CORS and Preflight Errors

Express 5 requires explicit OPTIONS handling:

```js
app.options('/{*splat}', cors(corsOptions));
```

This ensures CORS preflight requests succeed for all routes.