import { useState, useEffect, useRef } from 'react';
import { fetchGarmentPhotos, uploadGarmentPhoto, deleteGarmentPhoto, type DBGarmentPhoto } from '../services/api';

const BASE_URL = import.meta.env.VITE_API_URL?.replace('/api/zenco', '') || 'http://localhost:3000';

interface PhotoGalleryProps {
  garmentId: string;
}

export default function PhotoGallery({ garmentId }: PhotoGalleryProps) {
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
    } catch {
      alert('Error al subir la foto');
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
    } catch {
      alert('Error al eliminar la foto');
    }
  };

  const getPhotoUrl = (photo: DBGarmentPhoto) => `${BASE_URL}${photo.url}`;

  if (loading) return <div style={{ padding: '12px 0', color: 'var(--text-secondary)', fontSize: '14px' }}>Cargando fotos...</div>;

  return (
    <div className="photo-gallery" data-testid="photo-gallery">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <span style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-secondary)' }}>
          Fotos ({photos.length})
        </span>
        <label className="btn" style={{ padding: '6px 14px', fontSize: '13px', backgroundColor: 'var(--surface-secondary)', border: '1px solid var(--border-color)', cursor: 'pointer' }}>
          {uploading ? 'Subiendo...' : '+ Agregar Foto'}
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleUpload}
            disabled={uploading}
            style={{ display: 'none' }}
            data-testid="photo-upload-input"
          />
        </label>
      </div>

      {photos.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text-secondary)', fontSize: '13px' }}>
          Sin fotos. Agrega fotos del arreglo.
        </div>
      ) : (
        <div className="photo-grid" data-testid="photo-grid">
          {photos.map(photo => (
            <div key={photo.id} className="photo-thumb">
              <img
                src={getPhotoUrl(photo)}
                alt={photo.filename}
                onClick={() => setLightbox(getPhotoUrl(photo))}
              />
              <button
                className="photo-delete-btn"
                onClick={() => handleDelete(photo.id)}
                aria-label={`Eliminar ${photo.filename}`}
              >
                &times;
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div
          className="photo-lightbox"
          data-testid="photo-lightbox"
          onClick={() => setLightbox(null)}
        >
          <img src={lightbox} alt="Vista ampliada" onClick={e => e.stopPropagation()} />
          <button className="photo-lightbox-close" onClick={() => setLightbox(null)}>&times;</button>
        </div>
      )}
    </div>
  );
}
