import { Request, Response } from 'express';
import * as notificationService from './notifications.service';

export const getNotification = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    const data = await notificationService.getNotifications(req.user.id);
    // Standard envelope: { success, message, data }. `notifications` is kept
    // as a compatibility alias for the current client provider.
    return res.status(200).json({ success: true, message: 'Notifications fetched', data, notifications: data });
  } catch (error: any) {
    return res.status(500).json({
      message: 'An error occurred while fetching notifications.',
    });
  }
};

export const markAsRead = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    const id = req.params.id;
    if (!id) {
      return res.status(400).json({ message: 'Notification id is required' });
    }
    const data = await notificationService.markAsRead(req.user.id, String(id));
    if (!data) {
      return res.status(404).json({ message: 'Notification not found', success: false });
    }
    return res.status(200).json({ message: 'Notification marked as read.', success: true, data: { id: String(id) } });
  } catch (error: any) {
    return res.status(500).json({
      message: 'An error occurred while marking notification as read.',
    });
  }
};

export const deleteNotification = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    const id = req.params.id;
    if (!id) {
      return res.status(400).json({ message: 'Notification id is required' });
    }
    await notificationService.deleteNotification(req.user.id, String(id));
    return res.status(200).json({ message: 'Notification deleted successfully.', success: true, data: { id: String(id) } });
  } catch (error: any) {
    return res.status(500).json({
      message: 'An error occurred while deleting notification.',
    });
  }
};
