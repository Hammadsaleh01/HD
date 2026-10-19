import { Request, Response, NextFunction } from 'express';
import { z, ZodError } from 'zod';
import { AppError } from '../utils/errors.ts';

export function validateBody(schema: z.ZodTypeAny) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        const issues = err.issues.map(i => ({
          field: i.path.join('.'),
          message: i.message
        }));
        const primaryMessage = issues[0]?.field 
          ? `${issues[0].field}: ${issues[0].message}`
          : (issues[0]?.message || 'Invalid input data');
        return next(AppError.badRequest(primaryMessage, 'VALIDATION_ERROR', issues));
      }
      next(err);
    }
  };
}

export function validateQuery(schema: z.ZodTypeAny) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.query = schema.parse(req.query) as any;
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        const issues = err.issues.map(i => ({
          field: i.path.join('.'),
          message: i.message
        }));
        const primaryMessage = issues[0]?.field 
          ? `${issues[0].field}: ${issues[0].message}`
          : (issues[0]?.message || 'Invalid query parameters');
        return next(AppError.badRequest(primaryMessage, 'QUERY_VALIDATION_ERROR', issues));
      }
      next(err);
    }
  };
}
