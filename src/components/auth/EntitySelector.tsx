import React, { useState } from 'react';
import { useAuthContext } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { UserEntity } from '@/lib/types';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

export function EntitySelector() {
  const { profile } = useAuthContext();
  const [selectedEntity, setSelectedEntity] = useState<UserEntity | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!profile || !selectedEntity) return;
    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ entity: selectedEntity, entity_selected: true })
        .eq('id', profile.id);
      
      if (error) throw error;
      
      toast.success('Organization selected successfully. Please refresh the page.');
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (error: any) {
      toast.error(error.message || 'Failed to update organization');
      setIsSubmitting(false);
    }
  };

  if (profile?.entity_selected) return null;

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md space-y-6 rounded-2xl bg-white p-8 shadow-xl">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Select Organization</h1>
          <p className="text-sm text-gray-500">
            Because you signed in with a personal email or phone number, please select which organization you belong to.
          </p>
        </div>

        <div className="grid gap-4">
          <div
            onClick={() => setSelectedEntity('KGAC')}
            className={`flex cursor-pointer flex-col items-center justify-between rounded-md border-2 p-4 hover:bg-accent ${selectedEntity === 'KGAC' ? 'border-primary' : 'border-muted bg-popover'}`}
          >
            <span className="text-xl font-bold">KGAC</span>
          </div>
          
          <div
            onClick={() => setSelectedEntity('KPL')}
            className={`flex cursor-pointer flex-col items-center justify-between rounded-md border-2 p-4 hover:bg-accent ${selectedEntity === 'KPL' ? 'border-primary' : 'border-muted bg-popover'}`}
          >
            <span className="text-xl font-bold">KPL</span>
          </div>
        </div>

        <Button
          className="w-full"
          onClick={handleSubmit}
          disabled={!selectedEntity || isSubmitting}
        >
          {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Continue
        </Button>
      </div>
    </div>
  );
}
