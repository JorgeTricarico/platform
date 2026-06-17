import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../index.js';

describe('CORS Configuration', () => {
  const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:5174',
    'https://zenko-app.onrender.com',
    'https://damian-app.onrender.com',
  ];

  it('should allow requests with no origin (mobile apps, curl, etc.)', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    // When no origin is provided, Access-Control-Allow-Origin is typically not set or set to *
    // depending on the cors configuration, but here it should just work.
  });

  it('should allow requests from allowed origins', async () => {
    for (const origin of allowedOrigins) {
      const res = await request(app)
        .get('/health')
        .set('Origin', origin);

      expect(res.status).toBe(200);
      expect(res.header['access-control-allow-origin']).toBe(origin);
    }
  });

  it('should block requests from unauthorized origins', async () => {
    const unauthorizedOrigin = 'https://malicious-site.com';
    const res = await request(app)
      .get('/health')
      .set('Origin', unauthorizedOrigin);

    // With current vulnerable configuration, this will likely return 200 and reflect the origin
    // or at least not block it.
    // If it's blocked by the cors middleware callback returning an error,
    // express usually returns a 500 or the error handler kicks in.

    // We want it to NOT have the access-control-allow-origin header set to the unauthorized origin
    // or to return an error status.
    expect(res.header['access-control-allow-origin']).not.toBe(unauthorizedOrigin);
  });
});
