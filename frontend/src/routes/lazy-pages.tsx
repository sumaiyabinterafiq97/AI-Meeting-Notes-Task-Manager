import { lazy } from 'react';

export const LazyMeetingDetailPage = lazy(() =>
  import('@/features/meetings/pages/MeetingDetailPage').then((module) => ({
    default: module.MeetingDetailPage,
  })),
);
