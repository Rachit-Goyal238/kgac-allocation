import React, { useState } from 'react';
import { useAuthContext } from '@/contexts/AuthContext';
import { useUpdateProfile } from '@/hooks/useProfiles';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

export function ProfileSettings() {
  const { profile } = useAuthContext();
  const updateProfile = useUpdateProfile();
  
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || '');

  // Password state
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const handleSave = () => {
    if (!profile) return;
    
    updateProfile.mutate(
      { id: profile.id, full_name: fullName, avatar_url: avatarUrl },
      {
        onSuccess: () => {
          // Toast is handled by mutation
        }
      }
    );
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setIsChangingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;
      
      toast.success('Password updated successfully');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      toast.error(err.message || 'Failed to update password');
    } finally {
      setIsChangingPassword(false);
    }
  };

  if (!profile) return null;

  return (
    <div className="space-y-8 max-w-2xl">
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h3 className="text-lg font-medium mb-6">Profile Settings</h3>
        
        <div className="space-y-6">
          <div className="space-y-4">
            <Label>Profile Picture</Label>
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-6">
                <Avatar className="h-24 w-24 border-4 border-slate-100">
                  <AvatarImage src={avatarUrl} alt={fullName} />
                  <AvatarFallback className="text-3xl">{fullName.charAt(0).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="space-y-1">
                  <p className="text-sm font-medium">Choose an avatar</p>
                  <p className="text-xs text-muted-foreground mb-3">Select one of the default options below.</p>
                  <div className="flex flex-wrap gap-2">
                    {['lorelei', 'adventurer', 'bottts', 'fun-emoji', 'micah'].map((style) => (
                      <button
                        key={style}
                        type="button"
                        onClick={() => setAvatarUrl(`https://api.dicebear.com/7.x/${style}/svg?seed=${profile.id}`)}
                        className="rounded-full hover:ring-2 ring-primary ring-offset-2 transition-all"
                      >
                        <img 
                          src={`https://api.dicebear.com/7.x/${style}/svg?seed=${profile.id}`} 
                          alt={style}
                          className="h-10 w-10 rounded-full border bg-slate-50"
                        />
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setAvatarUrl('')}
                      className="flex h-10 w-10 items-center justify-center rounded-full border bg-slate-100 text-xs font-medium text-slate-500 hover:ring-2 ring-primary ring-offset-2 transition-all"
                    >
                      Clear
                    </button>
                  </div>
                </div>
              </div>
              
              <div className="space-y-2 mt-2">
                <Label className="text-xs text-muted-foreground">Or provide a custom image URL:</Label>
                <Input 
                  value={avatarUrl} 
                  onChange={(e) => setAvatarUrl(e.target.value)} 
                  placeholder="https://example.com/my-photo.jpg" 
                  className="w-full sm:w-96 text-sm"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Display Name</Label>
            <Input 
              value={fullName} 
              onChange={(e) => setFullName(e.target.value)} 
              placeholder="Your full name" 
              className="w-full sm:w-96"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Username</Label>
              <Input 
                value={profile.username || '-'} 
                disabled 
                className="bg-slate-50 font-mono text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label>Employee ID</Label>
              <Input 
                value={profile.employee_id || '-'} 
                disabled 
                className="bg-slate-50"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Personal Email (For Recovery)</Label>
            <Input 
              value={profile.personal_email || '-'} 
              disabled 
              className="w-full sm:w-96 bg-slate-50"
            />
          </div>

          <div className="pt-4 border-t">
            <Button onClick={handleSave} disabled={updateProfile.isPending || !fullName.trim()}>
              {updateProfile.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Profile Changes
            </Button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h3 className="text-lg font-medium mb-2">Security</h3>
        <p className="text-sm text-slate-500 mb-6">Update your password to keep your account secure.</p>

        <form onSubmit={handlePasswordChange} className="space-y-4 max-w-sm">
          <div className="space-y-2">
            <Label htmlFor="new-password">New Password</Label>
            <Input 
              id="new-password"
              type="password" 
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm-password">Confirm New Password</Label>
            <Input 
              id="confirm-password"
              type="password" 
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>
          <div className="pt-2">
            <Button type="submit" variant="outline" disabled={isChangingPassword || !newPassword}>
              {isChangingPassword && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Update Password
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
