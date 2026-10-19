import { Notification, User } from '@shared/types.ts';
import { notificationRepository } from '../database/repositories/notificationRepository.ts';
import { userRepository } from '../database/repositories/userRepository.ts';
import { logger } from '../utils/logger.ts';

export interface NotificationChannel {
  name: string;
  send(user: User, notif: Notification): Promise<void>;
}

export class ConsoleEmailChannel implements NotificationChannel {
  name = 'Email';
  async send(user: User, notif: Notification): Promise<void> {
    logger.info(`[Notification Channel: Email] To: ${user.email} | Subject: ${notif.title} | Body: ${notif.message}`);
  }
}

export class ConsoleSmsChannel implements NotificationChannel {
  name = 'SMS';
  async send(user: User, notif: Notification): Promise<void> {
    logger.info(`[Notification Channel: SMS] To: ${user.phone} | Alert: ${notif.title} - ${notif.message}`);
  }
}

export class ConsolePushChannel implements NotificationChannel {
  name = 'Push';
  async send(user: User, notif: Notification): Promise<void> {
    logger.info(`[Notification Channel: Push] User: ${user.id} | ${notif.title}`);
  }
}

const channels: Record<'email' | 'sms' | 'push', NotificationChannel> = {
  email: new ConsoleEmailChannel(),
  sms: new ConsoleSmsChannel(),
  push: new ConsolePushChannel()
};

export const notificationService = {
  dispatchNotification: async (params: {
    userId: string;
    title: string;
    message: string;
    type?: string;
    metadata?: Record<string, any>;
  }): Promise<Notification> => {
    const notif: Notification = {
      id: `notif-${crypto.randomUUID()}`,
      userId: params.userId,
      title: params.title,
      message: params.message,
      type: params.type,
      metadata: params.metadata,
      isRead: false,
      createdAt: new Date().toISOString()
    };

    // Store in database
    await notificationRepository.create(notif);

    // Check user preferences and dispatch through active channels
    const user = await userRepository.findById(params.userId);
    if (user && user.notificationPrefs) {
      if (user.notificationPrefs.email) {
        await channels.email.send(user, notif).catch(err => logger.warn('Email dispatch failed', err));
      }
      if (user.notificationPrefs.sms) {
        await channels.sms.send(user, notif).catch(err => logger.warn('SMS dispatch failed', err));
      }
      if (user.notificationPrefs.push !== false) {
        await channels.push.send(user, notif).catch(err => logger.warn('Push dispatch failed', err));
      }
    }

    return notif;
  }
};
