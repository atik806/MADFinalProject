import { Request, Response } from 'express';
import { supabase } from '../config/supabase';

//get notifications for a user

export const getNotification = async (req: Request, res: Response) => {
    try{
        const userId = req.params.userId;
        const {data, error} = await supabase
            .from('notifications')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });
        if (error) {
            return res.status(500).json({ error: error.message });
        }

        return res.status(200).json({ notifications: data, success: true });

        
    }catch (error) {
        console.error('Error fetching notifications:', error);
        return res.status(500).json({ error: 'An error occurred while fetching notifications.' });
    }
};



//mark as read

export const markAsRead = async (req: Request, res: Response) => {
    try{
        const userId = req.params.userId;
        const notificationId = req.params.notificationId;
        const { data, error } = await supabase
            .from('notifications')
            .update({ is_read: true })
            .eq('user_id', userId)
            .eq('id', notificationId)
            .select()
            .single();
        if (error) {
            return res.status(500).json({ error: error.message });
        }
        return res.status(200).json({ message: 'Notification marked as read.', success: true });
    } catch (error) {
        console.error('Error marking notification as read:', error);
        return res.status(500).json({ error: 'An error occurred while marking notification as read.' });
    }
};   

//delete notification

export const deleteNotification = async (req: Request, res: Response) => {
    try{
        const userId = req.params.userId;
        const notificationId = req.params.notificationId;
        const { data, error } = await supabase
            .from('notifications')
            .delete()
            .eq('user_id', userId)
            .eq('id', notificationId)
            .select()
            .single();
        if (error) {
            return res.status(500).json({ error: error.message });
        }
        return res.status(200).json({ message: 'Notification deleted successfully.', success: true });
    } catch (error) {
        console.error('Error deleting notification:', error);
        return res.status(500).json({ error: 'An error occurred while deleting notification.' });
    }
};