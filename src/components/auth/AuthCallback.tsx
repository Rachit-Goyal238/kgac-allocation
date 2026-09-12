import React, { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export function AuthCallback() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session }, error: sessionError }) => {
      if (sessionError) {
        setError(sessionError.message);
        toast.error('Authentication failed');
      } else if (session) {
        navigate('/', { replace: true });
      } else {
        setError('No session found');
      }
    });
  }, [navigate]);

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4">
        <div className="rounded-xl bg-white p-8 text-center shadow-lg">
          <h2 className="mb-4 text-xl font-semibold text-red-600">Authentication Error</h2>
          <p className="mb-6 text-gray-600">{error}</p>
          <button
            onClick={() => navigate('/login', { replace: true })}
            className="text-blue-600 hover:underline"
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50">
      <Loader2 className="mb-4 h-10 w-10 animate-spin text-blue-600" />
      <p className="text-lg font-medium text-gray-600">Signing you in...</p>
    </div>
  );
}
