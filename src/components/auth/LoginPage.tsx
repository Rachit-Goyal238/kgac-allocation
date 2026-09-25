import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuthContext } from '@/contexts/AuthContext';
import { Loader2, Lock, User, Mail } from 'lucide-react';

export function LoginPage() {
  const { user, isLoading, signIn, claimAccount, resetPassword } = useAuthContext();
  
  const [view, setView] = useState<'login' | 'setup' | 'forgot'>('login');
  
  const [employeeId, setEmployeeId] = useState('');
  const [password, setPassword] = useState('');
  const [personalEmail, setPersonalEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
      </div>
    );
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeId) return;
    
    setIsSubmitting(true);
    try {
      if (view === 'setup') {
        if (!personalEmail || !password) return;
        await claimAccount(employeeId, personalEmail, password);
        setView('login');
        setPassword('');
      } else if (view === 'login') {
        if (!password) return;
        await signIn(employeeId, password);
      } else if (view === 'forgot') {
        await resetPassword(employeeId);
        setView('login');
      }
    } catch (error) {
      // Error handled in hook
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl">
        <div className="mb-8 text-center flex flex-col items-center">
          <img src="/logo.png" alt="KGAC Logo" className="h-24 w-auto object-contain mb-4" />
          <h1 className="mb-2 text-3xl font-bold tracking-tight text-gray-900">
            KGAC Audit Allocation
          </h1>
          <p className="text-sm text-gray-500">
            {view === 'setup' ? 'Claim your account' : view === 'forgot' ? 'Reset your password' : 'Sign in with your Employee ID'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="employeeId">Employee ID</Label>
            <div className="relative">
              <User className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                id="employeeId"
                type="text"
                placeholder="KGAC-105"
                className="pl-9 uppercase"
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value.toUpperCase())}
                required
              />
            </div>
          </div>

          {view === 'setup' && (
            <div className="space-y-2">
              <Label htmlFor="personalEmail">Personal Email (For Password Resets)</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  id="personalEmail"
                  type="email"
                  placeholder="name@gmail.com"
                  className="pl-9"
                  value={personalEmail}
                  onChange={(e) => setPersonalEmail(e.target.value)}
                  required
                />
              </div>
            </div>
          )}

          {(view === 'login' || view === 'setup') && (
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label htmlFor="password">{view === 'setup' ? 'Create Password' : 'Password'}</Label>
                {view === 'login' && (
                  <button type="button" onClick={() => setView('forgot')} className="text-xs text-blue-600 hover:underline">
                    Forgot Password?
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  className="pl-9"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>
            </div>
          )}

          <Button type="submit" className="w-full mt-6" disabled={isSubmitting}>
            {isSubmitting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : view === 'setup' ? (
              'Claim Account'
            ) : view === 'forgot' ? (
              'Send Reset Link'
            ) : (
              'Sign In'
            )}
          </Button>
        </form>

        <div className="mt-6 text-center text-sm space-y-2">
          {view === 'login' ? (
            <p className="text-slate-500">
              First time here?{' '}
              <button type="button" className="text-blue-600 hover:underline font-medium" onClick={() => { setView('setup'); setPassword(''); setPersonalEmail(''); }}>
                Claim your account
              </button>
            </p>
          ) : (
            <button type="button" className="text-blue-600 hover:underline font-medium" onClick={() => { setView('login'); setPassword(''); }}>
              Back to Sign In
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
