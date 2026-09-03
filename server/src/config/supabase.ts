import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error('Supabase URL and Service Role Key must be provided in the environment variables.');
}

// ---------------------------------------------------------------------------
// Guard: the whole server assumes it can bypass Row Level Security, which only
// holds when SUPABASE_SERVICE_ROLE_KEY is really a *service_role* key. If an
// anon / publishable key is pasted here by mistake, auth (login) still works
// but every table read silently returns [] and every insert fails with
// `42501 new row violates row-level security policy` — fail loudly instead.
// ---------------------------------------------------------------------------
const assertServiceRoleKey = (key: string): void => {
    if (!key.startsWith('eyJ')) {
        if (key.startsWith('sb_publishable_')) {
            throw new Error(
                'SUPABASE_SERVICE_ROLE_KEY is set to a PUBLISHABLE key. Use the ' +
                'secret key (sb_secret_...) from Supabase → Project Settings → API keys.',
            );
        }
        return; // opaque secret key (sb_secret_...) — always privileged
    }
    let role: string | undefined;
    try {
        role = JSON.parse(Buffer.from(key.split('.')[1] ?? '', 'base64').toString('utf8')).role;
    } catch {
        return;
    }
    if (role !== 'service_role') {
        throw new Error(
            `SUPABASE_SERVICE_ROLE_KEY has role "${role ?? 'unknown'}", not "service_role". ` +
            'Copy the service_role key from Supabase → Project Settings → API into server/.env.',
        );
    }
};

assertServiceRoleKey(supabaseServiceRoleKey);

const serviceClientOptions = {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
} as const;

// Privileged, service-role clients. IMPORTANT: never call
// `signInWithPassword` / `setSession` / `signUp` on these. supabase-js stores
// the resulting session in memory (even with persistSession:false) and then
// sends *that user's* JWT as the Authorization header for every subsequent
// `.from()` / PostgREST call on the same client instance — which silently
// switches the client from "service_role, bypasses RLS" to "authenticated
// user, subject to RLS", breaking all data reads/writes for every request.
// Use `createAuthClient()` for password sign-in instead.
export const supabase: SupabaseClient = createClient(
    supabaseUrl,
    supabaseServiceRoleKey,
    serviceClientOptions,
);

export const supabaseAdmin: SupabaseClient = createClient(
    supabaseUrl,
    supabaseServiceRoleKey,
    serviceClientOptions,
);

// Returns a throwaway client to be used ONLY for `signInWithPassword` (and
// similar session-establishing auth calls). It is isolated, so the in-memory
// session it picks up never leaks into the privileged `supabase` client.
// Create a fresh one per login so concurrent logins can't race on session
// state; the object is cheap and holds no open sockets.
export const createAuthClient = (): SupabaseClient =>
    createClient(supabaseUrl, supabaseServiceRoleKey, {
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
