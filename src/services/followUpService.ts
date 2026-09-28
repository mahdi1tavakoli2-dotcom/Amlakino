import { FollowUp, FollowUpPriority, FollowUpType, FollowUpStatus, User } from '../types';
import { storageService } from './storageService';
import { opportunityService } from './opportunityService';

export const followUpService = {
  async getAll(currentUser?: User | null): Promise<FollowUp[]> {
    return storageService.getFollowUps(currentUser);
  },

  async create(
    data: {
      title: string;
      description?: string;
      dueAt: string;
      priority: FollowUpPriority;
      type: FollowUpType;
      status?: FollowUpStatus;
      opportunityId?: string;
      clientId?: string;
      clientName?: string;
      propertyId?: string;
      propertyTitle?: string;
    },
    currentUser?: User | null
  ): Promise<FollowUp> {
    return opportunityService.createFollowUp(data, currentUser);
  },

  async toggleStatus(id: string, currentUser?: User | null): Promise<FollowUp | null> {
    return storageService.toggleFollowUpStatus(id, currentUser);
  },

  async complete(id: string, resultNotes?: string, currentUser?: User | null): Promise<FollowUp> {
    return opportunityService.completeFollowUp(id, resultNotes, currentUser);
  },
};
