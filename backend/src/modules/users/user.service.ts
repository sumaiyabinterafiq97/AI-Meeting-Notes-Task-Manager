import {
  NotificationPreferencesDto,
  UpdateNotificationPreferencesDto,
  UpdateProfileDto,
} from './user.dto';
import { userRepository } from './user.repository';
import { authRepository } from '../auth/auth.repository';
import { AuthUserDto } from '../auth/auth.dto';
import { AppError, ErrorCodes } from '../../utils/errors';

function toAuthUser(user: {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  createdAt: Date;
}): AuthUserDto {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
    createdAt: user.createdAt,
  };
}

const DEFAULT_PREFERENCES: NotificationPreferencesDto = {
  emailTaskAssigned: true,
  emailDueSoon: true,
  inAppMentions: true,
};

function toPreferencesDto(prefs: {
  emailTaskAssigned: boolean;
  emailDueSoon: boolean;
  inAppMentions: boolean;
}): NotificationPreferencesDto {
  return {
    emailTaskAssigned: prefs.emailTaskAssigned,
    emailDueSoon: prefs.emailDueSoon,
    inAppMentions: prefs.inAppMentions,
  };
}

export class UserService {
  async updateProfile(userId: string, data: UpdateProfileDto): Promise<AuthUserDto> {
    const user = await authRepository.findUserById(userId);
    if (!user) {
      throw new AppError(404, ErrorCodes.NOT_FOUND, 'User not found');
    }

    const updated = await userRepository.updateProfile(userId, data);
    return toAuthUser(updated);
  }

  async getNotificationPreferences(userId: string): Promise<NotificationPreferencesDto> {
    const prefs = await userRepository.findNotificationPreferences(userId);
    return prefs ? toPreferencesDto(prefs) : DEFAULT_PREFERENCES;
  }

  async updateNotificationPreferences(
    userId: string,
    data: UpdateNotificationPreferencesDto,
  ): Promise<NotificationPreferencesDto> {
    const user = await authRepository.findUserById(userId);
    if (!user) {
      throw new AppError(404, ErrorCodes.NOT_FOUND, 'User not found');
    }

    const updated = await userRepository.upsertNotificationPreferences(userId, data);
    return toPreferencesDto(updated);
  }
}

export const userService = new UserService();
