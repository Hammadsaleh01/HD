import { Response } from 'express';
import { notificationRepository } from '../database/repositories/notificationRepository.ts';
import { AuthenticatedRequest } from '../middleware/auth.ts';

export const notificationController = {
  getMyNotifications: async (req: AuthenticatedRequest, res: Response) => {
    const notifications = await notificationRepository.findByUser(req.user!.id);
    res.status(200).json({ notifications });
  },

  markAsRead: async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params as { id: string };
    const success = await notificationRepository.markRead(id, req.user!.id);
    res.status(200).json({ success, message: 'Notification marked as read' });
  },

  markAllAsRead: async (req: AuthenticatedRequest, res: Response) => {
    const updatedCount = await notificationRepository.markAllRead(req.user!.id);
    res.status(200).json({
      success: true,
      message: `${updatedCount} notifications marked as read`
    });
  }
};
