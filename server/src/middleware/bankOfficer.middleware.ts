import { NextFunction, Request, Response } from 'express';
import { supabase } from '../config/supabase';

// bankOfficerOnly: resolves the caller's role server-side and rejects anyone
// who is not a bank officer. Runs after authenticateUser, which has already
// verified the Supabase access token and populated req.user.
//
// Deliberately stricter than farmerOnly / fieldOfficerOnly: those two
// self-heal a missing profile by INSERTING one with their role, because
// farmers and field officers can arrive mid-registration. A bank officer is
// always provisioned by an admin (POST /api/admin/bank-officers), so a missing
// profile row is never a legitimate state here — self-healing it would let any
// authenticated Supabase user mint themselves loan-decision authority.
export const bankOfficerOnly = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        // maybeSingle so a missing profile is distinguishable from a real DB
        // error; single() raises PGRST116 for "no rows", which would be
        // conflated with a genuine lookup failure.
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
            return res.status(403).json({ message: 'Forbidden: User role not found' });
        }

        const normalizedRole = String(profile.role ?? '').trim().toLowerCase();
        if (normalizedRole !== 'bank_officer') {
            return res.status(403).json({ message: 'Forbidden: User is not a bank officer' });
        }

        // A suspended or deactivated officer keeps a valid token until it
        // expires, so the account state is re-checked on every request rather
        // than trusted from the JWT.
        const normalizedStatus = String(profile.status ?? '').trim().toLowerCase();
        if (normalizedStatus && normalizedStatus !== 'active') {
            return res.status(403).json({ message: 'Forbidden: Bank officer account is not active' });
        }

        next();
    } catch (error) {
        console.error('Error checking user role:', error);
        res.status(500).json({ message: 'Role verification failed' });
    }
};
