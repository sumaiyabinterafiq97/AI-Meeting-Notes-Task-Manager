import { Request, Response, NextFunction } from 'express';
import { validationResult, ValidationChain } from 'express-validator';
import { AppError, ErrorCodes } from '../utils/errors';

export function validate(validations: ValidationChain[]) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    await Promise.all(validations.map((validation) => validation.run(req)));

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      next(
        new AppError(
          400,
          ErrorCodes.VALIDATION_ERROR,
          'Invalid request body',
          errors.array().map((e) => ({
            field: 'path' in e ? String(e.path) : 'unknown',
            message: e.msg as string,
          })),
        ),
      );
      return;
    }

    next();
  };
}
