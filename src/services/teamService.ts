import { Team, TeamMembership, Invitation, User } from '../types';
import { storageService } from './storageService';

export const teamService = {
  async getTeam(): Promise<Team | null> {
    return storageService.getTeam();
  },

  async updateTeam(updates: Partial<Team>): Promise<Team> {
    return storageService.updateTeam(updates);
  },

  async createTeam(
    data: { name: string; city?: string; address?: string; phone?: string; licenseNumber?: string },
    managerUser: User
  ): Promise<Team> {
    return storageService.createTeam(data, managerUser);
  },

  async getMemberships(teamId?: string): Promise<TeamMembership[]> {
    return storageService.getTeamMemberships(teamId);
  },

  async getMembers(teamId: string): Promise<User[]> {
    return storageService.getTeamMembers(teamId);
  },

  async removeMember(teamId: string, memberUserId: string, managerUser: User): Promise<void> {
    return storageService.removeTeamMember(teamId, memberUserId, managerUser);
  },

  async leaveTeam(agentUser: User): Promise<User> {
    return storageService.leaveTeam(agentUser);
  },

  async getInvitations(teamId?: string): Promise<Invitation[]> {
    return storageService.getInvitations(teamId);
  },

  async sendInvitation(data: {
    managerUser: User;
    teamId: string;
    inviteeMobile: string;
    inviteeName: string;
    inviteeEmail?: string;
  }): Promise<Invitation> {
    return storageService.createInvitation(data);
  },

  async acceptInvitation(token: string, user: User): Promise<{ success: boolean; teamName: string }> {
    return storageService.acceptInvitation(token, user);
  },

  async cancelInvitation(id: string, managerUser: User): Promise<void> {
    return storageService.cancelInvitation(id, managerUser);
  },
};
