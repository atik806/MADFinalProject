# SOFOL - Farmer Credit Profile Platform

SOFOL contains an Expo mobile frontend and an isolated Express backend foundation. The frontend UI, navigation, mock data, and demo login remain unchanged and are not yet connected to the backend.

## Run the backend

```bash
cd backend
npm install
cp .env.example .env
npm run dev
```

PowerShell: `Copy-Item .env.example .env`.

## API

### `GET /api/health`

No authentication is required. It returns `200 OK` with `success`, `message`, and status data.

```bash
curl http://localhost:3000/api/health
```

## Backend commands

Run inside `backend/`:

```bash
npm run dev
npm start
npm run lint
npm test
```

## Architecture and status

`backend/src/app.js` configures Express, JSON parsing, CORS, request IDs, the health endpoint, centralized 404/error handling, and reusable Zod validation middleware. `backend/src/server.js` opens the listener.

Implemented: Express foundation and health endpoint. Planned: database, authentication, role authorization, domain APIs, and frontend integration. Never commit `.env`; use `.env.example` for safe configuration keys.