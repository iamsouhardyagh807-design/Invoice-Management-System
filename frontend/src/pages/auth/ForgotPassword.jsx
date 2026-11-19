import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, Lock, KeyRound, ArrowRight, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import { authService } from '../../services/authService';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';

export default function ForgotPassword() {
  const [step, setStep] = useState('request'); // 'request' | 'reset'
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleRequestToken = async (e) => {
    e.preventDefault();
    if (!email) {
      toast.error('Please enter your registered email address.');
      return;
    }

    setIsLoading(true);
    try {
      const data = await authService.forgotPassword(email);
      toast.success(data.message || 'Reset instructions sent.');
      if (data.resetToken) {
        setToken(data.resetToken);
        setStep('reset');
        toast('Testing token auto-loaded below!', { icon: '🔑' });
      } else {
        setStep('reset');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to request reset token.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!token || !newPassword) {
      toast.error('Token and new password are required.');
      return;
    }

    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters.');
      return;
    }

    setIsLoading(true);
    try {
      const data = await authService.resetPassword(token, newPassword);
      toast.success(data.message || 'Password reset successfully!');
      setTimeout(() => {
        window.location.href = '/login';
      }, 1000);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to reset password.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-indigo-50/30 to-slate-100 p-4 sm:p-6">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/50 p-8 sm:p-10">
          <div className="text-center mb-8">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-100 mb-4">
              <KeyRound className="h-6 w-6" />
            </div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900">
              {step === 'request' ? 'Reset Password' : 'Enter New Password'}
            </h1>
            <p className="text-xs text-slate-500 mt-1.5">
              {step === 'request'
                ? 'Enter your email address to receive password reset credentials'
                : 'Enter your verification token and your new chosen password'}
            </p>
          </div>

          {step === 'request' ? (
            <form onSubmit={handleRequestToken} className="space-y-4">
              <Input
                label="Registered Email Address"
                type="email"
                icon={Mail}
                required
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />

              <Button
                type="submit"
                className="w-full"
                size="lg"
                isLoading={isLoading}
                icon={ArrowRight}
              >
                Send Reset Token
              </Button>
            </form>
          ) : (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <Input
                label="Reset Verification Token"
                type="text"
                icon={KeyRound}
                required
                placeholder="Paste reset token here"
                value={token}
                onChange={(e) => setToken(e.target.value)}
              />

              <Input
                label="New Password"
                type="password"
                icon={Lock}
                required
                placeholder="At least 6 characters"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />

              <Button
                type="submit"
                className="w-full"
                size="lg"
                isLoading={isLoading}
                icon={ArrowRight}
              >
                Save New Password
              </Button>
            </form>
          )}

          <div className="mt-6 text-center">
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-700"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Sign In</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
