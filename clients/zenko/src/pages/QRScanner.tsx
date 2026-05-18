import { useState, useEffect, useRef, useCallback } from 'react';
import jsQR from 'jsqr';
import { QrCode, Camera, Package, Truck, CheckCheck, FlipHorizontal2, X, Undo2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { whatsappLinkProps } from '../lib/phone';
import { fetchGarments, updateGarmentStatus } from '../services/api';
import type { DBGarment } from '../services/api';
import { useToast } from '../components/ToastContext';
import { BUSINESS } from '../config/business';

type ScanMode = 'en_proceso' | 'listo' | 'entregado';

interface ScanResult {
  garment: DBGarment;
  appliedStatus: ScanMode;
  remaining: number;
  alreadyEntregado: boolean;
  unchanged?: boolean;
  messageMode?: 'long' | 'short';
}

// Prenda que paso a 'listo' en esta sesion y aun no fue avisada por WhatsApp.
// Se acumula en un panel lateral para que Ana las despache una por una.
interface PendingNotification {
  id: string;
  garmentId: string;
  orderNumber: number;
  clientName: string;
  clientPhone: string;
  itemNames: string[];
  messageMode: 'long' | 'short';
  addedAt: number;
}

// Entrada del historial de escaneos de la sesion. Guarda previousStatus
// para poder revertir via undo dentro de los 60s siguientes al scan.
interface HistoryEntry {
  id: string;
  orderNumber: number;
  clientName: string;
  itemSummary: string;
  garmentId: string;
  appliedStatus: ScanMode;
  previousStatus: string;
  timestamp: number;
}

const UNDO_WINDOW_MS = 60_000;
const HISTORY_MAX = 10;

const MODE_CONFIG: Record<ScanMode, { label: string; color: string; active: string; bg: string; icon: typeof Package }> = {
  en_proceso: {
    label: 'En Proceso',
    color: 'border-blue-500 text-blue-600 dark:text-blue-400',
    active: 'bg-blue-500 text-white border-blue-500',
    bg: 'bg-blue-500',
    icon: Package,
  },
  listo: {
    label: 'Listo para Entregar',
    color: 'border-yellow-500 text-yellow-600 dark:text-yellow-400',
    active: 'bg-yellow-500 text-white border-yellow-500',
    bg: 'bg-yellow-500',
    icon: Truck,
  },
  entregado: {
    label: 'Entregado',
    color: 'border-green-500 text-green-600 dark:text-green-400',
    active: 'bg-green-500 text-white border-green-500',
    bg: 'bg-green-500',
    icon: CheckCheck,
  },
};

function beep(success = true) {
  try {
    const ctx = new AudioContext();
    const gain = ctx.createGain();
    gain.connect(ctx.destination);

    if (success) {
      // Double beep — like a real barcode gun confirming a scan
      [0, 0.18].forEach((offset) => {
        const osc = ctx.createOscillator();
        osc.connect(gain);
        osc.frequency.value = 1900;
        gain.gain.setValueAtTime(0.5, ctx.currentTime + offset);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + offset + 0.14);
        osc.start(ctx.currentTime + offset);
        osc.stop(ctx.currentTime + offset + 0.14);
      });
    } else {
      // Low error tone
      const osc = ctx.createOscillator();
      osc.connect(gain);
      osc.frequency.value = 400;
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.3);
    }
  } catch {
    // silently fail if AudioContext unavailable
  }
}

function parseOrderNumber(qrData: string): number | null {
  const urlMatch = qrData.match(/[?&]order=(\d+)/);
  if (urlMatch) return parseInt(urlMatch[1], 10);
  const num = parseInt(qrData, 10);
  if (!isNaN(num) && num > 0) return num;
  return null;
}

const ALERT_DURATION = 4000; // ms before auto-dismiss

export default function QRScanner() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const cooldownRef = useRef(false);
  const modeRef = useRef<ScanMode>('listo');
  const garmentsRef = useRef<DBGarment[]>([]);
  const processingRef = useRef(false);
  const alertTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [mode, setMode] = useState<ScanMode>('listo');
  const [scanning, setScanning] = useState(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [scanLine, setScanLine] = useState(0);
  const [scanDir] = useState(1);
  const [alert, setAlert] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string>('');
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  // Cola de prendas listas esperando que Ana las avise por WhatsApp.
  // Se llena automaticamente cuando una prenda pasa a 'listo' en esta sesion,
  // y se vacia cuando Ana clickea "Avisar" en el panel lateral.
  const [pendingNotifications, setPendingNotifications] = useState<PendingNotification[]>([]);
  // `now` se actualiza cada 5s para que la ventana de undo (60s) se invalide
  // visualmente sin esperar a que el user interactue.
  const [now, setNow] = useState(() => Date.now());
  const toast = useToast();

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 5000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => { modeRef.current = mode; }, [mode]);

  useEffect(() => {
    fetchGarments()
      .then(g => { garmentsRef.current = g; })
      .catch(() => {});
  }, []);

  // Auto-start camera on mount
  useEffect(() => {
    startCamera('environment');
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
  void scanDir;

  const dismissAlert = useCallback(() => {
    if (alertTimerRef.current) clearTimeout(alertTimerRef.current);
    setAlert(null);
    cooldownRef.current = false;
  }, []);

  const showAlert = useCallback((result: ScanResult) => {
    setAlert(result);
    if (alertTimerRef.current) clearTimeout(alertTimerRef.current);
    alertTimerRef.current = setTimeout(dismissAlert, ALERT_DURATION);
  }, [dismissAlert]);

  const handleScan = useCallback(async (qrData: string) => {
    if (cooldownRef.current || processingRef.current) return;
    const orderNumber = parseOrderNumber(qrData);
    if (!orderNumber) return;

    const garment = garmentsRef.current.find(g => g.orderNumber === orderNumber);
    if (!garment) {
      beep(false);
      toast.error(`Orden #${orderNumber} no encontrada`);
      cooldownRef.current = true;
      setTimeout(() => { cooldownRef.current = false; }, 2500);
      return;
    }

    processingRef.current = true;
    cooldownRef.current = true;
    const targetStatus = modeRef.current;
    const previousStatus = garment.status;
    const alreadyEntregado = garment.status === 'entregado' && targetStatus === 'entregado';

    try {
      const updated = await updateGarmentStatus(garment.id, targetStatus);

      // Si el backend indica que no hubo cambio (re-scan al mismo estado),
      // mostrar alert amarillo informativo y no agregar al historial.
      if (updated.unchanged) {
        beep(true);
        showAlert({
          garment,
          appliedStatus: targetStatus,
          remaining: 0,
          alreadyEntregado: targetStatus === 'entregado',
          unchanged: true,
        });
        return;
      }

      const fresh: DBGarment = {
        ...garment,
        ...updated,
        items: updated.items ?? garment.items ?? [],
        deposit: Number(updated.deposit ?? garment.deposit ?? 0),
        status: targetStatus,
      };

      // Si pasó a 'listo' la sumamos a la cola "pendientes de avisar".
      if (targetStatus === 'listo' && previousStatus !== 'listo') {
        const itemNames = (fresh.items ?? []).map(i => i.garmentName);
        setPendingNotifications(prev => {
          // Evitar duplicados si por algun motivo se escanea 2 veces.
          if (prev.some(p => p.garmentId === fresh.id)) return prev;
          return [
            {
              id: `pend-${fresh.id}-${Date.now()}`,
              garmentId: fresh.id,
              orderNumber: fresh.orderNumber,
              clientName: fresh.clientName,
              clientPhone: fresh.clientPhone,
              itemNames,
              messageMode: updated.messageMode ?? 'long',
              addedAt: Date.now(),
            },
            ...prev,
          ];
        });
      }

      garmentsRef.current = garmentsRef.current.map(g =>
        g.id === garment.id ? fresh : g
      );

      const freshTotal = (fresh.items ?? []).reduce((s, i) => s + i.price, 0);
      const remaining = freshTotal - (fresh.deposit ?? 0);

      // Sumar al historial (mas reciente primero, max HISTORY_MAX).
      // Si el status no cambio (re-scan en mismo modo) no agregamos entry
      // porque el undo no tendria sentido.
      if (previousStatus !== targetStatus) {
        setHistory(prev => [
          {
            id: `${fresh.id}-${Date.now()}`,
            orderNumber: fresh.orderNumber,
            clientName: fresh.clientName,
            itemSummary: (fresh.items ?? []).map(i => i.garmentName).join(', ') || 'pedido',
            garmentId: fresh.id,
            appliedStatus: targetStatus,
            previousStatus,
            timestamp: Date.now(),
          },
          ...prev.slice(0, HISTORY_MAX - 1),
        ]);
      }

      beep(true);
      showAlert({
        garment: fresh,
        appliedStatus: targetStatus,
        remaining: targetStatus === 'entregado' ? Math.max(0, remaining) : 0,
        alreadyEntregado,
        messageMode: updated.messageMode,
      });
    } catch {
      beep(false);
      toast.error('Error al actualizar el estado');
      cooldownRef.current = false;
    } finally {
      processingRef.current = false;
    }
  }, [toast, showAlert]);

  // Undo: revierte el status del garment al previousStatus guardado.
  // Solo permitido dentro de UNDO_WINDOW_MS (60s) de hacer el scan.
  const undoEntry = useCallback(async (entry: HistoryEntry) => {
    if (Date.now() - entry.timestamp > UNDO_WINDOW_MS) {
      toast.error('Pasaron mas de 60s, ya no se puede deshacer desde aca');
      return;
    }
    try {
      await updateGarmentStatus(entry.garmentId, entry.previousStatus);
      // Sync el cache local
      garmentsRef.current = garmentsRef.current.map(g =>
        g.id === entry.garmentId ? { ...g, status: entry.previousStatus } : g
      );
      setHistory(prev => prev.filter(e => e.id !== entry.id));
      toast.success(`ORD-${String(entry.orderNumber).padStart(6, '0')} revertido`);
    } catch {
      toast.error('Error al deshacer');
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
      if (code?.data) handleScan(code.data);
      animRef.current = requestAnimationFrame(scan);
    };
    animRef.current = requestAnimationFrame(scan);
  }, [handleScan]);

  const startCamera = useCallback(async (facing: 'environment' | 'user' = 'environment') => {
    setError('');
    if (videoRef.current?.srcObject) {
      (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
      videoRef.current.srcObject = null;
    }
    cancelAnimationFrame(animRef.current);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: facing }, width: { ideal: 1280 }, height: { ideal: 720 } },
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
      setScanning(false);
    }
  }, [startScanLoop]);

  const flipCamera = useCallback(() => {
    const next = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(next);
    startCamera(next);
  }, [facingMode, startCamera]);

  const stopCamera = useCallback(() => {
    if (videoRef.current?.srcObject) {
      (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
      videoRef.current.srcObject = null;
    }
    cancelAnimationFrame(animRef.current);
    setScanning(false);
  }, []);

  useEffect(() => () => { stopCamera(); }, [stopCamera]);

  const ordFmt = (n: number) => `ORD-${String(n).padStart(6, '0')}`;
  const priceFmt = (n: number) => `$${n.toLocaleString('es-AR')}`;

  return (
    <div className="h-full flex flex-col lg:flex-row gap-3 lg:gap-4">

      {/* Blocking scan alert overlay */}
      {alert && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={dismissAlert}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-card shadow-2xl overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* Colored header band */}
            <div className={cn(
              'px-5 py-4 flex items-center justify-between',
              alert.unchanged ? 'bg-amber-500' :
              alert.appliedStatus === 'entregado' ? 'bg-green-500' :
              alert.appliedStatus === 'listo' ? 'bg-yellow-500' : 'bg-blue-500'
            )}>
              <div className="flex items-center gap-3">
                {alert.appliedStatus === 'entregado'
                  ? <CheckCheck className="w-7 h-7 text-white" />
                  : alert.appliedStatus === 'listo'
                  ? <Truck className="w-7 h-7 text-white" />
                  : <Package className="w-7 h-7 text-white" />
                }
                <div>
                  <p className="text-white font-bold text-lg leading-tight">
                    {alert.unchanged
                      ? `Ya estaba en ${MODE_CONFIG[alert.appliedStatus].label}`
                      : MODE_CONFIG[alert.appliedStatus].label}
                  </p>
                  {alert.unchanged && (
                    <p className="text-white/90 text-xs">Sin cambios — no se procesó nada</p>
                  )}
                  {!alert.unchanged && alert.alreadyEntregado && (
                    <p className="text-white/80 text-xs">Pago registrado</p>
                  )}
                </div>
              </div>
              <button onClick={dismissAlert} className="text-white/80 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="px-5 py-4 space-y-3">
              <div>
                <p className="text-2xl font-extrabold text-foreground tracking-tight">
                  {ordFmt(alert.garment.orderNumber)}
                </p>
                <p className="text-lg font-semibold text-foreground">
                  {alert.garment.clientName}
                </p>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {(alert.garment.items ?? []).map(i => i.garmentName).join(', ')}
                </p>
              </div>

              {!alert.unchanged && alert.appliedStatus === 'listo' && (() => {
                const itemNames = (alert.garment.items ?? []).map(i => i.garmentName);
                const msg = BUSINESS.whatsappReadyMsg(alert.garment.clientName, itemNames, { mode: alert.messageMode ?? 'long' });
                const linkProps = whatsappLinkProps(alert.garment.clientPhone, msg);
                const waIcon = (
                  <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.554 4.117 1.526 5.845L0 24l6.335-1.509A11.956 11.956 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.817 9.817 0 01-5.007-1.368l-.36-.214-3.726.888.926-3.617-.235-.372A9.818 9.818 0 012.182 12C2.182 6.57 6.57 2.182 12 2.182c5.43 0 9.818 4.388 9.818 9.818 0 5.43-4.388 9.818-9.818 9.818z"/></svg>
                );
                return linkProps.href ? (
                  <a
                    href={linkProps.href}
                    onClick={(e) => { e.stopPropagation(); linkProps.onClick?.(); }}
                    className="flex items-center justify-center gap-2 w-full rounded-xl bg-[#25D366] hover:bg-[#1ebe5a] text-white font-semibold py-2.5 text-sm transition-colors"
                  >
                    {waIcon}
                    Avisar por WhatsApp
                  </a>
                ) : (
                  <button
                    type="button"
                    disabled
                    title="Teléfono inválido"
                    onClick={e => e.stopPropagation()}
                    className="flex items-center justify-center gap-2 w-full rounded-xl bg-[#25D366] text-white font-semibold py-2.5 text-sm opacity-50 cursor-not-allowed"
                  >
                    {waIcon}
                    Avisar por WhatsApp
                  </button>
                );
              })()}

              {!alert.unchanged && alert.appliedStatus === 'entregado' && (
                <div className="rounded-xl bg-muted p-3 space-y-1.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total</span>
                    <span className="font-medium">{priceFmt((alert.garment.items ?? []).reduce((s, i) => s + i.price, 0))}</span>
                  </div>
                  {(alert.garment.deposit ?? 0) > 0 && (
                    <div className="flex justify-between text-green-600 dark:text-green-400">
                      <span>Seña abonada</span>
                      <span>− {priceFmt(alert.garment.deposit ?? 0)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-base pt-1 border-t border-border">
                    {alert.remaining > 0 ? (
                      <>
                        <span className="text-green-600 dark:text-green-400">Cobrado</span>
                        <span className="text-green-600 dark:text-green-400">✓ {priceFmt(alert.remaining)}</span>
                      </>
                    ) : (
                      <>
                        <span className="text-green-600 dark:text-green-400">Cobrado</span>
                        <span className="text-green-600 dark:text-green-400">✓ Ya pagado con seña</span>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Auto-dismiss bar */}
            <div className="h-1 bg-muted overflow-hidden">
              <div
                className={cn(
                  'h-full animate-[shrink_4s_linear_forwards]',
                  alert.unchanged ? 'bg-amber-500' :
                  alert.appliedStatus === 'entregado' ? 'bg-green-500' :
                  alert.appliedStatus === 'listo' ? 'bg-yellow-500' : 'bg-blue-500'
                )}
              />
            </div>
          </div>
        </div>
      )}

      {/* Side panel: header + mode selector (mobile: top, desktop: right) */}
      <div className="flex flex-col gap-3 shrink-0 lg:w-72 xl:w-80 lg:order-2 lg:overflow-y-auto">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-primary/10">
            <QrCode className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Escáner QR</h1>
            <p className="text-xs text-muted-foreground">Leé el cupón y cambiá el estado</p>
          </div>
        </div>

        {/* Mode selector: chips en mobile, stack vertical en desktop */}
        <div className="grid grid-cols-3 lg:grid-cols-1 gap-2">
          {(Object.entries(MODE_CONFIG) as [ScanMode, typeof MODE_CONFIG[ScanMode]][]).map(([key, cfg]) => {
            const Icon = cfg.icon;
            const isActive = mode === key;
            return (
              <button
                key={key}
                onClick={() => setMode(key)}
                className={cn(
                  'flex flex-col lg:flex-row items-center gap-1.5 lg:gap-3 px-2 lg:px-4 py-3 rounded-xl border-2 text-xs lg:text-sm font-semibold transition-all duration-150',
                  isActive ? cfg.active : `border-border bg-card ${cfg.color} hover:border-current`
                )}
              >
                <Icon className="w-5 h-5 shrink-0" />
                <span className="text-center lg:text-left leading-tight">{cfg.label}</span>
              </button>
            );
          })}
        </div>

        {error && (
          <div className="rounded-xl bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* Pendientes de avisar por WhatsApp.
            Se llenan automaticamente cuando una prenda pasa a 'listo' en esta sesion.
            Ana clickea "Avisar" para enviar el mensaje y la prenda sale del panel. */}
        {pendingNotifications.length > 0 && (
          <div className="flex flex-col gap-2">
            <h3 className="text-[11px] font-semibold uppercase tracking-wide text-[#25D366]">
              📤 Avisar por WhatsApp ({pendingNotifications.length})
            </h3>
            <div className="flex flex-col gap-1.5">
              {pendingNotifications.map(notif => {
                const msg = BUSINESS.whatsappReadyMsg(notif.clientName, notif.itemNames, { mode: notif.messageMode });
                const linkProps = whatsappLinkProps(notif.clientPhone, msg);
                const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
                  e.stopPropagation();
                  linkProps.onClick?.();
                  setPendingNotifications(prev => prev.filter(p => p.id !== notif.id));
                };
                return (
                  <div
                    key={notif.id}
                    data-testid="pending-notification"
                    className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[#25D366]/40 bg-[#25D366]/5 text-xs"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-foreground truncate">
                        ORD-{String(notif.orderNumber).padStart(6, '0')} · {notif.clientName}
                      </div>
                      <div className="text-muted-foreground truncate">
                        {notif.itemNames.join(', ')}
                      </div>
                    </div>
                    {linkProps.href ? (
                      <a
                        href={linkProps.href}
                        onClick={handleClick}
                        className="shrink-0 px-3 py-1.5 rounded-md bg-[#25D366] hover:bg-[#1ebe5a] text-white text-[11px] font-semibold transition-colors"
                      >
                        Avisar
                      </a>
                    ) : (
                      <button
                        type="button"
                        disabled
                        onClick={() => setPendingNotifications(prev => prev.filter(p => p.id !== notif.id))}
                        title="Teléfono inválido — quitar"
                        className="shrink-0 px-3 py-1.5 rounded-md bg-muted text-muted-foreground text-[11px] font-semibold"
                      >
                        Sin tel.
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Historial de escaneos de la sesion (Z30). Vacio = no se muestra. */}
        {history.length > 0 && (
          <div className="flex flex-col gap-2 min-h-0 lg:flex-1 lg:overflow-y-auto">
            <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
              Historial de escaneos
            </h3>
            <div className="flex flex-col gap-1.5">
              {history.map(entry => {
                const age = now - entry.timestamp;
                const canUndo = age < UNDO_WINDOW_MS;
                const remainingSec = Math.max(0, Math.ceil((UNDO_WINDOW_MS - age) / 1000));
                const cfg = MODE_CONFIG[entry.appliedStatus];
                const Icon = cfg.icon;
                return (
                  <div
                    key={entry.id}
                    className={cn(
                      'flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-card text-xs',
                      !canUndo && 'opacity-60'
                    )}
                  >
                    <Icon className={cn('w-3.5 h-3.5 shrink-0', cfg.color.split(' ').find(c => c.startsWith('text-')))} />
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-foreground truncate">
                        ORD-{String(entry.orderNumber).padStart(6, '0')} · {entry.clientName}
                      </div>
                      <div className="text-muted-foreground truncate">
                        {cfg.label} · {entry.itemSummary}
                      </div>
                    </div>
                    {canUndo ? (
                      <button
                        onClick={() => undoEntry(entry)}
                        className="shrink-0 flex items-center gap-1 px-2 py-1 rounded-md border border-border bg-background hover:bg-muted text-foreground text-[11px] font-semibold transition-colors"
                        title={`Quedan ${remainingSec}s para deshacer`}
                      >
                        <Undo2 className="w-3 h-3" />
                        {remainingSec}s
                      </button>
                    ) : (
                      <span className="shrink-0 text-[10px] text-muted-foreground" title="Ventana de undo expirada">expirado</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Camera column (mobile: bottom flex-1, desktop: left flex-1) */}
      <div className="flex-1 flex flex-col min-h-0 lg:order-1">
        <div className="flex-1 relative rounded-2xl overflow-hidden bg-black border border-border shadow-lg min-h-[260px]">
          <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover" playsInline muted />

          {scanning && (
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute inset-[15%]">
                <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-primary rounded-tl-sm" />
                <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-primary rounded-tr-sm" />
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-primary rounded-bl-sm" />
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-primary rounded-br-sm" />
                <div
                  className="absolute left-0 right-0 h-0.5 transition-none"
                  style={{
                    top: `${scanLine}%`,
                    background: 'linear-gradient(90deg, transparent, hsl(var(--primary)), transparent)',
                    boxShadow: '0 0 8px 2px hsl(var(--primary) / 0.6)',
                  }}
                />
              </div>
              <div className="absolute inset-0 bg-black/30" />
            </div>
          )}

          {!scanning && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-muted/80">
              <Camera className="w-12 h-12 text-muted-foreground" />
              <p className="text-sm text-muted-foreground font-medium">Cámara inactiva</p>
            </div>
          )}

          {scanning && (
            <button
              onClick={flipCamera}
              className="absolute bottom-3 right-3 z-20 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
              title={facingMode === 'environment' ? 'Cámara frontal' : 'Cámara trasera'}
            >
              <FlipHorizontal2 className="w-5 h-5" />
            </button>
          )}
        </div>

        <canvas ref={canvasRef} className="hidden" />
      </div>
    </div>
  );
}
