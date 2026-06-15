import { Router } from 'express';
import { authController } from './auth.controller';
import { registerValidation, loginValidation } from './auth.validator';
import { validate, authenticate } from '../../middlewares';

const router = Router();

router.post('/register', validate(registerValidation), (req, res, next) =>
  authController.register(req, res, next),
);

router.post('/login', validate(loginValidation), (req, res, next) =>
  authController.login(req, res, next),
);

router.post('/logout', authenticate, (req, res, next) => authController.logout(req, res, next));

export { router as authRoutes };
