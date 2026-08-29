# SOFOL AI Development Context

## Project architecture

The Expo TypeScript frontend is at the repository root. Its Expo Router routes are under `src/app` and React Context holds current mock state. The standalone JavaScript Express backend is in `backend/`; no frontend code calls it yet.

## Current backend status

Implemented: Express application, environment loading/validation (`NODE_ENV`, `PORT`), CORS/JSON/request-ID middleware, standard 404 and safe error responses, reusable Zod validation middleware, `GET /api/health`, ESLint, and Node built-in tests.

Partially implemented: validation infrastructure exists but no input endpoint uses it yet.

Not implemented: database, models, authentication, role authorization, farmer/field-officer/bank-officer/admin APIs, audit logs, and frontend integration.

## File-by-file changes

- `backend/package.json`: isolated package and `dev`, `start`, `lint`, `test` scripts.
- `backend/.env.example`: non-secret runtime configuration example.
- `backend/eslint.config.js`: backend JavaScript lint rules.
- `backend/src/app.js`: Express composition, middleware, health handler, error handling, and validation helper.
- `backend/src/server.js`: listener startup and graceful shutdown.
- `backend/test/health.test.js`: health and unknown-route tests.
- `.gitignore`: ignores `.env` files but retains `.env.example`.
- `README.md` and this file: current setup and honest implementation status.

## API documentation

### GET `/api/health`

Purpose: verifies the API process is reachable.

Authentication: none. Request body/parameters: none. Response: `200` with `{ success: true, message, data }`. Unknown paths receive `{ success: false, message }` with `404`.

## Known issues and next steps

CORS currently permits all origins and must be restricted before production. Expo Doctor previously reported SDK 56 patch drift and a Hermes regression; no Expo changes were made. Next, approve database selection/schema design before authentication or business APIs.