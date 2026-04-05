import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import {
  AppError,
  NotFoundError,
  ValidationError,
  DatabaseError,
  errorHandler,
  requestLogger,
} from '../middleware/errorHandler.js';

// Helper to create minimal mock Request/Response/NextFunction
function makeMocks() {
  const req = {
    method: 'GET',
    path: '/test',
  } as unknown as Request;

  const json = vi.fn();
  const status = vi.fn().mockReturnThis();
  const res = {
    status,
    json,
    statusCode: 200,
    on: vi.fn(),
  } as unknown as Response;

  const next = vi.fn() as unknown as NextFunction;

  return { req, res, next, json, status };
}

// --- Error Classes ---

describe('AppError', () => {
  it('creates with message and statusCode', () => {
    const err = new AppError('Something went wrong', 422);
    expect(err.message).toBe('Something went wrong');
    expect(err.statusCode).toBe(422);
    expect(err.isOperational).toBe(true);
    expect(err).toBeInstanceOf(Error);
  });

  it('defaults to statusCode 500', () => {
    const err = new AppError('oops');
    expect(err.statusCode).toBe(500);
  });

  it('has a stack trace', () => {
    const err = new AppError('err');
    expect(err.stack).toBeTruthy();
  });
});

describe('NotFoundError', () => {
  it('has statusCode 404', () => {
    const err = new NotFoundError('Record not found');
    expect(err.statusCode).toBe(404);
    expect(err.message).toBe('Record not found');
    expect(err).toBeInstanceOf(AppError);
  });

  it('defaults message when none provided', () => {
    const err = new NotFoundError();
    expect(err.statusCode).toBe(404);
    expect(err.message).toBeTruthy();
  });
});

describe('ValidationError', () => {
  it('has statusCode 400', () => {
    const err = new ValidationError('Invalid input');
    expect(err.statusCode).toBe(400);
    expect(err.message).toBe('Invalid input');
    expect(err).toBeInstanceOf(AppError);
  });
});

describe('DatabaseError', () => {
  it('has statusCode 500 and isOperational false', () => {
    const err = new DatabaseError('Connection failed');
    expect(err.statusCode).toBe(500);
    expect(err.isOperational).toBe(false);
    expect(err).toBeInstanceOf(AppError);
  });
});

// --- errorHandler middleware ---

describe('errorHandler middleware', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    delete process.env.NODE_ENV;
  });

  it('returns operational error details in dev mode', () => {
    process.env.NODE_ENV = 'development';
    const { req, res, next, status, json } = makeMocks();
    const err = new NotFoundError('Garment not found');

    errorHandler(err, req, res, next);

    expect(status).toHaveBeenCalledWith(404);
    expect(json).toHaveBeenCalledWith(expect.objectContaining({
      error: 'Garment not found',
      statusCode: 404,
      stack: expect.any(String),
    }));
  });

  it('returns generic message in prod mode for operational errors', () => {
    process.env.NODE_ENV = 'production';
    const { req, res, next, status, json } = makeMocks();
    const err = new NotFoundError('Garment not found');

    errorHandler(err, req, res, next);

    expect(status).toHaveBeenCalledWith(404);
    const body = json.mock.calls[0][0];
    expect(body.error).toBe('Garment not found');
    expect(body.stack).toBeUndefined();
  });

  it('hides details for non-operational errors in prod', () => {
    process.env.NODE_ENV = 'production';
    const { req, res, next, status, json } = makeMocks();
    const err = new DatabaseError('Connection pool exhausted');

    errorHandler(err, req, res, next);

    expect(status).toHaveBeenCalledWith(500);
    const body = json.mock.calls[0][0];
    expect(body.error).toBe('Internal server error');
    expect(body.stack).toBeUndefined();
  });

  it('logs full error in prod mode', () => {
    process.env.NODE_ENV = 'production';
    const { req, res, next } = makeMocks();
    const err = new AppError('test error');

    errorHandler(err, req, res, next);

    expect(consoleSpy).toHaveBeenCalled();
  });

  it('handles plain Error (non-AppError) as 500', () => {
    process.env.NODE_ENV = 'development';
    const { req, res, next, status, json } = makeMocks();
    const err = new Error('unexpected crash');

    errorHandler(err, req, res, next);

    expect(status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith(expect.objectContaining({
      error: 'unexpected crash',
    }));
  });
});

// --- requestLogger middleware ---

describe('requestLogger middleware', () => {
  it('calls next()', () => {
    const { req, res, next } = makeMocks();
    requestLogger(req, res, next);
    expect(next).toHaveBeenCalledOnce();
  });

  it('attaches finish listener on response', () => {
    const { req, res, next } = makeMocks();
    requestLogger(req, res, next);
    expect((res.on as ReturnType<typeof vi.fn>)).toHaveBeenCalledWith('finish', expect.any(Function));
  });
});
