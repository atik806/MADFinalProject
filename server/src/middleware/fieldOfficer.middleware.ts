import { NextFunction, Request, Response } from 'express';
import { supabase } from '../config/supabase';

export const fieldOfficerOnly = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const authRole = String(
            (req.user.user_metadata as any)?.role ?? (req.user.app_metadata as any)?.role ?? '',
        )
            .trim()
            .toLowerCase();

        // Use maybeSingle so a missing profile is distinguishable from a real
        // DB error. single() raises PGRST116 when the row is missing, which
        // would otherwise be conflated with a genuine "row not found" 403.
        const { data: profile, error } = await supabase
            .from('profiles')
            .select('role')
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
