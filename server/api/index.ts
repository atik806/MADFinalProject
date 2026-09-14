// Vercel serverless entry point. app.ts only exports the Express app (it
// never calls .listen() itself — that's server.ts, used for local dev) so
// it can be handed straight to Vercel's Node runtime as a request handler.
// vercel.json rewrites every path here, and Express routes on req.url as
// usual internally.
import app from '../src/app';

export default app;
