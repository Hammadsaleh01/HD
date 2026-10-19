import { getDb, persistDb } from '../store.ts';
import { Notification } from '@shared/types.ts';

export const notificationRepository = {
  create: async (notif: Notification): Promise<Notification> => {
    const db = getDb();
    db.notifications.unshift(notif);
    await persistDb();
    return notif;
  },

  findByUser: async (userId: string): Promise<Notification[]> => {
    const db = getDb();
    return db.notifications.filter(n => n.userId === userId);
  },

  markRead: async (id: string, userId: string): Promise<boolean> => {
    const db = getDb();
    const notif = db.notifications.find(n => n.id === id && n.userId === userId);
    if (!notif) return false;
    notif.isRead = true;
    await persistDb();
    return true;
  },

  markAllRead: async (userId: string): Promise<number> => {
    const db = getDb();
    let count = 0;
    for (const n of db.notifications) {
      if (n.userId === userId && !n.isRead) {
        n.isRead = true;
        count++;
      }
    }
    if (count > 0) {
      await persistDb();
    }
    return count;
  }
};
