import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Lock, AlertCircle, Eye, EyeOff, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [isReady, setIsReady] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Check if we are using the custom Resend token
  const searchParams = new URLSearchParams(window.location.search);
  const resetToken = searchParams.get('token');

  useEffect(() => {
    let isMounted = true;

    async function initSession() {
      // Method A: Custom Resend Token Flow (Primary)
      if (resetToken) {
        try {
          const { data, error } = await supabase.rpc('verify_reset_token', {
            p_token: resetToken.trim()
          });

          if (error) throw error;

          if (isMounted) {
            if (data && data.valid) {
              setUserName(data.full_name || null);
              setIsReady(true);
            } else {
              setErrorMsg(data?.error || 'Invalid or expired password reset link.');
            }
            setLoading(false);
          }
          return;
        } catch (err: any) {
          if (isMounted) {
            setErrorMsg(err.message || 'Failed to verify reset token.');
            setLoading(false);
          }
          return;
        }
      }

      // Method B: Fallback Supabase Hash / PKCE Flow
      const hash = window.location.hash;
      if (hash && hash.includes('error=')) {
        const params = new URLSearchParams(hash.substring(1));
        const desc = params.get('error_description') || params.get('error') || 'Reset link is invalid or has expired.';
        if (isMounted) {
          setErrorMsg(desc.replace(/\+/g, ' '));
          setLoading(false);
        }
        return;
      }

      const code = searchParams.get('code');
      if (code) {
        try {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
          if (isMounted) {
            setIsReady(true);
            setLoading(false);
          }
          return;
        } catch (err: any) {
          if (isMounted) {
            setErrorMsg(err.message || 'Failed to verify reset code');
            setLoading(false);
          }
          return;
        }
      }

      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (!isMounted) return;
        if (event === 'PASSWORD_RECOVERY' || (session && event === 'SIGNED_IN')) {
          setIsReady(true);
          setLoading(false);
        }
      });

      setTimeout(async () => {
        if (!isMounted) return;
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          setIsReady(true);
          setLoading(false);
        } else {
          setTimeout(async () => {
            if (!isMounted) return;
            const { data: { session: retrySession } } = await supabase.auth.getSession();
            if (retrySession) {
              setIsReady(true);
            } else {
              setErrorMsg('No active password reset session found. Please request a new link.');
            }
            setLoading(false);
          }, 2000);
        }
      }, 500);

      return () => {
        subscription.unsubscribe();
      };
    }

    initSession();

    return () => {
      isMounted = false;
    };
  }, [resetToken]);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!password || password.length < 6) {
      toast.error('Password must be at least 6 characters long');
      return;
    }

    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setIsSubmitting(true);
    try {
      if (resetToken) {
        // Complete via custom Resend token RPC
        const { data, error } = await supabase.rpc('complete_password_reset', {
          p_token: resetToken.trim(),
          p_new_password: password
        });

        if (error) throw error;
        if (data && !data.success) throw new Error(data.error);

        toast.success('Password updated successfully! Please log in with your new password.');
        navigate('/login', { replace: true });
      } else {
        // Complete via Supabase Auth session
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw error;

        toast.success('Password updated successfully! Please log in with your new password.');
        await supabase.auth.signOut();
        navigate('/login', { replace: true });
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to update password');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
          <p className="text-sm font-medium text-slate-600">Verifying your reset link...</p>
        </div>
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl text-center border border-slate-100">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-red-600 mb-4">
            <AlertCircle className="h-7 w-7" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Reset Link Expired or Invalid</h2>
          <p className="text-sm text-slate-500 mb-6">{errorMsg}</p>
          <Button
            className="w-full bg-blue-600 hover:bg-blue-700"
            onClick={() => navigate('/login?view=forgot', { replace: true })}
          >
            Request New Reset Link
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl border border-slate-100">
        <div className="mb-6 text-center flex flex-col items-center">
          <img src="/logo.png" alt="KGAC Logo" className="h-20 w-auto object-contain mb-3" />
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Set New Password
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {userName ? `Account for ${userName}` : 'Please enter your new secure password below.'}
          </p>
        </div>

        <form onSubmit={handleResetPassword} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="new-password">New Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                id="new-password"
                type={showPassword ? 'text' : 'password'}
                placeholder="At least 6 characters"
                className="pl-9 pr-10"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
              <button
                type="button"
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm-password">Confirm New Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                id="confirm-password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Re-enter your password"
                className="pl-9 pr-10"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
          </div>

          <Button type="submit" className="w-full mt-4 bg-blue-600 hover:bg-blue-700" disabled={isSubmitting}>
            {isSubmitting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              'Save New Password'
            )}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <button
            type="button"
            className="text-sm text-slate-500 hover:text-slate-800"
            onClick={() => navigate('/login', { replace: true })}
          >
            Cancel and Return to Sign In
          </button>
        </div>
      </div>
    </div>
  );
}
