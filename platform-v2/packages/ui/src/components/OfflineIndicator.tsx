import * as React from 'react';
import { WifiOff } from 'lucide-react';
import { cn } from '../lib/utils.js';

interface OfflineIndicatorProps {
  className?: string;
}

export function OfflineIndicator({ className }: OfflineIndicatorProps) {
  const [isOffline, setIsOffline] = React.useState<boolean>(
    typeof navigator !== 'undefined' ? !navigator.onLine : false,
  );

  React.useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'fixed top-0 left-0 right-0 z-[200] flex items-center justify-center gap-2 bg-amber-500 text-white py-2 px-4 text-sm font-medium shadow-md',
        className,
      )}
    >
      <WifiOff className="h-4 w-4 shrink-0" aria-hidden />
      <span>Sin conexión — los cambios se guardarán localmente</span>
    </div>
  );
}
