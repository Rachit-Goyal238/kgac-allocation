import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuthContext } from '@/contexts/AuthContext';
import { ROLE_LABELS } from '@/lib/constants';
import { Menu, LogOut, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Sidebar } from './Sidebar';

export function Header() {
  const location = useLocation();
  const { profile, signOut } = useAuthContext();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const getPageTitle = () => {
    const path = location.pathname;
    if (path.startsWith('/calendar')) return 'Allocation Calendar';
    if (path.startsWith('/dashboard')) return 'Dashboard';
    if (path.startsWith('/admin')) return 'Administration';
    return 'App';
  };

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-200/50 bg-white/70 px-4 backdrop-blur-md shadow-[0_2px_20px_-4px_rgba(0,0,0,0.05)] md:px-6">
      <div className="flex items-center">
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="mr-2 md:hidden">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Toggle menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0">
            <Sidebar onClose={() => setMobileOpen(false)} />
          </SheetContent>
        </Sheet>
        
        <h1 className="text-xl font-semibold text-gray-900">{getPageTitle()}</h1>
      </div>

      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2">
          <span className="relative flex h-3 w-3">
            {isOnline && (
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75"></span>
            )}
            <span
              className={`relative inline-flex h-3 w-3 rounded-full ${
                isOnline ? 'bg-green-500' : 'bg-red-500'
              }`}
            ></span>
          </span>
          <span className="text-sm text-gray-500 hidden sm:inline-block">
            {isOnline ? 'Online' : 'Offline'}
          </span>
        </div>

      </div>
    </header>
  );
}
