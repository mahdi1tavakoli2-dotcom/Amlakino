import { Notification, User } from '../types';
import { storageService } from './storageService';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

export const notificationService = {
  async getAll(currentUser?: User | null): Promise<Notification[]> {
    return storageService.getNotifications(currentUser);
  },

  async markAsRead(id: string): Promise<void> {
    return storageService.markNotificationAsRead(id);
  },

  async send(params: {
    userId: string;
    title: string;
    message: string;
    type?: 'match' | 'followup' | 'visit' | 'system' | 'opportunity' | 'invitation';
    link?: string;
  }): Promise<void> {
    if (isSupabaseConfigured()) {
      try {
        await supabase.from('notifications').insert({
          user_id: params.userId,
          title: params.title,
          message: params.message,
          type: params.type || 'system',
          link: params.link,
        });
      } catch (e) {
        console.warn('Failed to send notification via Supabase', e);
      }
    }
  },
};
