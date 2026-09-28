import { Visit, Client, Property, User } from '../types';
import { storageService } from './storageService';
import { opportunityService } from './opportunityService';

export const visitService = {
  async getAll(currentUser?: User | null): Promise<Visit[]> {
    return storageService.getVisits(currentUser);
  },

  async schedule(
    params: {
      opportunityId?: string;
      client: Client;
      property: Property;
      date: string;
      time: string;
      notes?: string;
    },
    currentUser?: User | null
  ): Promise<Visit> {
    return opportunityService.scheduleVisit(params, currentUser);
  },

  async complete(
    visitId: string,
    feedback?: string,
    currentUser?: User | null
  ): Promise<Visit> {
    return opportunityService.completeVisit(visitId, feedback, currentUser);
  },
};
