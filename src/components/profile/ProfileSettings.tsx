import React, { useState } from 'react';
import { useAuthContext } from '@/contexts/AuthContext';
import { useUpdateProfile } from '@/hooks/useProfiles';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export function ProfileSettings() {
  const { profile } = useAuthContext();
  const updateProfile = useUpdateProfile();
  
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || '');

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

  if (!profile) return null;

  return (
    <div className="max-w-2xl bg-white rounded-lg shadow-sm border p-6">
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

        <div className="space-y-2">
          <Label>Email Address</Label>
          <Input 
            value={profile.email} 
            disabled 
            className="w-full sm:w-96 bg-slate-50"
          />
          <p className="text-xs text-muted-foreground">Email addresses cannot be changed here.</p>
        </div>



        <div className="pt-4">
          <Button onClick={handleSave} disabled={updateProfile.isPending || !fullName.trim()}>
            {updateProfile.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </div>
      </div>
    </div>
  );
}
