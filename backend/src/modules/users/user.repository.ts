import { prisma } from '../../config/database';
import { UpdateProfileDto } from './user.dto';

export class UserRepository {
  async updateProfile(userId: string, data: UpdateProfileDto) {
    return prisma.user.update({
      where: { id: userId },
      data: {
        ...(data.displayName !== undefined && { displayName: data.displayName.trim() }),
        ...(data.avatarUrl !== undefined && { avatarUrl: data.avatarUrl }),
      },
    });
  }

  async findNotificationPreferences(userId: string) {
    return prisma.notificationPreference.findUnique({
      where: { userId },
    });
  }

  async upsertNotificationPreferences(
    userId: string,
    data: {
      emailTaskAssigned?: boolean;
      emailDueSoon?: boolean;
      inAppMentions?: boolean;
    },
  ) {
    return prisma.notificationPreference.upsert({
      where: { userId },
      create: {
        userId,
        emailTaskAssigned: data.emailTaskAssigned ?? true,
        emailDueSoon: data.emailDueSoon ?? true,
        inAppMentions: data.inAppMentions ?? true,
      },
      update: data,
    });
  }
}

export const userRepository = new UserRepository();
