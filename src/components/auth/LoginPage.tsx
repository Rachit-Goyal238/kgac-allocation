import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuthContext } from '@/contexts/AuthContext';
import { Loader2, Phone, Mail } from 'lucide-react';

export function LoginPage() {
  const { user, isLoading, signInWithGoogle, signInWithPhone, signInWithEmail, verifyOtp, verifyEmailOtp } = useAuthContext();
  
  const [loginMethod, setLoginMethod] = useState<'google' | 'phone' | 'email'>('google');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'phone' | 'email' | 'otp'>('phone');
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

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loginMethod === 'phone' && !phone) return;
    if (loginMethod === 'email' && !email) return;
    
    setIsSubmitting(true);
    try {
      if (loginMethod === 'phone') {
        await signInWithPhone(phone);
      } else {
        await signInWithEmail(email);
      }
      setStep('otp');
    } catch (error) {
      // handled in hook
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp) return;
    setIsSubmitting(true);
    try {
      if (loginMethod === 'phone') {
        await verifyOtp(phone, otp);
      } else {
        await verifyEmailOtp(email, otp);
      }
    } catch (error) {
      // handled in hook
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl">
        <div className="mb-8 text-center">
          <h1 className="mb-2 text-3xl font-bold tracking-tight text-gray-900">
            KGAC Audit Allocation
          </h1>
          <p className="text-sm text-gray-500">
            Sign in to access your audit schedule
          </p>
        </div>

        {loginMethod === 'google' ? (
          <div className="space-y-4">
            <Button
              onClick={signInWithGoogle}
              className="w-full py-6 text-lg font-medium"
              variant="outline"
            >
              <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                <path d="M1 1h22v22H1z" fill="none" />
              </svg>
              Sign in with Google
            </Button>
            
            <Button
              onClick={() => { setLoginMethod('email'); setStep('email'); }}
              className="w-full py-6 text-lg font-medium"
              variant="outline"
            >
              <Mail className="mr-2 h-4 w-4" />
              Sign in with Email OTP (Free)
            </Button>
            
            <Button
              onClick={() => { setLoginMethod('phone'); setStep('phone'); }}
              className="w-full py-6 text-lg font-medium text-gray-500"
              variant="ghost"
            >
              <Phone className="mr-2 h-4 w-4" />
              Sign in with Phone Number
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {step === 'phone' || step === 'email' ? (
              <form onSubmit={handleSendOtp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="contact">
                    {loginMethod === 'phone' ? 'Phone Number' : 'Email Address'}
                  </Label>
                  <Input
                    id="contact"
                    type={loginMethod === 'phone' ? 'tel' : 'email'}
                    placeholder={loginMethod === 'phone' ? '+919876543210' : 'name@company.com'}
                    value={loginMethod === 'phone' ? phone : email}
                    onChange={(e) => loginMethod === 'phone' ? setPhone(e.target.value) : setEmail(e.target.value)}
                    required
                  />
                  {loginMethod === 'phone' && (
                    <p className="text-xs text-muted-foreground">Include country code (e.g., +91)</p>
                  )}
                </div>
                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Send Code'}
                </Button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="otp">Verification Code</Label>
                  <Input
                    id="otp"
                    type="text"
                    placeholder="Enter 6-digit code"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Verify Code'}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full"
                  onClick={() => setStep(loginMethod)}
                >
                  Back
                </Button>
              </form>
            )}

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-muted-foreground">Or</span>
              </div>
            </div>

            <Button
              variant="ghost"
              className="w-full"
              onClick={() => setLoginMethod('google')}
            >
              Back to Google Sign In
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
