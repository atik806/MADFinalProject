import { RequestHandler } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

// ------------------------------------------------------------------
// Security middleware configuration
// ------------------------------------------------------------------
// CORS: the previous blanket `origin: '*'` let any site call the
// authenticated API. Origins are now allow-listed through CORS_ORIGINS
// (comma-separated). Development defaults cover the Expo web dev server,
// Expo Go and the Android emulator loopback; production sets the env var
// to its own origin list. Requests from unknown origins are rejected by
// the browser — the API keeps working for every configured client.
const DEV_ORIGINS = [
    'http://localhost:8081', // Expo web / Metro dev server
    'http://localhost:19006', // Expo web (older SDK port)
    'http://127.0.0.1:8081',
    'exp://localhost:19000', // Expo Go
];

const parseOrigins = (): string[] => {
    const raw = String(process.env.CORS_ORIGINS ?? '').trim();
    if (!raw) return DEV_ORIGINS;
    return raw
        .split(',')
        .map((o) => o.trim())
        .filter(Boolean);
};

export const corsMiddleware: RequestHandler = cors({
    origin: parseOrigins(),
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: false,
    maxAge: 86400, // cache preflight for a day; fewer OPTIONS round-trips
});

// Helmet defaults are API-safe (no CSP that would break non-browser
// clients; native apps and E2E tests ignore headers entirely).
// Cross-origin isolation headers are disabled so browsers running the
// Expo web client on a different port are not blocked by COEP.
export const helmetMiddleware = helmet({
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
});

// ------------------------------------------------------------------
// Rate limiting
// ------------------------------------------------------------------
// Two tiers, both env-tunable so E2E suites / load tests can raise them:
//
//  - authLimiter: login/register/reset-password endpoints. Brute-forcing
//    a password or farming registrations is the primary abuse vector.
//    Generous window/count so the E2E suites (which register farmers and
//    log in repeatedly) still pass with headroom.
//  - adminMutationLimiter: admin POST/PUT/PATCH endpoints — officer
//    provisioning, status changes, password resets. Low volume by nature;
//    a tight limit here blunts credential-stuffing an admin token.
//
// limitReached responses are plain 429s with a generic message — no
// internal details. Express-rate-limit sets standard Retry-After headers.
const windowMs = Number(process.env.RATE_LIMIT_WINDOW_MS ?? 15 * 60 * 1000);
const toInt = (value: string | undefined, fallback: number) => {
    const n = Number(value);
    return Number.isFinite(n) && n > 0 ? n : fallback;
};

const message = { message: 'Too many requests. Please try again later.' };

export const authLimiter = rateLimit({
    windowMs,
    limit: toInt(process.env.RATE_LIMIT_AUTH_MAX, 100),
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message,
});

export const adminMutationLimiter = rateLimit({
    windowMs,
    limit: toInt(process.env.RATE_LIMIT_ADMIN_MUTATION_MAX, 60),
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message,
});
