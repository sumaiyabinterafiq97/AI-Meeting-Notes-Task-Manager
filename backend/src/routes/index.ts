import { Router } from 'express';
import { authRoutes } from '../modules/auth';
import { workspaceRoutes, invitationRoutes } from '../modules/workspaces';
import { notificationRoutes } from '../modules/notifications';
import { userRoutes } from '../modules/users';
import { createCalendarOAuthRoutes } from '../modules/calendar';
import { generalApiRateLimiter } from '../middlewares';

const router = Router();

router.use(generalApiRateLimiter);

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/workspaces', workspaceRoutes);
router.use('/invitations', invitationRoutes);
router.use('/notifications', notificationRoutes);
router.use('/calendar/oauth', createCalendarOAuthRoutes());

export { router as apiV1Routes };
