import React from 'react';
import { ProfileSettings } from '@/components/profile/ProfileSettings';

export function ProfilePage() {
  return (
    <div className="flex flex-col h-full bg-slate-50/30 p-6 overflow-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">Your Profile</h2>
        <p className="text-sm text-slate-500 mt-1">Manage your personal settings and preferences.</p>
      </div>
      <ProfileSettings />
    </div>
  );
}
