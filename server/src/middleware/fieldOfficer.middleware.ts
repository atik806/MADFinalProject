import { NextFunction, Request, Response } from 'express';
import { supabase } from '../config/supabase';

export const fieldOfficerOnly = async (req: Request, res: Response, next: NextFunction) => {
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

        // The admin user's `profiles` row is the single source of truth for
        // field-officer identity. Field-officer accounts are always created
        // by an admin via POST /api/admin/field-officers (which writes the
        // profile). A missing or non-field_officer profile is a hard 403:
        // never self-heal or promote from auth metadata — a client can
        // rewrite its own user_metadata.role, so trusting it would let any
        // authenticated user mint themselves a field officer.
        if (!profile) {
            return res.status(403).json({ message: 'Forbidden: User role not found' });
        }

        const normalizedRole = String(profile.role ?? '').trim().toLowerCase();
        if (normalizedRole === 'field_officer') {
            // Re-read the account status on every request rather than trusting
            // the JWT: an admin suspending an officer must take effect
            // immediately, while the officer's token is still valid.
            const normalizedStatus = String(profile.status ?? '').trim().toLowerCase();
            if (normalizedStatus === 'inactive' || normalizedStatus === 'suspended') {
                return res.status(403).json({ message: 'Forbidden: Field officer account is not active' });
            }
            return next();
        }

        return res.status(403).json({ message: 'Forbidden: User is not a field officer' });
    } catch (error) {
        console.error('Error checking user role:', error);
        res.status(500).json({ message: 'Role verification failed' });
    }
};
