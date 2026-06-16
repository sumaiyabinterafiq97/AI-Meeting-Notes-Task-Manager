import { body } from 'express-validator';

const passwordRules = body('password')
  .isLength({ min: 8 })
  .withMessage('Password must be at least 8 characters')
  .matches(/[a-zA-Z]/)
  .withMessage('Password must contain at least one letter')
  .matches(/[0-9]/)
  .withMessage('Password must contain at least one number');

export const registerValidation = [
  body('email').isEmail().withMessage('Invalid email format').normalizeEmail(),
  passwordRules,
  body('displayName')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Display name must be between 2 and 100 characters'),
];

export const loginValidation = [
  body('email').isEmail().withMessage('Invalid email format').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required'),
];

export const forgotPasswordValidation = [
  body('email').isEmail().withMessage('Invalid email format').normalizeEmail(),
];

export const resetPasswordValidation = [
  body('token').notEmpty().withMessage('Reset token is required'),
  passwordRules,
];
