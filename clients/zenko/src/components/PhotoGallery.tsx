import { useState, useEffect, useRef } from 'react';
import { Upload, X, Image } from 'lucide-react';
import { fetchGarmentPhotos, uploadGarmentPhoto, deleteGarmentPhoto, type DBGarmentPhoto } from '../services/api';
import { useToast } from './ToastContext';
import { Spinner } from './SkeletonLoader';
import { Button } from '@/components/ui/button';

import { API_BASE } from '../services/config';
const BASE_URL = API_BASE;

interface PhotoGalleryProps {
  garmentId: string;
}

export default function PhotoGallery({ garmentId }: PhotoGalleryProps) {
  const toast = useToast();
  const [photos, setPhotos] = useState<DBGarmentPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = () => {
    setLoading(true);
    fetchGarmentPhotos(garmentId)
      .then(data => { setPhotos(data); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, [garmentId]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const photo = await uploadGarmentPhoto(garmentId, file);
      setPhotos(prev => [...prev, photo]);
      toast.success('Foto subida correctamente');
    } catch {
      toast.error('Error al subir la foto');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const handleDelete = async (photoId: string) => {
    if (!confirm('¿Eliminar esta foto?')) return;
    try {
      await deleteGarmentPhoto(garmentId, photoId);
      setPhotos(prev => prev.filter(p => p.id !== photoId));
      toast.success('Foto eliminada correctamente');
    } catch {
      toast.error('Error al eliminar la foto');
    }
  };

  const getPhotoUrl = (photo: DBGarmentPhoto) => `${BASE_URL}${photo.url}`;

  if (loading) return (
    <div className="flex items-center justify-center p-4">
      <Spinner />
    </div>
  );

  return (
    <div className="border-t border-border pt-3 mt-3" data-testid="photo-gallery">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <span className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground">
          <Image className="w-4 h-4" />
          Fotos ({photos.length})
        </span>
        <Button
          asChild
          variant="outline"
          size="sm"
          className="cursor-pointer"
          disabled={uploading}
        >
          <label>
            <Upload className="w-3.5 h-3.5 mr-1" />
            {uploading ? 'Subiendo...' : 'Agregar Foto'}
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleUpload}
              disabled={uploading}
              className="hidden"
              data-testid="photo-upload-input"
            />
          </label>
        </Button>
      </div>

      {/* Empty state */}
      {photos.length === 0 ? (
        <div className="text-center py-5 text-sm text-muted-foreground">
          Sin fotos. Agrega fotos del arreglo.
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2" data-testid="photo-grid">
          {photos.map(photo => (
            <div
              key={photo.id}
              className="group relative aspect-square rounded-md overflow-hidden border border-border"
            >
              <img
                src={getPhotoUrl(photo)}
                alt={photo.filename}
                className="w-full h-full object-cover cursor-pointer transition-transform duration-200 hover:scale-105"
                onClick={() => setLightbox(getPhotoUrl(photo))}
              />
              <button
                className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 text-white border-none cursor-pointer text-base leading-none flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                onClick={() => handleDelete(photo.id)}
                aria-label={`Eliminar ${photo.filename}`}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 bg-black/85 flex items-center justify-center z-[2000] cursor-pointer"
          data-testid="photo-lightbox"
          onClick={() => setLightbox(null)}
        >
          <img
            src={lightbox}
            alt="Vista ampliada"
            className="max-w-[90vw] max-h-[90vh] rounded-md cursor-default"
            onClick={e => e.stopPropagation()}
          />
          <button
            className="absolute top-5 right-5 bg-transparent border-none text-white text-4xl cursor-pointer leading-none flex items-center justify-center"
            onClick={() => setLightbox(null)}
          >
            <X className="w-8 h-8" />
          </button>
        </div>
      )}
    </div>
  );
}
