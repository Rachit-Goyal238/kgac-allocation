import { useState, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { Profile } from '@/lib/types';
import { toast } from 'sonner';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.error('Error getting session:', error.message);
        setIsLoading(false);
        return;
      }
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setIsLoading(false);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        setIsLoading(true);
        fetchProfile(session.user.id);
      } else {
        setProfile(null);
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      if (error) throw error;
      setProfile(data as Profile);
    } catch (error: any) {
      console.error('Error fetching profile:', error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setUser(null);
      setProfile(null);
    } catch (error: any) {
      toast.error(error.message || 'Failed to sign out');
    }
  };

  const signIn = async (username: string, password: string) => {
    try {
      // 1. Fetch email mapped to username using RPC
      const { data: email, error: rpcError } = await supabase.rpc('get_email_by_username', {
        p_username: username.trim().toLowerCase()
      });
      if (rpcError) throw new Error(rpcError.message);
      if (!email) throw new Error('Username not found.');

      // 2. Sign in with standard password auth
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      
      setUser(data.session?.user ?? null);
      if (data.session?.user) {
        setIsLoading(true);
        await fetchProfile(data.session.user.id);
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to sign in');
      throw error;
    }
  };
  
  const resetPassword = async (username: string) => {
    try {
      // 1. Fetch real email using RPC
      const { data: email, error: rpcError } = await supabase.rpc('get_email_by_username', {
        p_username: username.trim().toLowerCase()
      });
      if (rpcError) throw new Error(rpcError.message);
      if (!email) throw new Error('Username not found.');

      // 2. Trigger standard password reset
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + '/auth/reset-password',
      });
      
      if (error) throw error;
      toast.success('Password reset link sent to your registered email!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to reset password');
      throw error;
    }
  };

  return { user, profile, isLoading, signOut, signIn, resetPassword };
}
