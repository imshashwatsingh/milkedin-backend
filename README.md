# Milk Logs — Backend API

A secure, production-ready REST API for tracking daily milk consumption and expenses. The backend powers a mobile/frontend client that lets users log milk entries (by type/category), review daily and monthly summaries, and export their records as PDF or Excel reports.

Built with **Node.js + Express 5** and **PostgreSQL**, the codebase follows a clean, modular, layered architecture with request validation, JWT-based authentication, and transactional email notifications.

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Database Schema](#database-schema)
- [API Reference](#api-reference)
  - [Auth](#auth-api)
  - [Categories](#categories-api)
  - [Milk Logs](#milk-logs-api)
  - [System](#system)
- [Authentication Flow](#authentication-flow)
- [Request Validation](#request-validation)
- [Email Service](#email-service)
- [Exporting Records](#exporting-records)
- [Error Handling](#error-handling)
- [Setup & Installation](#setup--installation)
- [Environment Variables](#environment-variables)
- [Running Locally](#running-locally)
- [Deployment](#deployment)

---

## Features

- **User authentication** — register, login, logout, refresh tokens, profile update.
- **Password recovery** — forgot/reset password via time-limited OTP emailed to the user.
- **Milk categories** — create, list, update, and soft-delete milk types with per-type pricing.
- **Milk log entries** — add, update, delete, and query milk consumption records.
- **Aggregated summaries** — daily totals and full monthly breakdowns with per-day detail.
- **PDF & Excel export** — generate downloadable reports for any date range.
- **Input validation** — every request is validated with [Joi](https://joi.dev/) DTOs.
- **Security** — `bcrypt` password hashing, JWT access + refresh tokens, CORS allow-listing.
- **Observability** — request/response logging middleware and a `/health` endpoint.

---

## Tech Stack

| Concern        | Technology                              |
| -------------- | --------------------------------------- |
| Runtime        | Node.js (ES Modules, `"type": "module"`)|
| Web framework  | Express 5                               |
| Database       | PostgreSQL (via `pg` connection pool)    |
| Auth           | `jsonwebtoken`, `bcrypt`                 |
| Validation     | `joi`                                    |
| Email          | `nodemailer` (Gmail + App Password)      |
| Reporting      | `pdfkit` (PDF), `xlsx` (Excel)           |
| Config         | `dotenv`                                 |
| CORS           | `cors`                                   |

---

## Architecture

The application is organized around **feature modules** that each follow a consistent **four-layer pattern**:

```
Route → Middleware (auth + validate) → Controller → Service → Database (pg)
```

- **Routes** (`*.routes.js`) declare endpoints and attach middleware.
- **Controllers** (`*.controller.js`) parse the request, delegate to the service, and shape the HTTP response using `ApiResponse`.
- **Services** (`*.service.js`) contain all business logic and database queries. They never touch `req`/`res`.
- **DTOs** (`dto/*.dto.js`) declare Joi validation schemas for request bodies and query strings.
- **Models** (`*.model.js`) document the underlying SQL table schema.

Cross-cutting concerns live under `src/common`:

- `common/config/db.js` — a single shared `pg.Pool` (auto-enables SSL in production).
- `common/middleware/` — `validate` (Joi), `logging`.
- `common/utils/` — `ApiError`, `ApiResponse`, `jwt`, `email`.
- `common/dto/base.dto.js` — a `BaseDto` class every DTO extends.

This separation keeps business rules testable and keeps the Express layer thin.

### Request lifecycle

1. `app.js` applies global middleware: JSON/URL-encoded parsing, CORS, request logging.
2. The router matches the path and runs `authenticate` (where required) and `validate(Dto)`.
3. The controller calls the service, which executes parameterized SQL against the pool.
4. A centralized error handler converts thrown `ApiError` instances into consistent JSON.

---

## Project Structure

```
milk_logs_backend/
├── server.js                      # Entry point: boots email + starts listener
├── package.json
├── vercel.json                    # Vercel deployment config (catch-all rewrite)
├── .env.example                   # Required environment variables
└── src/
    ├── app.js                     # Express app: middleware, routes, error handler
    ├── common/
    │   ├── config/db.js           # PostgreSQL pool
    │   ├── dto/base.dto.js         # BaseDto (Joi validation helper)
    │   ├── middleware/
    │   │   ├── logging.middleware.js
    │   │   └── validate.middleware.js
    │   └── utils/
    │       ├── api-error.js        # ApiError + HTTP error factories
    │       ├── api-response.js     # ApiResponse (ok / created)
    │       ├── jwt.utils.js        # access + refresh token sign/verify
    │       ├── email.js            # Nodemailer email service (singleton)
    │       └── emailInitializer.js # Boot-time email verification
    └── modules/
        ├── auth/
        │   ├── auth.routes.js
        │   ├── auth.controller.js
        │   ├── auth.service.js
        │   ├── auth.model.js       # users table schema
        │   ├── auth.middleware.js  # authenticate()
        │   └── dto/                # register, login, forgot/reset, profile
        ├── categories/
        │   ├── category.routes.js
        │   ├── category.controller.js
        │   ├── category.service.js
        │   └── dto/                # Add, Update
        └── records/
            ├── records.routes.js
            ├── records.controller.js
            ├── records.service.js
            ├── records.model.js    # milk_logs table schema
            ├── records.exporter.js # PDF + Excel generation
            ├── records.middleware.js
            └── dto/                # Add, Update, query, summary, export
```

---

## Database Schema

The database uses three tables. Schemas are documented in the `*.model.js` files.

### `users`

| Column              | Type      | Notes                                   |
| ------------------- | --------- | --------------------------------------- |
| `id`                | uuid      | PK, auto-generated                      |
| `email`             | text      | unique, not null                       |
| `full_name`         | text      | not null                               |
| `password`          | text      | `bcrypt` hash                          |
| `role`              | text      | default `'user'`                       |
| `refresh_token`     | text      | hashed refresh token (nullable)         |
| `reset_otp`         | text      | password-reset OTP (nullable)           |
| `reset_otp_expires` | timestamp | OTP expiry (nullable)                   |
| `created_at`        | timestamp | default `now()`                        |
| `updated_at`        | timestamp | default `now()`                        |

### `categories`

| Column          | Type      | Notes                                          |
| --------------- | --------- | ---------------------------------------------- |
| `id`            | uuid      | PK                                             |
| `user_id`       | uuid      | FK → `users.id`                                |
| `name`          | text      | category/milk-type name (unique per user)      |
| `current_price` | numeric   | price per litre snapshot                       |
| `is_active`     | boolean   | soft-delete flag (default `true`)              |
| `created_at`    | timestamp | default `now()`                                |

### `milk_logs`

| Column             | Type      | Notes                                                       |
| ------------------ | --------- | ----------------------------------------------------------- |
| `id`               | uuid      | PK                                                          |
| `user_id`          | uuid      | FK → `users.id`                                             |
| `category_id`      | uuid      | FK → `categories.id`                                        |
| `quantity_liters`  | numeric   | litres logged                                               |
| `price_per_liter`  | numeric   | price snapshot at log time                                  |
| `total_price`      | numeric   | **generated always as** `quantity * price_per_liter` (stored) |
| `log_date`         | date      | date of the entry                                           |
| `created_at`       | timestamp | default `now()`                                             |
| `updated_at`       | timestamp | default `now()`                                             |

> **Note:** When a log is created or its category changes, the service snapshots `categories.current_price` into `price_per_liter` so historical reports remain accurate even if the price is later updated.

All data access is **scoped per user** — every query filters by `user_id`, so users can only see and manage their own records.

---

## API Reference

All endpoints are prefixed with `/api`. Protected endpoints require an
`Authorization: Bearer <accessToken>` header.

### Auth API

Base path: `/api/auth`

| Method | Endpoint            | Auth | Description                                  |
| ------ | ------------------- | ---- | -------------------------------------------- |
| POST   | `/register`         | ❌   | Create a new account (sends welcome email).  |
| POST   | `/login`            | ❌   | Authenticate and receive access + refresh tokens. |
| POST   | `/logout`           | ✅   | Invalidate the stored refresh token.         |
| POST   | `/forgot-password`  | ❌   | Email a 10-minute OTP reset code.             |
| POST   | `/reset-password`   | ❌   | Reset password using the OTP.                 |
| POST   | `/refresh-token`    | ❌   | Exchange a refresh token for a new access token. |
| GET    | `/me`               | ✅   | Get the current authenticated user.           |
| PUT    | `/profile`          | ✅   | Update name/email/password.                  |

### Categories API

Base path: `/api/categories` — **all routes require authentication.**

| Method | Endpoint    | Description                                  |
| ------ | ----------- | -------------------------------------------- |
| POST   | `/`         | Create a category (name + `current_price`).  |
| GET    | `/`         | List all active categories for the user.     |
| PUT    | `/:id`      | Update a category's name/price.              |
| DELETE | `/:id`      | Soft-delete a category (`is_active = false`).|

### Milk Logs API

Base path: `/api/logs` — **all routes require authentication.**

| Method | Endpoint                | Query / Body                                  | Description                                  |
| ------ | ----------------------- | --------------------------------------------- | -------------------------------------------- |
| POST   | `/`                     | `categoryId`, `quantity`, `record_date`       | Add a milk log entry.                        |
| GET    | `/`                     | `startDate`, `endDate` (optional, `YYYY-MM-DD`) | List records, optionally date-filtered.    |
| GET    | `/date`                 | `date` (required)                             | Get all entries for a specific date.          |
| GET    | `/summary/daily`        | `date` (required)                             | Total quantity + amount for a day.            |
| GET    | `/summary/monthly`      | `month` (required, `YYYY-MM`)                 | Monthly totals with per-day breakdown.        |
| GET    | `/export`               | `format` (`pdf`\|`excel`), `startDate`, `endDate` | Download a PDF or Excel report.          |
| PUT    | `/:id`                  | `categoryId`, `quantity`, `record_date`       | Update a log entry.                          |
| DELETE | `/:id`                  | —                                             | Delete a log entry.                          |

### System

| Method | Endpoint    | Description                                  |
| ------ | ----------- | -------------------------------------------- |
| GET    | `/health`   | Liveness probe — returns `{ status: "ok", timestamp }`. |

---

## Authentication Flow

The API uses a **dual-token** strategy:

1. **Access token** (`JWT_ACCESS_SECRET`) — short-lived (default `15m`),
   sent as a Bearer token and verified by `authenticate()` on every protected
   request.
2. **Refresh token** (`JWT_REFRESH_SECRET`) — longer-lived (default `7d`).
   On login it is hashed (`SHA-256`) and stored on the `users` row. Clients
   present it to `/refresh-token` to obtain a new access token without
   re-entering credentials.

`authenticate` (`auth.middleware.js`) decodes the access token, re-loads the
user from the database (so disabled/deleted accounts are rejected), and attaches
`req.user` for downstream handlers.

---

## Request Validation

Every incoming request is validated before reaching the controller. DTOs extend
`BaseDto` and override a static `schema` (Joi). The `validate` middleware runs
`BaseDto.validate`, collecting **all** errors (`abortEarly: false`) and stripping
unknown keys (`stripUnknown: true`). Failures raise a `400 Bad Request`
`ApiError`.

Example DTO:

```js
import BaseDto from "../../common/dto/base.dto.js";
import Joi from "joi";

class AddRecordDto extends BaseDto {
  static schema = Joi.object({
    categoryId: Joi.string().uuid().required(),
    quantity: Joi.number().positive().required(),
    record_date: Joi.date().iso().required(),
  });
}

export default AddRecordDto;
```

---

## Email Service

`common/utils/email.js` is a singleton `EmailService` built on Nodemailer using
**Gmail with an App Password**. It exposes:

- `sendWelcomeEmail` — sent on registration.
- `sendOtpEmail` — 6-digit password-reset code (expires in 10 minutes).
- `sendPasswordResetConfirmationEmail` — sent after a successful reset.
- `sendVerificationEmail` — available for future email-verification flows.

Email is **fail-safe**: if credentials are missing or invalid, the service
initializes with a stub that throws descriptive errors, and the rest of the API
keeps working. `server.js` calls `initializeEmailService()` at boot to verify
the connection early.

---

## Exporting Records

`records.exporter.js` streams reports directly to the client:

- **PDF** — generated with `pdfkit`: a branded header, period totals
  (quantity, amount, entry count), and a paginated, zebra-striped table.
- **Excel** — generated with `xlsx`: a styled array-of-arrays sheet with the
  same columns.

Both helpers return Node `Buffer`s, so the controller sets the `Content-Type`
and `Content-Disposition` headers and pipes the file as a download. Money is
formatted in Indian numbering (`Rs 1,23,456.00`) and quantities in litres.

---

## Error Handling

A single global error handler (`app.js`) catches everything:

- `ApiError` instances return `{ success: false, message }` with the proper
  status code (`badRequest` → 400, `unauthorized` → 401, etc.).
- Unexpected errors log to the console and return a generic `500`.

This guarantees a consistent error envelope across the whole API.

---

## Setup & Installation

### Prerequisites

- Node.js **18+**
- A PostgreSQL database (local or hosted, e.g. Neon, Supabase, Railway)

### Steps

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Configure environment**

   Copy the example file and fill in your values:

   ```bash
   cp .env.example .env
   ```

3. **Provision the database**

   Create the `users`, `categories`, and `milk_logs` tables matching the
   schemas documented in the `*.model.js` files (or run your migration/SQL
   script against `DATABASE_URL`).

4. **Start the server**

   ```bash
   # production
   npm start

   # development (with auto-reload via nodemon)
   npm run dev
   ```

The server listens on `PORT` (default `3000`). Verify it works:

```bash
curl http://localhost:3000/health
```

---

## Environment Variables

See `.env.example` for the full list. Required/important keys:

| Variable                  | Description                                              |
| ------------------------- | -------------------------------------------------------- |
| `DATABASE_URL`            | PostgreSQL connection string.                             |
| `NODE_ENV`                | `development` or `production` (enables DB SSL).          |
| `PORT`                    | Port the server binds to (default `3000`).               |
| `JWT_ACCESS_SECRET`       | Secret for signing access tokens.                        |
| `JWT_ACCESS_EXPIRES_IN`   | Access token lifetime (default `15m`).                   |
| `JWT_REFRESH_SECRET`      | Secret for signing refresh tokens.                       |
| `JWT_REFRESH_EXPIRES_IN`  | Refresh token lifetime (default `7d`).                   |
| `GOOGLE_USER_EMAIL`       | Gmail address used to send emails.                       |
| `GOOGLE_PASS_EMAIL`      | Gmail **App Password** (not your normal password).       |
| `EMAIL_FROM`             | Optional override for the "from" address.                |
| `APP_URL`                | Base URL used in email links (e.g. `http://localhost:3000`). |

> **Gmail note:** Enable 2-Step Verification on the Google account and create
> an [App Password](https://myaccount.google.com/apppasswords) for
> `GOOGLE_PASS_EMAIL`.

---

## Running Locally

```bash
# from the backend folder
npm install
npm run dev
```

The API will be available at `http://localhost:3000` and the frontend (running
on `http://localhost:8081` by default) is already allow-listed in the CORS
configuration in `app.js`.

---

## Deployment

The backend is configured for **Vercel** via `vercel.json`, which uses a
catch-all rewrite so all requests are handled by `server.js`:

```json
{
  "version": 2,
  "buildCommand": "npm install",
  "outputDirectory": ".",
  "framework": null,
  "rewrites": [{ "source": "/(.*)", "destination": "/server.js" }]
}
```

### Deploy steps

1. Push the `milk_logs_backend` folder to a Git repository (or use the Vercel CLI).
2. In the Vercel project settings, add all the [environment variables](#environment-variables)
   from `.env` (especially `DATABASE_URL` and the JWT secrets).
3. Deploy — Vercel installs dependencies, builds, and routes traffic to the API.
4. Update the CORS `allowedOrigins` in `src/app.js` to include your deployed
   frontend origin.

> For long-running database connections behind serverless functions, consider
> connection pooling or a managed Postgres instance with SSL (the pool already
> enables `rejectUnauthorized: false` in production).
