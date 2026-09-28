import { Subscription } from '../types';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { storageService } from './storageService';

export const subscriptionService = {
  async getSubscription(teamId: string): Promise<Subscription> {
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('team_id', teamId)
          .single();
        if (!error && data) {
          return {
            id: data.id,
            teamId: data.team_id,
            plan: data.plan,
            planName: data.plan_name,
            maxAgents: data.max_agents,
            currentAgents: data.current_agents,
            active: data.active,
            expiresAt: data.expires_at,
          };
        }
      } catch (e) {
        console.warn('Subscription fetch error', e);
      }
    }

    return {
      id: 'sub_default',
      teamId,
      plan: 'pro',
      planName: 'طرح حرفه‌ای دپارتمان بارمان',
      maxAgents: 15,
      currentAgents: 3,
      active: true,
      expiresAt: '۱۴۰۴/۰۱/۰۱',
    };
  },

  async updateAgentSubscription(userId: string, status: 'active' | 'none' | 'expired') {
    return storageService.updateSubscriptionStatus(userId, status);
  },
};
