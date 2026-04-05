import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { unlink } from 'fs/promises';
import { prisma } from '../db.js';

const router = Router({ mergeParams: true });

// =============================================
// STORAGE — Save files to backend/uploads/
// =============================================

const UPLOADS_DIR = path.resolve('uploads');

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const unique = `${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    cb(null, `${unique}${ext}`);
  },
});

function fileFilter(_req: Express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) {
  const allowed = ['image/jpeg', 'image/png', 'image/webp'];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Tipo de archivo no permitido. Solo se aceptan jpg, png y webp.'));
  }
}

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter,
});

// =============================================
// GET /api/zenco/garments/:id/photos
// =============================================

router.get('/', async (req, res) => {
  try {
    const { id } = req.params;
    const photos = await prisma.garmentPhoto.findMany({
      where: { garmentId: id },
      orderBy: { createdAt: 'asc' },
    });
    res.json(photos);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener fotos' });
  }
});

// =============================================
// POST /api/zenco/garments/:id/photos
// =============================================

const uploadSingle = upload.single('photo');

router.post('/', (req, res) => {
  uploadSingle(req, res, async (err) => {
    if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
      res.status(400).json({ error: 'El archivo supera el tamaño máximo de 5MB' });
      return;
    }
    if (err) {
      res.status(400).json({ error: err.message || 'Error al subir archivo' });
      return;
    }
    if (!req.file) {
      res.status(400).json({ error: 'No se adjuntó ninguna foto' });
      return;
    }

    try {
      const { id } = req.params;
      const photo = await prisma.garmentPhoto.create({
        data: {
          garmentId: id,
          filename: req.file.filename,
          url: `/uploads/${req.file.filename}`,
        },
      });
      res.json(photo);
    } catch (error) {
      // If DB write fails, clean up the uploaded file
      if (req.file) {
        await unlink(req.file.path).catch(() => {});
      }
      res.status(500).json({ error: 'Error al guardar foto' });
    }
  });
});

// =============================================
// DELETE /api/zenco/garments/:id/photos/:photoId
// =============================================

router.delete('/:photoId', async (req, res) => {
  try {
    const { id, photoId } = req.params;

    const photo = await prisma.garmentPhoto.findUnique({
      where: { id: photoId },
    });

    if (!photo || photo.garmentId !== id) {
      res.status(404).json({ error: 'Foto no encontrada' });
      return;
    }

    await prisma.garmentPhoto.delete({ where: { id: photoId } });

    // Best-effort file deletion — don't fail if file is already gone
    const filePath = path.join(UPLOADS_DIR, photo.filename);
    await unlink(filePath).catch(() => {});

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar foto' });
  }
});

export { router as garmentPhotosRoutes };
