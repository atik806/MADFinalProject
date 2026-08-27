import { NextFunction, Request, Response } from 'express';
import { supabase, supabaseAdmin } from '../config/supabase';

// adminOnly: gates an endpoint to authenticated users whose profile has
// role = 'admin'. Mirrors the fieldOfficerOnly middleware: it reads the
// role from profiles, self-heals missing rows from auth metadata, and
// repairs a stale profile role by trusting the auth metadata.
//
// Source-of-truth for the *primary* admin is the env-configured
// ADMIN_EMAIL — the account seeded by ensureAdminUser(). If the token
// email matches that, we always allow access, even if the profile row
// is missing or stale, so admin login keeps working while admin.sql
// is being applied.
const PRIMARY_ADMIN_EMAIL = String(process.env.ADMIN_EMAIL ?? 'admin@gmail.com')
    .trim()
    .toLowerCase();

export const adminOnly = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const tokenEmail = String(req.user.email ?? '').trim().toLowerCase();
        const isPrimaryAdmin = tokenEmail && tokenEmail === PRIMARY_ADMIN_EMAIL;

        const authRole = String(
            (req.user.user_metadata as any)?.role ?? (req.user.app_metadata as any)?.role ?? '',
        )
            .trim()
            .toLowerCase();

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

        if (!profile) {
            // Self-heal a missing profile from auth metadata so admins who
            // are also acting as another role in a separate context can
            // still hit /api/admin endpoints. Only attempt if the auth
            // metadata already claims admin.
            if (authRole === 'admin') {
                const { error: insertError } = await supabaseAdmin.from('profiles').insert({
                    id: req.user.id,
                    role: 'admin',
                    status: 'active',
                    email: req.user.email ?? null,
                    phone: req.user.phone ?? null,
                    name_en: req.user.user_metadata?.full_name ?? null,
                });

                if (insertError && !/duplicate key|already exists/i.test(insertError.message)) {
                    console.error('Failed to self-heal missing admin profile:', insertError);
                    return res.status(403).json({ message: 'Forbidden: User role not found' });
                }
                return next();
            }
            return res.status(403).json({ message: 'Forbidden: User role not found' });
        }

        const normalizedRole = String(profile.role ?? '').trim().toLowerCase();
        if (normalizedRole === 'admin') {
            if (profile.status && String(profile.status).toLowerCase() === 'inactive') {
                return res.status(403).json({ message: 'Forbidden: Admin account is inactive' });
            }
            return next();
        }

        if (authRole === 'admin') {
            const { error: roleFixError } = await supabaseAdmin
                .from('profiles')
                .update({ role: 'admin' })
                .eq('id', req.user.id);

            if (roleFixError) {
                console.error('Failed to self-heal admin profile role:', roleFixError);
                return res.status(403).json({ message: 'Forbidden: User is not an admin' });
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
