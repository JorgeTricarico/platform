import { useState, useEffect, useRef, useCallback } from 'react';
import jsQR from 'jsqr';
import { QrCode, Camera, CameraOff, Package, Truck, CheckCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { fetchGarments, updateGarment } from '../services/api';
import type { DBGarment } from '../services/api';
import { useToast } from '../components/ToastContext';

type ScanMode = 'en_proceso' | 'listo' | 'entregado';

interface ScanResult {
  garment: DBGarment;
  appliedStatus: ScanMode;
  remaining: number;
}

const MODE_CONFIG: Record<ScanMode, { label: string; color: string; active: string; icon: typeof Package }> = {
  en_proceso: {
    label: 'En Proceso',
    color: 'border-blue-500 text-blue-600 dark:text-blue-400',
    active: 'bg-blue-500 text-white border-blue-500',
    icon: Package,
  },
  listo: {
    label: 'Listo para Entregar',
    color: 'border-yellow-500 text-yellow-600 dark:text-yellow-400',
    active: 'bg-yellow-500 text-white border-yellow-500',
    icon: Truck,
  },
  entregado: {
    label: 'Entregado',
    color: 'border-green-500 text-green-600 dark:text-green-400',
    active: 'bg-green-500 text-white border-green-500',
    icon: CheckCheck,
  },
};

function beep() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 1900;
    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.12);
  } catch {
    // silently fail if AudioContext unavailable
  }
}

function parseOrderNumber(qrData: string): number | null {
  // Format from generateTicket.ts: /?view=status&order=123
  const urlMatch = qrData.match(/[?&]order=(\d+)/);
  if (urlMatch) return parseInt(urlMatch[1], 10);
  // Also accept plain number
  const num = parseInt(qrData, 10);
  if (!isNaN(num) && num > 0) return num;
  return null;
}

export default function QRScanner() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const cooldownRef = useRef(false);
  const modeRef = useRef<ScanMode>('listo');
  const garmentsRef = useRef<DBGarment[]>([]);
  const processingRef = useRef(false);

  const [mode, setMode] = useState<ScanMode>('listo');
  const [scanning, setScanning] = useState(false);
  const [scanLine, setScanLine] = useState(0);
  const [scanDir] = useState(1);
  const [lastResult, setLastResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string>('');
  const toast = useToast();

  // keep refs in sync
  useEffect(() => { modeRef.current = mode; }, [mode]);

  // load garments once
  useEffect(() => {
    fetchGarments()
      .then(g => { garmentsRef.current = g; })
      .catch(() => {});
  }, []);

  // scan line animation
  useEffect(() => {
    if (!scanning) return;
    let y = 0;
    let dir = 1;
    let frameId: number;
    const tick = () => {
      y += dir * 1.2;
      if (y >= 98) dir = -1;
      if (y <= 2) dir = 1;
      setScanLine(y);
      frameId = requestAnimationFrame(tick);
    };
    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [scanning]);
  void scanDir; // suppress unused warning

  const handleScan = useCallback(async (qrData: string) => {
    if (cooldownRef.current || processingRef.current) return;
    const orderNumber = parseOrderNumber(qrData);
    if (!orderNumber) return;

    const garment = garmentsRef.current.find(g => g.orderNumber === orderNumber);
    if (!garment) {
      toast.error(`Orden #${orderNumber} no encontrada`);
      cooldownRef.current = true;
      setTimeout(() => { cooldownRef.current = false; }, 2000);
      return;
    }

    processingRef.current = true;
    const targetStatus = modeRef.current;

    try {
      beep();
      await updateGarment(garment.id, { status: targetStatus });

      // refresh local cache
      garmentsRef.current = garmentsRef.current.map(g =>
        g.id === garment.id ? { ...g, status: targetStatus } : g
      );

      const remaining = (garment.price ?? 0) - (garment.deposit ?? 0);

      setLastResult({
        garment: { ...garment, status: targetStatus },
        appliedStatus: targetStatus,
        remaining: targetStatus === 'entregado' ? Math.max(0, remaining) : 0,
      });

      const label = MODE_CONFIG[targetStatus].label;
      toast.success(`ORD-${String(garment.orderNumber).padStart(6, '0')} → ${label}`);
    } catch {
      toast.error('Error al actualizar el estado');
    } finally {
      processingRef.current = false;
      cooldownRef.current = true;
      setTimeout(() => { cooldownRef.current = false; }, 1800);
    }
  }, [toast]);

  const startScanLoop = useCallback(() => {
    const scan = () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || video.readyState < video.HAVE_ENOUGH_DATA) {
        animRef.current = requestAnimationFrame(scan);
        return;
      }
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return;
      ctx.drawImage(video, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: 'dontInvert',
      });
      if (code?.data) {
        handleScan(code.data);
      }
      animRef.current = requestAnimationFrame(scan);
    };
    animRef.current = requestAnimationFrame(scan);
  }, [handleScan]);

  const startCamera = useCallback(async () => {
    setError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setScanning(true);
        startScanLoop();
      }
    } catch (err) {
      const msg = err instanceof Error && err.name === 'NotAllowedError'
        ? 'Permiso de cámara denegado. Habilitalo en la configuración del navegador.'
        : 'No se pudo acceder a la cámara.';
      setError(msg);
    }
  }, [startScanLoop]);

  const stopCamera = useCallback(() => {
    if (videoRef.current?.srcObject) {
      (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
      videoRef.current.srcObject = null;
    }
    cancelAnimationFrame(animRef.current);
    setScanning(false);
  }, []);

  // cleanup on unmount
  useEffect(() => () => {
    stopCamera();
  }, [stopCamera]);

  const ordFmt = (n: number) => `ORD-${String(n).padStart(6, '0')}`;
  const priceFmt = (n: number) => `$${n.toLocaleString('es-AR')}`;

  return (
    <div className="max-w-lg mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-primary/10">
          <QrCode className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">Escáner QR</h1>
          <p className="text-sm text-muted-foreground">Leé el cupón y cambiá el estado</p>
        </div>
      </div>

      {/* Mode selector */}
      <div className="grid grid-cols-3 gap-2">
        {(Object.entries(MODE_CONFIG) as [ScanMode, typeof MODE_CONFIG[ScanMode]][]).map(([key, cfg]) => {
          const Icon = cfg.icon;
          const isActive = mode === key;
          return (
            <button
              key={key}
              onClick={() => setMode(key)}
              className={cn(
                'flex flex-col items-center gap-1.5 px-2 py-3 rounded-xl border-2 text-xs font-semibold transition-all duration-150',
                isActive ? cfg.active : `border-border bg-card ${cfg.color} hover:border-current`
              )}
            >
              <Icon className="w-5 h-5" />
              <span className="text-center leading-tight">{cfg.label}</span>
            </button>
          );
        })}
      </div>

      {/* Camera viewport */}
      <div className="relative rounded-2xl overflow-hidden bg-black aspect-[4/3] border border-border shadow-lg">
        <video
          ref={videoRef}
          className="absolute inset-0 w-full h-full object-cover"
          playsInline
          muted
        />

        {/* Scanning overlay */}
        {scanning && (
          <div className="absolute inset-0 pointer-events-none">
            {/* Corner brackets */}
            <div className="absolute inset-[15%]">
              {/* TL */}
              <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-primary rounded-tl-sm" />
              {/* TR */}
              <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-primary rounded-tr-sm" />
              {/* BL */}
              <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-primary rounded-bl-sm" />
              {/* BR */}
              <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-primary rounded-br-sm" />

              {/* Scan line */}
              <div
                className="absolute left-0 right-0 h-0.5 transition-none"
                style={{
                  top: `${scanLine}%`,
                  background: 'linear-gradient(90deg, transparent, hsl(var(--primary)), transparent)',
                  boxShadow: '0 0 8px 2px hsl(var(--primary) / 0.6)',
                }}
              />
            </div>

            {/* Darkened outer area */}
            <div className="absolute inset-0 bg-black/30" style={{ WebkitMaskImage: 'none' }} />
          </div>
        )}

        {/* Placeholder when not scanning */}
        {!scanning && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-muted/80">
            <Camera className="w-12 h-12 text-muted-foreground" />
            <p className="text-sm text-muted-foreground font-medium">Cámara inactiva</p>
          </div>
        )}
      </div>

      {/* Hidden canvas for jsQR */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Camera toggle button */}
      <Button
        onClick={scanning ? stopCamera : startCamera}
        variant={scanning ? 'outline' : 'default'}
        className="w-full gap-2"
        size="lg"
      >
        {scanning ? (
          <><CameraOff className="w-5 h-5" /> Detener cámara</>
        ) : (
          <><Camera className="w-5 h-5" /> Activar cámara</>
        )}
      </Button>

      {/* Error */}
      {error && (
        <div className="rounded-xl bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Scan result card */}
      {lastResult && (
        <div className={cn(
          'rounded-xl border-2 p-4 space-y-2 transition-all',
          lastResult.appliedStatus === 'entregado' ? 'border-green-500/40 bg-green-500/5' :
          lastResult.appliedStatus === 'listo' ? 'border-yellow-500/40 bg-yellow-500/5' :
          'border-blue-500/40 bg-blue-500/5'
        )}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Último escaneado
            </span>
            <span className={cn(
              'text-xs font-bold px-2 py-0.5 rounded-full',
              lastResult.appliedStatus === 'entregado' ? 'bg-green-500 text-white' :
              lastResult.appliedStatus === 'listo' ? 'bg-yellow-500 text-white' :
              'bg-blue-500 text-white'
            )}>
              {MODE_CONFIG[lastResult.appliedStatus].label}
            </span>
          </div>

          <div>
            <p className="font-bold text-foreground">
              {ordFmt(lastResult.garment.orderNumber)} — {lastResult.garment.clientName}
            </p>
            <p className="text-sm text-muted-foreground">
              {lastResult.garment.garmentName} · {lastResult.garment.repairType}
            </p>
          </div>

          {lastResult.appliedStatus === 'entregado' && (
            <div className="pt-1 border-t border-border space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total</span>
                <span className="font-medium">{priceFmt(lastResult.garment.price)}</span>
              </div>
              {(lastResult.garment.deposit ?? 0) > 0 && (
                <div className="flex justify-between text-green-600 dark:text-green-400">
                  <span>Seña abonada</span>
                  <span>− {priceFmt(lastResult.garment.deposit ?? 0)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-foreground text-base pt-1 border-t border-border">
                <span>A cobrar</span>
                <span>{priceFmt(lastResult.remaining)}</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
