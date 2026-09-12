import React, { useEffect, useState } from 'react';
import { useOfflineQueue } from '@/hooks/useOfflineQueue';
import { WifiOff, Loader2, CheckCircle2 } from 'lucide-react';

export function OfflineIndicator() {
  const { isOnline, queuedActions, isSyncing } = useOfflineQueue();
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    if (isOnline && !isSyncing && queuedActions.length === 0 && !showSuccess) {
      // Just came online and finished syncing
      setShowSuccess(true);
      const timer = setTimeout(() => setShowSuccess(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [isOnline, isSyncing, queuedActions.length]);

  if (isOnline && !isSyncing && !showSuccess) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 flex justify-center pb-4 pointer-events-none">
      <div className={`
        pointer-events-auto px-4 py-2 rounded-full shadow-lg flex items-center gap-2 text-sm font-medium transition-all duration-300
        ${!isOnline ? 'bg-amber-100 text-amber-800 border border-amber-200' : ''}
        ${isSyncing ? 'bg-blue-100 text-blue-800 border border-blue-200' : ''}
        ${showSuccess ? 'bg-green-100 text-green-800 border border-green-200' : ''}
      `}>
        {!isOnline && (
          <>
            <WifiOff className="h-4 w-4" />
            Offline — {queuedActions.length} changes queued
          </>
        )}
        {isOnline && isSyncing && (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Syncing {queuedActions.length} changes...
          </>
        )}
        {isOnline && !isSyncing && showSuccess && (
          <>
            <CheckCircle2 className="h-4 w-4" />
            All changes synced
          </>
        )}
      </div>
    </div>
  );
}
