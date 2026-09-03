import { NextFunction, Request, Response } from 'express';
import { supabase } from '../config/supabase';

export const fieldOfficerOnly = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        // Only trust app_metadata.role — it can be set exclusively with the
        // service-role key. user_metadata is user-editable via
        // supabase.auth.updateUser(), so trusting it here would let any
        // authenticated user self-promote to field_officer.
        const authRole = String((req.user.app_metadata as any)?.role ?? '')
            .trim()
            .toLowerCase();

        // maybeSingle so a missing profile is distinguishable from a real
        // DB error. single() raises PGRST116 when the row is missing, which
        // would otherwise be conflated with a genuine "row not found" 403.
        const { data: profile, error } = await supabase
            .from('profiles')
            .select('role, status')
            .eq('id', req.user.id)
            .maybeSingle();

        if (error) {
            console.error('Role lookup error:', error);
            return res.status(500).json({ message: 'Role verification failed' });
        }

        if (!profile) {
            // The auth user exists but the profile row is missing — this can
            // happen when a previous registration wrote the auth user but
            // failed to insert the profile. Self-heal by creating a minimal
            // profile so the field officer can keep using the app. They can
            // fill in the rest of their data via the Edit Profile screen.
            const { error: insertError } = await supabase
                .from('profiles')
                .insert({
                    id: req.user.id,
                    role: 'field_officer',
                    status: 'pending',
                    phone: req.user.phone ?? null,
                    email: req.user.email ?? null,
                    name_en: req.user.user_metadata?.full_name ?? null,
                });

            if (insertError) {
                console.error('Failed to self-heal missing profile:', insertError);
                return res.status(403).json({ message: 'Forbidden: User role not found' });
            }

            return next();
        }

        const normalizedRole = String(profile.role ?? '').trim().toLowerCase();
        if (normalizedRole === 'field_officer') {
            // Re-read the account status on every request rather than trusting
            // the JWT: an admin suspending an officer must take effect
            // immediately, while the officer's token is still valid.
            // 'pending' and 'active' both pass — officer accounts are
            // admin-created as active, and pending is the self-heal default.
            const normalizedStatus = String(profile.status ?? '').trim().toLowerCase();
            if (normalizedStatus === 'inactive' || normalizedStatus === 'suspended') {
                return res.status(403).json({ message: 'Forbidden: Field officer account is not active' });
            }
            return next();
        }

        // Some legacy users have the correct role in auth metadata but an old
        // or blank role value in profiles. Trust auth metadata here and repair
        // the profile row to prevent repeated 403s on field-officer endpoints.
        if (authRole === 'field_officer') {
            const { error: roleFixError } = await supabase
                .from('profiles')
                .update({ role: 'field_officer' })
                .eq('id', req.user.id);

            if (roleFixError) {
                console.error('Failed to self-heal profile role:', roleFixError);
                return res.status(403).json({ message: 'Forbidden: User is not a field officer' });
            }

            return next();
        }

        if (normalizedRole !== 'field_officer') {
            return res.status(403).json({ message: 'Forbidden: User is not a field officer' });
        }

        next();
    } catch (error) {
        console.error('Error checking user role:', error);
        res.status(500).json({ message: 'Role verification failed' });
    }
};
