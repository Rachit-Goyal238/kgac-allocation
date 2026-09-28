import React from 'react';
import { useNotifications } from '@/hooks/useNotifications';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Bell, Check } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export function NotificationAlerts() {
  const { notifications, unreadCount, markAsRead } = useNotifications();

  if (unreadCount === 0) return null;

  return (
    <div className="space-y-4 mb-6">
      <h3 className="text-lg font-semibold flex items-center text-red-600">
        <Bell className="h-5 w-5 mr-2" />
        You have {unreadCount} new notification{unreadCount > 1 ? 's' : ''}
      </h3>
      <div className="grid gap-3">
        {notifications.filter(n => !n.is_read).map(notification => (
          <Alert key={notification.id} className="border-red-200 bg-red-50 flex flex-col sm:flex-row justify-between sm:items-center p-4">
            <div>
              <AlertTitle className="text-red-800 font-bold mb-1">{notification.title}</AlertTitle>
              <AlertDescription className="text-red-700">
                {notification.message}
                <div className="text-xs mt-1 opacity-70">
                  {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                </div>
              </AlertDescription>
            </div>
            <Button 
              size="sm" 
              variant="outline" 
              className="mt-3 sm:mt-0 whitespace-nowrap bg-white hover:bg-red-100 border-red-200 text-red-700"
              onClick={() => markAsRead.mutate(notification.id)}
            >
              <Check className="h-4 w-4 mr-2" />
              Mark as Acknowledged
            </Button>
          </Alert>
        ))}
      </div>
    </div>
  );
}
