import type { Request, Response, NextFunction, RequestHandler } from 'express';
import { ZodSchema, ZodError } from 'zod';

interface ValidateOptions {
  body?: ZodSchema;
  params?: ZodSchema;
  query?: ZodSchema;
}

/**
 * Generic Zod validation middleware.
 *
 * Validates and coerces req.body, req.params, req.query against provided schemas.
 * On success, mutates the request in place with the parsed (coerced) values.
 * On failure, passes a ZodError to the error handler which formats it as 400.
 *
 * Usage:
 *   router.post('/', validate({ body: createClientSchema }), handler)
 */
export function validate(schemas: ValidateOptions): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      if (schemas.body) {
        req.body = schemas.body.parse(req.body) as unknown;
      }
      if (schemas.params) {
        req.params = schemas.params.parse(req.params) as Record<string, string>;
      }
      if (schemas.query) {
        req.query = schemas.query.parse(req.query) as Record<string, string>;
      }
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        next(err);
      } else {
        next(err);
      }
    }
  };
}
