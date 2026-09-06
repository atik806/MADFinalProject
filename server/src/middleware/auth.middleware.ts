import { NextFunction, Request, Response } from 'express';
import { supabase } from '../config/supabase';
export const authenticateUser = async (req:Request, res:Response, next:NextFunction) => {
    try{
        const authHeader = req.headers.authorization;
        if(!authHeader) {
            return res.status(401).json({ message: 'Authorization header missing' });
        }

    const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : authHeader;    
    if(!token) {
        return res.status(401).json({ message: 'Token missing' });
    }
    const{
        data: {user},
        error,
    } =await supabase.auth.getUser(token);
    if(error || !user) {
        return res.status(401).json({ message: 'Invalid token or expired token.' });
    }

    req.user = user;
    next();
}catch(error) {
    // Log only sanitized metadata; never the raw error object, which can
    // contain request/response payloads.
    console.error('Authentication failure:', req.method, req.path, error instanceof Error ? error.name : 'UnknownError');
    res.status(500).json({ message: 'Authentication Failed' });
}

}