import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import path from 'path';
import { prisma } from '../db.js';
import { app } from '../index.js';

const mockPrisma = prisma as unknown as {
  garmentPhoto: {
    findMany: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };
  order: { findUnique: ReturnType<typeof vi.fn> };
};

// Mock fs.unlink so we don't try to delete real files in tests
vi.mock('fs/promises', () => ({
  default: {
    unlink: vi.fn().mockResolvedValue(undefined),
    mkdir: vi.fn().mockResolvedValue(undefined),
  },
  unlink: vi.fn().mockResolvedValue(undefined),
  mkdir: vi.fn().mockResolvedValue(undefined),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

const GARMENT_ID = 'ORD-TEST-123';

describe('GET /api/zenco/garments/:id/photos', () => {
  it('returns empty array when no photos exist', async () => {
    mockPrisma.garmentPhoto.findMany.mockResolvedValue([]);

    const res = await request(app).get(`/api/zenco/garments/${GARMENT_ID}/photos`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('returns list of photos for a garment', async () => {
    const photos = [
      { id: 'photo-1', garmentId: GARMENT_ID, filename: 'front.jpg', url: '/uploads/front.jpg', createdAt: '2026-04-05T10:00:00.000Z' },
      { id: 'photo-2', garmentId: GARMENT_ID, filename: 'back.jpg', url: '/uploads/back.jpg', createdAt: '2026-04-05T10:01:00.000Z' },
    ];
    mockPrisma.garmentPhoto.findMany.mockResolvedValue(photos);

    const res = await request(app).get(`/api/zenco/garments/${GARMENT_ID}/photos`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body[0].id).toBe('photo-1');
    expect(res.body[1].url).toBe('/uploads/back.jpg');
  });
});

describe('POST /api/zenco/garments/:id/photos', () => {
  it('rejects request with no file attached', async () => {
    const res = await request(app)
      .post(`/api/zenco/garments/${GARMENT_ID}/photos`)
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  it('accepts a valid image upload and returns photo record', async () => {
    const photo = {
      id: 'photo-new',
      garmentId: GARMENT_ID,
      filename: 'prenda.jpg',
      url: `/uploads/prenda.jpg`,
      createdAt: '2026-04-05T10:00:00.000Z',
    };
    mockPrisma.garmentPhoto.create.mockResolvedValue(photo);

    const res = await request(app)
      .post(`/api/zenco/garments/${GARMENT_ID}/photos`)
      .attach('photo', Buffer.from('fake image data'), {
        filename: 'prenda.jpg',
        contentType: 'image/jpeg',
      });

    expect(res.status).toBe(200);
    expect(res.body.id).toBe('photo-new');
    expect(res.body.garmentId).toBe(GARMENT_ID);
    expect(res.body.url).toContain('/uploads/');
  });

  it('rejects files over 5MB', async () => {
    // Create a buffer larger than 5MB
    const bigBuffer = Buffer.alloc(6 * 1024 * 1024, 'x');

    const res = await request(app)
      .post(`/api/zenco/garments/${GARMENT_ID}/photos`)
      .attach('photo', bigBuffer, {
        filename: 'big.jpg',
        contentType: 'image/jpeg',
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  it('rejects non-image file types', async () => {
    const res = await request(app)
      .post(`/api/zenco/garments/${GARMENT_ID}/photos`)
      .attach('photo', Buffer.from('not an image'), {
        filename: 'document.pdf',
        contentType: 'application/pdf',
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });
});

describe('DELETE /api/zenco/garments/:id/photos/:photoId', () => {
  it('returns 404 when photo does not exist', async () => {
    mockPrisma.garmentPhoto.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .delete(`/api/zenco/garments/${GARMENT_ID}/photos/nonexistent-id`);

    expect(res.status).toBe(404);
    expect(res.body.error).toBeDefined();
  });

  it('deletes photo and returns success', async () => {
    const photo = {
      id: 'photo-del',
      garmentId: GARMENT_ID,
      filename: 'old.jpg',
      url: '/uploads/old.jpg',
      createdAt: '2026-04-05T10:00:00.000Z',
    };
    mockPrisma.garmentPhoto.findUnique.mockResolvedValue(photo);
    mockPrisma.garmentPhoto.delete.mockResolvedValue(photo);

    const res = await request(app)
      .delete(`/api/zenco/garments/${GARMENT_ID}/photos/photo-del`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(mockPrisma.garmentPhoto.delete).toHaveBeenCalledWith({
      where: { id: 'photo-del' },
    });
  });

  it('rejects deletion of photo belonging to different garment', async () => {
    const photo = {
      id: 'photo-other',
      garmentId: 'OTHER-GARMENT',
      filename: 'other.jpg',
      url: '/uploads/other.jpg',
      createdAt: '2026-04-05T10:00:00.000Z',
    };
    mockPrisma.garmentPhoto.findUnique.mockResolvedValue(photo);

    const res = await request(app)
      .delete(`/api/zenco/garments/${GARMENT_ID}/photos/photo-other`);

    expect(res.status).toBe(404);
    expect(res.body.error).toBeDefined();
  });
});
