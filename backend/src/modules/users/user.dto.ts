export interface UpdateProfileDto {
  displayName?: string;
  avatarUrl?: string | null;
}

export interface NotificationPreferencesDto {
  emailTaskAssigned: boolean;
  emailDueSoon: boolean;
  inAppMentions: boolean;
}

export interface UpdateNotificationPreferencesDto {
  emailTaskAssigned?: boolean;
  emailDueSoon?: boolean;
  inAppMentions?: boolean;
}
