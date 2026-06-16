import { prisma } from '../../src/config/database';

export async function connectTestDatabase(): Promise<void> {
  await prisma.$connect();
}

export async function disconnectTestDatabase(): Promise<void> {
  await prisma.$disconnect();
}

export async function cleanDatabase(): Promise<void> {
  await prisma.$transaction([
    prisma.passwordResetToken.deleteMany(),
    prisma.refreshToken.deleteMany(),
    prisma.notificationPreference.deleteMany(),
    prisma.workspaceInvitation.deleteMany(),
    prisma.actionItemSuggestion.deleteMany(),
    prisma.aiProcessingJob.deleteMany(),
    prisma.meetingAiOutput.deleteMany(),
    prisma.meetingTranscript.deleteMany(),
    prisma.activityLog.deleteMany(),
    prisma.notification.deleteMany(),
    prisma.comment.deleteMany(),
    prisma.taskStatusHistory.deleteMany(),
    prisma.task.deleteMany(),
    prisma.meeting.deleteMany(),
    prisma.workspaceMember.deleteMany(),
    prisma.workspace.deleteMany(),
    prisma.user.deleteMany(),
  ]);
}
