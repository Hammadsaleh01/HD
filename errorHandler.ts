import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors.ts';
import { logger } from '../utils/logger.ts';

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
) {
  // If headers are already sent, delegate to default express handler
  if (res.headersSent) {
    return next(err);
  }

  // Handle custom AppError
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
        details: err.details
      }
    });
  }

  // Handle JSON syntax parsing errors
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({
      error: {
        code: 'INVALID_JSON',
        message: 'Malformed JSON payload in request body'
      }
    });
  }

  // Handle Payload Too Large
  if (err.type === 'entity.too.large') {
    return res.status(413).json({
      error: {
        code: 'PAYLOAD_TOO_LARGE',
        message: 'Request payload exceeds 1MB size limit'
      }
    });
  }

  // Unexpected internal errors
  logger.error(`[Unhandled Server Error] ${req.method} ${req.url}:`, err);

  return res.status(500).json({
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected internal error occurred. Please try again later.'
    }
  });
}
