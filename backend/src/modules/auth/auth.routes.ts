import { Router } from 'express';
import { authController } from './auth.controller';
import {
  registerValidation,
  loginValidation,
  forgotPasswordValidation,
  resetPasswordValidation,
} from './auth.validator';
import { validate, authenticate } from '../../middlewares';
import {
  authRateLimiter,
  forgotPasswordRateLimiter,
  validateRefreshOrigin,
} from '../../middlewares/rate-limit';

const router = Router();

router.post(
  '/register',
  authRateLimiter,
  validate(registerValidation),
  (req, res, next) => authController.register(req, res, next),
);

router.post(
  '/login',
  authRateLimiter,
  validate(loginValidation),
  (req, res, next) => authController.login(req, res, next),
);

router.post('/logout', authenticate, (req, res, next) => authController.logout(req, res, next));

router.post(
  '/refresh',
  validateRefreshOrigin,
  (req, res, next) => authController.refresh(req, res, next),
);

router.post(
  '/forgot-password',
  forgotPasswordRateLimiter,
  validate(forgotPasswordValidation),
  (req, res, next) => authController.forgotPassword(req, res, next),
);

router.post(
  '/reset-password',
  validate(resetPasswordValidation),
  (req, res, next) => authController.resetPassword(req, res, next),
);

router.get('/me', authenticate, (req, res, next) => authController.me(req, res, next));

export { router as authRoutes };
