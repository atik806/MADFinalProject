import { NextFunction, Request, Response } from 'express';
import { supabase } from '../config/supabase';


export const farmerOnly = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

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
            // profile so the farmer can keep using the app. They can fill in
            // the rest of their data via the Edit Profile screen.
            const { error: insertError } = await supabase
                .from('profiles')
                .insert({
                    id: req.user.id,
                    role: 'farmer',
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
        if (normalizedRole === 'farmer') {
            // Re-read the account status per request so an admin deactivating
            // a farmer takes effect immediately. 'pending' must still pass —
            // it is the status every farmer registration starts with; only
            // 'inactive'/'suspended' (set by an admin) block access.
            const normalizedStatus = String(profile.status ?? '').trim().toLowerCase();
            if (normalizedStatus === 'inactive' || normalizedStatus === 'suspended') {
                return res.status(403).json({ message: 'Forbidden: Farmer account is not active' });
            }
            return next();
        }

        // The profile row is the source of truth. Auth metadata is client-
        // writable, so it is never consulted to repair a profile role — but
        // the missing-profile self-heal above is safe because it can only
        // ever mint the lowest-privilege role (farmer), which is no more than
        // a user already gets from the public /register endpoint.
        return res.status(403).json({ message: 'Forbidden: User is not a farmer' });
    } catch (error) {
        console.error('Error checking user role:', error);
        res.status(500).json({ message: 'Role verification failed' });
    }
};

