import { Request, Response, NextFunction } from 'express';
import { supabase } from '../config/supabase';


export const farmerOnly = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const { data: profile, error } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', req.user.id)
            .single();

        if(error || !profile) {
            return res.status(403).json({ message: 'Forbidden: User role not found' });
        }
        if(profile.role !== 'farmer') {
            return res.status(403).json({ message: 'Forbidden: User is not a farmer' });
        }

        next();
    }catch (error) {
        console.error('Error checking user role:', error);
        res.status(500).json({ message: 'Role verification failed' });
    }
};

