import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Camera, FlipHorizontal, X } from 'lucide-react';

interface CameraCaptureProps {
  onCapture: (file: File) => void;
  onClose: () => void;
}

export default function CameraCapture({ onCapture, onClose }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [error, setError] = useState<string | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startCamera = async (facing: 'environment' | 'user') => {
    // Detener stream anterior si existe
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: facing } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setError(null);
    } catch {
      setError('No se pudo acceder a la cámara');
    }
  };

  useEffect(() => {
    startCamera(facingMode);
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleFlip = async () => {
    const next = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(next);
    await startCamera(next);
  };

  const capture = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    canvas.getContext('2d')!.drawImage(videoRef.current, 0, 0);
    canvas.toBlob(blob => {
      if (blob) {
        onCapture(new File([blob], `foto-${Date.now()}.jpg`, { type: 'image/jpeg' }));
      }
    }, 'image/jpeg', 0.85);
  };

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-3">
      {error ? (
        <div className="flex flex-col items-center gap-3 py-6 text-center text-sm text-destructive">
          <p>{error}</p>
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Cerrar
          </Button>
        </div>
      ) : (
        <>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full rounded-md bg-black"
            style={{ maxHeight: '260px', objectFit: 'cover' }}
          />
          <div className="flex gap-2 justify-center">
            <Button type="button" variant="outline" size="sm" onClick={onClose} aria-label="Cerrar cámara">
              <X className="h-4 w-4" />
              Cerrar
            </Button>
            <Button type="button" size="sm" onClick={capture} aria-label="Capturar foto">
              <Camera className="h-4 w-4" />
              Capturar
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={handleFlip} aria-label="Cambiar cámara">
              <FlipHorizontal className="h-4 w-4" />
              Voltear
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
