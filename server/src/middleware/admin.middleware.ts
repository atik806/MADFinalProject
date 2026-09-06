import { NextFunction, Request, Response } from 'express';
import { supabase, supabaseAdmin } from '../config/supabase';

// adminOnly: gates an endpoint to authenticated users whose profile has
// role = 'admin'. The profile row is the single source of truth; auth
// user_metadata.role is NEVER trusted here (a client can rewrite their own
// metadata, so trusting it would let anyone mint themselves an admin).
//
// The only self-heal is for the env-configured primary admin (ADMIN_EMAIL,
// seeded by ensureAdminUser()): if that account's profile row is missing or
// stale we still admit the request so admin login keeps working while
// admin.sql is being applied. The dev fallback email is spec-defined only;
// in production a missing ADMIN_EMAIL disables the short-circuit entirely.
const PRIMARY_ADMIN_EMAIL = (process.env.NODE_ENV === 'production'
    ? String(process.env.ADMIN_EMAIL ?? '')
    : String(process.env.ADMIN_EMAIL ?? 'admin@gmail.com'))
    .trim()
    .toLowerCase();

export const adminOnly = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const tokenEmail = String(req.user.email ?? '').trim().toLowerCase();
        const isPrimaryAdmin = tokenEmail && tokenEmail === PRIMARY_ADMIN_EMAIL;

        // The configured admin email short-circuits role/profile checks.
        // We still try to ensure the profile row exists so dependent
        // queries (audit logs, notifications) have a foreign key target.
        if (isPrimaryAdmin) {
            await ensureAdminProfileRow(req.user);
            return next();
        }

        const { data: profile, error } = await supabase
            .from('profiles')
            .select('role, status')
            .eq('id', req.user.id)
            .maybeSingle();

        if (error) {
            console.error('Admin role lookup error:', error);
            return res.status(500).json({ message: 'Role verification failed' });
        }

        // No self-heal for non-primary admins: a missing profile is a 403,
        // never a reason to fabricate one from client-writable metadata.
        if (!profile) {
            return res.status(403).json({ message: 'Forbidden: User role not found' });
        }

        const normalizedRole = String(profile.role ?? '').trim().toLowerCase();
        if (normalizedRole === 'admin') {
            if (profile.status && String(profile.status).toLowerCase() === 'inactive') {
                return res.status(403).json({ message: 'Forbidden: Admin account is inactive' });
            }
            return next();
        }

        return res.status(403).json({ message: 'Forbidden: User is not an admin' });
    } catch (error) {
        console.error('Error checking admin role:', error);
        res.status(500).json({ message: 'Role verification failed' });
    }
};

// Best-effort: upsert a profiles row for the configured admin. Never
// throws — the caller has already decided to admit the request, and we
// only want to keep the profile in sync.
const ensureAdminProfileRow = async (user: { id: string; email?: string; phone?: string; user_metadata?: any }) => {
    try {
        const { data: existing } = await supabaseAdmin
            .from('profiles')
            .select('id, role')
            .eq('id', user.id)
            .maybeSingle();

        if (existing) {
            if (String(existing.role ?? '').toLowerCase() !== 'admin') {
                await supabaseAdmin
                    .from('profiles')
                    .update({ role: 'admin', status: 'active' })
                    .eq('id', user.id);
            }
            return;
        }

        await supabaseAdmin.from('profiles').insert({
            id: user.id,
            role: 'admin',
            status: 'active',
            email: user.email ?? null,
            phone: user.phone ?? null,
            name_en: user.user_metadata?.full_name ?? 'System Administrator',
            is_verified: true,
            member_since: new Date().toISOString(),
        });
    } catch (err) {
        console.warn('ensureAdminProfileRow failed (non-fatal):', err);
    }
};
