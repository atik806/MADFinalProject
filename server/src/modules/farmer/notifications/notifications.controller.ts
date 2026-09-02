import { Request, Response } from 'express';
import * as notificationService from './notifications.service';

export const getNotification = async (req: Request, res: Response) => {
  try {
    const data = await notificationService.getNotifications(req.user?.id);
    return res.status(200).json({ notifications: data, success: true });
  } catch (error: any) {
    return res.status(500).json({
      message: 'An error occurred while fetching notifications.',
    });
  }
};

export const markAsRead = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const id = req.params.id;
    if (!id) {
      return res.status(400).json({ error: 'Notification id is required' });
    }
    await notificationService.markAsRead(req.user.id, String(id));
    return res.status(200).json({ message: 'Notification marked as read.', success: true });
  } catch (error: any) {
    return res.status(500).json({
      message: 'An error occurred while marking notification as read.',
    });
  }
};

export const deleteNotification = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const id = req.params.id;
    if (!id) {
      return res.status(400).json({ error: 'Notification id is required' });
    }
    await notificationService.deleteNotification(req.user.id, String(id));
    return res.status(200).json({ message: 'Notification deleted successfully.', success: true });
  } catch (error: any) {
    return res.status(500).json({
      message: 'An error occurred while deleting notification.',
    });
  }
};
