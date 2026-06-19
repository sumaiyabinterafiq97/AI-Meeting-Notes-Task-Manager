import { lazy } from 'react';

export const LazySearchPage = lazy(() =>
  import('@/features/search/pages/SearchPage').then((module) => ({ default: module.SearchPage })),
);

export const LazyChatPage = lazy(() =>
  import('@/features/chat/pages/ChatPage').then((module) => ({ default: module.ChatPage })),
);

export const LazyReportsListPage = lazy(() =>
  import('@/features/reports/pages/ReportsListPage').then((module) => ({
    default: module.ReportsListPage,
  })),
);

export const LazyReportDetailPage = lazy(() =>
  import('@/features/reports/pages/ReportDetailPage').then((module) => ({
    default: module.ReportDetailPage,
  })),
);

export const LazyKnowledgePage = lazy(() =>
  import('@/features/knowledge/pages/KnowledgePage').then((module) => ({
    default: module.KnowledgePage,
  })),
);

export const LazyInsightsPage = lazy(() =>
  import('@/features/insights/pages/InsightsPage').then((module) => ({
    default: module.InsightsPage,
  })),
);

export const LazyMeetingDetailPage = lazy(() =>
  import('@/features/meetings/pages/MeetingDetailPage').then((module) => ({
    default: module.MeetingDetailPage,
  })),
);
