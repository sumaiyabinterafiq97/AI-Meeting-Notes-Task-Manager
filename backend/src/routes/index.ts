import { Router } from 'express';
import { authRoutes } from '../modules/auth';

const router = Router();

router.use('/auth', authRoutes);

export { router as apiV1Routes };
