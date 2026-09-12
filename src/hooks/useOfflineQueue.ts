import { useState, useEffect, useCallback } from 'react';
import { OfflineAction } from '@/lib/types';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

export function useOfflineQueue() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [queuedActions, setQueuedActions] = useState<OfflineAction[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('offlineQueue');
    if (saved) {
      try {
        setQueuedActions(JSON.parse(saved));
      } catch (e) {
        setQueuedActions([]);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('offlineQueue', JSON.stringify(queuedActions));
  }, [queuedActions]);

  const queueAction = useCallback((action: Omit<OfflineAction, 'id' | 'timestamp' | 'retryCount'>) => {
    const fullAction: OfflineAction = {
      ...action,
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      retryCount: 0
    };
    setQueuedActions(prev => [...prev, fullAction]);
  }, []);

  const syncQueue = useCallback(async () => {
    if (queuedActions.length === 0 || !isOnline || isSyncing) return;
    
    setIsSyncing(true);
    let currentQueue = [...queuedActions];
    
    for (const action of queuedActions) {
      try {
        if (action.type === 'upsert' || action.type === 'upsert_allocation') {
          const { error } = await supabase.from(action.table || 'allocations').upsert(action.payload);
          if (error) throw error;
        } else if (action.type === 'delete' || action.type === 'delete_allocation') {
          const { error } = await supabase.from(action.table || 'allocations').delete().eq('id', action.payload.id);
          if (error) throw error;
        }
        
        currentQueue = currentQueue.filter(a => a.id !== action.id);
      } catch (error) {
        const index = currentQueue.findIndex(a => a.id === action.id);
        if (index >= 0) {
          currentQueue[index].retryCount += 1;
          if (currentQueue[index].retryCount > 3) {
            currentQueue = currentQueue.filter(a => a.id !== action.id);
            toast.error('Failed to sync action permanently');
          }
        }
      }
    }
    
    setQueuedActions(currentQueue);
    setIsSyncing(false);
    if (queuedActions.length > 0 && currentQueue.length === 0) {
      toast.success('All changes synced');
    }
  }, [queuedActions, isOnline, isSyncing]);

  useEffect(() => {
    const handleOnline = () => { setIsOnline(true); syncQueue(); };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [syncQueue]);

  return { isOnline, queuedActions, queueAction, syncQueue, isSyncing };
}
